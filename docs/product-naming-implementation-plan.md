# Catalog Assist — Product Name & Category Implementation Plan

**Status:** Planning  
**Last updated:** 2026-06-18  
**Scope:** Temporary-item promotion, manual product create/edit — **product name correctness** and **category alignment**  
**Repos:** NestJS backend (tenant API) + Next.js Management Hub (`nutapos-management-hub`)

This document is the canonical reference for **catalog-aware assist** when owners promote temporary items or add products manually. The system suggests a compliant **product name** and matching **category** based on similar products already in the organization’s catalog — without LLM, external barcode databases, or a product-variation data model.

> **Note:** The filename retains “product-naming-ai” for link stability. The feature is **deterministic catalog assist**, not generative AI.

---

## Table of contents

1. [Problem statement](#1-problem-statement)
2. [Design principles](#2-design-principles)
3. [Current system (as-is)](#3-current-system-as-is)
4. [Target architecture](#4-target-architecture)
5. [Universal naming standard](#5-universal-naming-standard)
6. [Category alignment](#6-category-alignment)
7. [Implementation phases](#7-implementation-phases)
8. [Backend vs frontend responsibility matrix](#8-backend-vs-frontend-responsibility-matrix)
9. [API contracts](#9-api-contracts)
10. [Frontend integration map](#10-frontend-integration-map)
11. [User stories (implementation guides)](#11-user-stories-implementation-guides)
12. [UI and UX patterns](#12-ui-and-ux-patterns)
13. [Similarity stack](#13-similarity-stack)
14. [Testing strategy](#14-testing-strategy)
15. [Rollout and metrics](#15-rollout-and-metrics)
16. [Out of scope (explicit)](#16-out-of-scope-explicit)
17. [Phase checklist summary](#17-phase-checklist-summary)
18. [Backend implementation (actual)](#18-backend-implementation-actual)

---

## 1. Problem statement

### What happens today

1. A cashier scans an unknown barcode on the **Staff mobile app** (or enters a sale without a catalog match).
2. They enter a quick **name** and **price** so the sale can complete.
3. The backend creates a **temporary placeholder product** and notifies the owner (`TEMPORARY_ITEM_SOLD`).
4. The owner opens **Temporary items** in the Management Hub and **promotes** the item to permanent inventory.

### The pain

- Cashier names are inconsistent: `vaseline aloe 500g`, `Vaseline 500g aloe`, `VASELINE ALOE`.
- Owners promote items without a naming standard, polluting search, reports, and staff training.
- Owners guess **categories** from long dropdowns (`Select category`) with no guidance.
- Similar products (e.g. *Vaseline Original Pomade 500g* vs *Vaseline Aloe Pomade 500g*) are separate SKUs but should **read like siblings** and sit in the **same category**.
- There is **no naming validation** in the Hub today beyond “name is required.”

### What success looks like

- Owners feel **guided, not lectured**.
- Bad names are **blocked with a clear reason** and a **one-click fix**.
- Categories are **suggested from the org’s own catalog patterns**, not guessed from barcodes or the internet.
- The catalog stays consistent **without** introducing a variation/parent-child product hierarchy.
- Rules are enforced **authoritatively on the server** for names; category assist is **advisory** (owner can override).

### Regional context (Ghana)

Barcodes on packaging are often missing, duplicated, or not linked to reliable product metadata. **Assist must not depend on external barcode lookup.** Similarity uses **draft name + org catalog only**. Barcodes remain stored on products for scanning; they do not drive suggestions.

---

## 2. Design principles

| Principle | Meaning |
|-----------|---------|
| **Deterministic only** | Rules + catalog similarity. No LLM, no external product APIs. |
| **Org catalog is truth** | Learn naming style and category from products the business already sells. |
| **Subliminal, not chatty** | No chatbot. Inline hints, one-click “Use suggestions.” |
| **Catalog-aware, not variation-aware** | Mirror patterns from similar products; do not add SKU variation layers. |
| **Backend is source of truth** | Name validation on NestJS for all saves. Hub mirrors rules for instant UX. |
| **Name enforced, category assisted** | Reject invalid names on save. Suggest category; do not block valid category IDs. |
| **Progressive delivery** | Phase 1 (rules); Phase 2 adds catalog assist (name + category). |
| **Platform-universal naming rules** | Same naming convention for all organizations in v1. |

---

## 3. Current system (as-is)

### End-to-end flow

```
Staff mobile (unknown barcode)
    → POST /staff/temporary-items (per sale line)
    → Backend placeholder Product (isTemporary / needsReview)
    → Notification TEMPORARY_ITEM_SOLD
    → Hub /inventory/temporary-items?highlightProductId=…
    → Promote dialog → POST /products/from-temporary/:productId
    → Permanent catalog product; mobile sync clears temporary flag
```

### Hub touchpoints (already built)

| Asset | Path / symbol |
|-------|----------------|
| Temporary items page | `app/(dashboard)/inventory/temporary-items/page.tsx` |
| Promote API client | `lib/api/products.ts` → `promoteFromTemporary()` |
| Temporary items hook | `lib/hooks/use-temporary-items.ts` |
| Notification deep link | `lib/navigation/notification-href.ts` → `TEMPORARY_ITEM_SOLD` |
| Manual product form | `components/products/product-form.tsx` |
| Categories API | `lib/api/categories.ts` → `fetchCategories()` |
| Product helpers | `lib/product-helpers.ts` (category label only today) |

### Gaps

- No product naming validator (client or server).
- No catalog-assist endpoint (name + category suggestions).
- Promote dialog resets category to empty on every open.
- No shared assist UI between promote dialog and product form.

---

## 4. Target architecture

Two layers only. **No LLM. No barcode lookup. No owner digest.**

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2 — Catalog assist (backend)                             │
│  Name-only similarity over org products                         │
│  Output: suggestedName, suggestedCategoryId, referenceProduct(s)│
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  Layer 1 — Deterministic naming rules (backend + Hub mirror)      │
│  Title Case, Brand + Product Name + Key Attributes, hygiene     │
│  Output: pass / fail + violation codes + suggestedName          │
└─────────────────────────────────────────────────────────────────┘
```

### Request lifecycle (promote flow)

1. Owner clicks **Promote to inventory** → Hub opens dialog with cashier draft name.
2. Hub calls **`GET /products/catalog-assist`** with `draftName` and `excludeProductId` (temp placeholder id).
3. Backend runs Layer 2 (similarity) → derives name + category from reference product(s) → validates suggested name with Layer 1.
4. Hub shows suggestion panel: name chip, category pre-select (when confident), similar-product link.
5. Hub runs **client mirror** of Layer 1 on name field while typing.
6. Owner submits → **`POST /products/from-temporary/:id`** → backend Layer 1 **must pass** on `name` or returns `400` with `suggestedName`.
7. `category_id` must be a valid org category (already required); semantic “wrong category” is not rejected.

The same Layer 1 validation applies to **`POST /products`** and **`PATCH /products/:id`** in Phase 3. Catalog assist applies to manual create in Phase 3 as well.

---

## 5. Universal naming standard

Platform-wide rules (v1). Document in UI helper text and validator error messages.

### Format

```
{Brand} {Product Name} {Key Attributes}
```

**Examples (valid)**

- `Vaseline Original Pomade 500g`
- `Vaseline Aloe Pomade 500g`
- `Coca-Cola Original 500ml`
- `Maggi Chicken Cubes 24 Pack`

**Examples (invalid → reject on save)**

| Draft | Violation |
|-------|-----------|
| `vaseline aloe 500g` | `TITLE_CASE` |
| `Vaseline 500g Aloe` | `ATTRIBUTE_ORDER` (size before variant) |
| `500g Vaseline Aloe` | `BRAND_POSITION` (brand must lead) |
| `Vaseline  Aloe   500g` | `WHITESPACE` |
| `` (empty) | `REQUIRED` |

### Title Case rules (v1)

- Capitalize the first letter of each **word**, except:
  - **Units** stay lowercase: `g`, `kg`, `ml`, `l`, `cl`, `oz`, `lb`.
  - **Known tokens** from a small allowlist (e.g. `iPhone`, `SPF`, `McDonald's`, `18V`) — backend config array.
- Reject ALL CAPS entire strings unless allowlisted acronym (e.g. `SPF 50`).

### Key attributes (trailing segment)

- Size/weight: `\d+\s?(g|kg|ml|l|cl|oz|lb)\b`
- Pack count: `Pack of N`, `N Pack`, `N Pieces`
- Variant words (`Original`, `Aloe`, `Lemon`, etc.) belong in **Product Name** per template learned from reference product.

### Validation output shape (shared contract)

```typescript
type ProductNameViolation =
  | "REQUIRED"
  | "TITLE_CASE"
  | "BRAND_POSITION"
  | "ATTRIBUTE_ORDER"
  | "WHITESPACE"
  | "TOO_LONG"
  | "FORBIDDEN_CHARACTERS";

interface ProductNameValidationResult {
  valid: boolean;
  normalizedDraft?: string;
  suggestedName?: string;
  violations: ProductNameViolation[];
  humanMessage: string;
}
```

---

## 6. Category alignment

Category suggestions use the **same reference products** as name suggestions. No separate category ML or barcode inference.

### Inference rules

| Situation | Suggested category |
|-----------|-------------------|
| One clear best match with `categoryId` | That category |
| Top 3 matches share same `categoryId` | That category (high confidence) |
| Top matches split across categories | **No pre-select** — show hint: “Similar products use: Hair Care (2), Personal Care (1)” |
| No similar products (cold catalog) | No category suggestion — owner picks manually |
| Suggested category deleted/inactive | Omit `suggestedCategoryId`; name suggestion may still apply |

### Confidence for pre-selecting category in UI

Pre-select category in the promote `<select>` only when:

- Single reference with score above threshold, **or**
- ≥ 2 similar products agree on `categoryId`

Otherwise show suggestion as helper text only; leave dropdown on “Select category” until owner chooses.

### Enforcement policy

| Field | On save |
|-------|---------|
| **Name** | **Strict** — `PRODUCT_NAME_INVALID` if rules fail |
| **Category** | **Valid ID required** on promote (existing behavior). Assist is advisory only. |

---

## 7. Implementation phases

---

### Phase 1 — Deterministic naming rules (foundation)

**Goal:** Every product name saved through promote/create/update passes the universal standard.

#### Backend (NestJS)

| Task | Detail |
|------|--------|
| Create `ProductNamingService` | `validate(name)`, `normalizeTitleCase(name)`, `buildHumanMessage(violations)`. |
| Wire into `PromoteFromTemporary` | Validate `body.name` before persist. On fail: `400` with `PRODUCT_NAME_INVALID`. |
| Wire into `CreateProduct` / `UpdateProduct` | Same validator on `name`. Hub UX deferred to Phase 3. |
| Unit tests | Table-driven: Title Case, attribute order, brand position, `SPF 50`, `500ml`, `18V`. |

**Nest module layout**

```
src/products/
  catalog-assist/
    product-naming.service.ts
    product-naming.rules.ts
    product-naming.types.ts
    product-naming.service.spec.ts
```

#### Frontend (Hub)

| Task | Detail |
|------|--------|
| Add `lib/product-naming.ts` | Mirror Layer 1 for instant inline feedback (keep in sync with backend). |
| Update promote dialog | Inline errors on name; map `PRODUCT_NAME_INVALID` on submit. |
| Helper text | *“Use Title Case: Brand + Product Name + Size (e.g. Vaseline Aloe Pomade 500g).”* |

#### Phase 1 exit criteria

- [ ] Promoting `vaseline aloe 500g` returns 400 with clear message and optional `suggestedName`.
- [ ] Promoting `Vaseline Aloe Pomade 500g` succeeds.
- [ ] Hub shows inline error before submit when possible.

---

### Phase 2 — Catalog assist (name + category)

**Goal:** On promote dialog open, owner sees **suggested name** and **suggested category** from similar org products — e.g. draft `vaseline aloe 500g` → name `Vaseline Aloe Pomade 500g`, category **Hair Care** (from reference `Vaseline Original Pomade 500g`).

#### Backend (NestJS)

| Task | Detail |
|------|--------|
| `CatalogSimilarityService` | Name-token similarity only over org products. **Do not use barcode** in ranking. |
| `CatalogAssistService` | Orchestrates similarity → name template → category vote → naming validation. |
| `GET /products/catalog-assist` | Query: `draftName`, `excludeProductId?`. See [API contracts](#9-api-contracts). |
| Template substitution | Reference `Vaseline Original Pomade 500g` + draft tokens `aloe`, `500g` → `Vaseline Aloe Pomade 500g`. |
| Category vote | `suggestedCategoryId` from reference product(s) per [§6](#6-category-alignment). |
| Confidence score | `0–1` for assist quality; drives UI pre-select vs hint-only. |
| Cache | `catalog-assist:{orgId}:{hash(draftName)}`, TTL 24h. |
| Audit (optional) | `catalogAssistReferenceProductId` on product at promote — internal, not “variation” UI. |

**Similarity ranking weights (name-only)**

| Signal | Weight |
|--------|--------|
| Token overlap on product name | High |
| Same brand token (first word / alias) | High |
| Same size attribute (`500g`, `500ml`) | High |
| Fuzzy match (pg_trgm / Levenshtein) | Medium |
| Optional brand alias table (`coke` → boost Coca-Cola names in catalog) | Medium |

**Explicitly excluded from ranking:** barcode, external APIs, embeddings, LLM.

#### Frontend (Hub)

| Task | Detail |
|------|--------|
| `fetchCatalogAssist()` | `lib/api/catalog-assist.ts` or `lib/api/products.ts`. |
| `components/products/catalog-assist-panel.tsx` | Name suggestion, category hint/pre-select, similar product link, **Use suggestions** button. |
| Promote dialog | On `openPromote(row)`, fetch assist; do not overwrite fields until owner clicks. |
| Track `categoryTouched` | Do not re-auto-select if owner changed category. |
| Barcode field | Unchanged — required on promote for inventory; **not sent to assist API**. |

#### Phase 2 exit criteria

- [ ] Draft `vaseline aloe 500g` + reference in catalog → correct `suggestedName` and `suggestedCategoryId`.
- [ ] Empty catalog → rules-only feedback; no category pre-select.
- [ ] Assist API p95 latency &lt; 300ms.
- [ ] “Use suggestions” sets name + category in one click.

---

### Phase 3 — Extend to manual product create/edit

**Goal:** Same name rules and catalog assist on **Products → New** (and optionally edit).

#### Backend (NestJS)

| Task | Detail |
|------|--------|
| Confirm name validation | `CreateProduct` / `UpdateProduct` return `PRODUCT_NAME_INVALID`. |
| Bulk import (if exists) | Row-level name validation errors. |

#### Frontend (Hub)

| Task | Detail |
|------|--------|
| `components/products/catalog-assist-field.tsx` | Shared name + category assist for promote dialog and `ProductForm`. |
| `components/products/product-form.tsx` | Debounced assist on name blur in create mode. |
| Settings (optional) | Read-only naming convention help on `app/(dashboard)/settings/page.tsx`. |

#### Phase 3 exit criteria

- [ ] Manual create blocks invalid names with same UX as promote.
- [ ] Shared assist component; no duplicated logic.

---

## 8. Backend vs frontend responsibility matrix

| Capability | Backend | Frontend | Notes |
|------------|---------|----------|-------|
| Naming rule definition | **Owns** | Mirrors for UX | Backend authoritative. |
| Reject invalid name on save | **Owns** | Displays error | Never client-only. |
| Similar product search | **Owns** | Displays results | Name tokens only; not `fetchProductsPaginated`. |
| Category suggestion | **Owns** | Pre-select / hint | Advisory; owner can override. |
| Assist on dialog open | **Computes** | **Triggers** GET | One round trip for name + category. |
| Inline name validation | — | **Owns** | `lib/product-naming.ts`. |
| “Use suggestions” | Provides fields | **Owns** UX | One click for name + category. |
| Caching assist | **Owns** | — | Per org + draftName hash. |
| Barcode on promote POST | **Stores** | Collects in form | Not used for assist. |
| Notification → temp items | Exists | Exists | No digest or new notification work. |

---

## 9. API contracts

All routes under `/api/v1`. Auth: Bearer JWT. Tenant scoped by `organizationId`.

### `GET /products/catalog-assist`

**Roles:** `ADMIN`, `MANAGER`

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `draftName` | string | Yes | Cashier or owner draft (may be messy). |
| `excludeProductId` | uuid | No | Temp placeholder id to exclude from similar results. |

**Do not** accept `barcode` for assist logic. (Barcode may exist on the temp row for promote POST only.)

**Response 200**

```json
{
  "draftName": "vaseline aloe 500g",
  "suggestedName": "Vaseline Aloe Pomade 500g",
  "suggestedCategoryId": "uuid-hair-care",
  "suggestedCategoryName": "Hair Care",
  "confidence": 0.92,
  "source": "catalog_pattern",
  "validation": {
    "valid": false,
    "violations": ["TITLE_CASE"],
    "humanMessage": "Product names use Title Case and follow Brand + Product Name + Key Attributes."
  },
  "referenceProducts": [
    {
      "id": "uuid",
      "name": "Vaseline Original Pomade 500g",
      "categoryId": "uuid-hair-care"
    }
  ],
  "categoryHint": null
}
```

When categories disagree among matches:

```json
{
  "suggestedName": "Coca-Cola Zero 500ml",
  "suggestedCategoryId": null,
  "suggestedCategoryName": null,
  "categoryHint": "Similar products use: Soft Drinks (2), Beverages (1)",
  "confidence": 0.78,
  "source": "catalog_pattern",
  "referenceProducts": [ ... ]
}
```

`source` enum: `"catalog_pattern"` | `"rules_only"`.

**Response errors**

- `400` — missing `draftName`
- `401` / `403` — auth

---

### `POST /products/from-temporary/:productId` (extended error)

Existing body unchanged: `name`, `cost_price`, `category_id`, `stock_quantity`, `barcode`, `selling_price`.

**New error 400 (name)**

```json
{
  "statusCode": 400,
  "code": "PRODUCT_NAME_INVALID",
  "message": "Product names must use Title Case and follow Brand + Product Name + Key Attributes.",
  "violations": ["TITLE_CASE"],
  "suggestedName": "Vaseline Aloe Pomade 500g"
}
```

Hub: parse in `lib/api/errors.ts`.

---

### `POST /products` / `PATCH /products/:id` (Phase 1+)

Same `PRODUCT_NAME_INVALID` body on `name` failures.

---

## 10. Frontend integration map

### New files (Hub)

| File | Purpose |
|------|---------|
| `lib/product-naming.ts` | Client-side rule mirror. |
| `lib/api/catalog-assist.ts` | `fetchCatalogAssist()`. |
| `lib/types/catalog-assist.ts` | `CatalogAssistResponse` types. |
| `components/products/catalog-assist-panel.tsx` | Name + category suggestions, similar product link, Use suggestions. |

### Modified files (Hub)

| File | Phase | Changes |
|------|-------|---------|
| `app/(dashboard)/inventory/temporary-items/page.tsx` | 1–2 | Assist panel, inline name errors, category pre-select. |
| `lib/api/endpoints.ts` | 2 | `productsCatalogAssist: '/products/catalog-assist'`. |
| `lib/api/errors.ts` | 1 | Parse `PRODUCT_NAME_INVALID`. |
| `components/products/product-form.tsx` | 3 | Shared assist on create. |
| `app/(dashboard)/settings/page.tsx` | 3 | Optional naming help copy. |

### Backend files (Nest — reference)

| Area | Changes |
|------|---------|
| `ProductsController` | `GET catalog-assist` **before** `GET :id`. |
| `CatalogAssistService` | Similarity + name + category. |
| `ProductNamingService` | Validation on promote/create/update. |
| `Product` entity (optional) | `catalogAssistReferenceProductId` audit field. |

---

## 11. User stories (implementation guides)

### Story A — “Promote with name and category in one go” (Phase 1 + 2)

**Persona:** Ama, cosmetics shop owner.  
**Trigger:** Temp item **`vaseline aloe 500g`**.

**Narrative**

Ama clicks **Promote to inventory**. The dialog shows:

> **Suggested name:** Vaseline Aloe Pomade 500g  
> **Category:** Hair Care *(suggested — similar products use this category)*  
> **Similar product:** Vaseline Original Pomade 500g →

She taps **Use suggestions**, enters cost price and stock, promotes. The new SKU matches her existing Vaseline line in name and category.

**Acceptance test**

```
Given catalog contains "Vaseline Original Pomade 500g" in category "Hair Care"
When owner opens promote for "vaseline aloe 500g"
Then suggestedName is "Vaseline Aloe Pomade 500g"
And suggestedCategoryId is Hair Care
And "Use suggestions" fills name and category
And promote succeeds
```

---

### Story B — “The stubborn typo” (Phase 1)

**Persona:** Kwame, hardware store owner.

**Narrative**

Kwame types **`makita drill 18v`**. Inline error shows with example **`Makita Drill 18V`**. Server rejects if he submits without fixing.

**Acceptance test**

```
When name is "makita drill 18v"
Then client shows TITLE_CASE violation
When submit without fix
Then API returns 400 PRODUCT_NAME_INVALID
```

---

### Story C — “Sibling SKU, not a variation” (Phase 2)

**Persona:** Efua, supermarket manager.

**Narrative**

Catalog has `Coca-Cola Original 500ml` and `Coca-Cola Zero 500ml` in **Soft Drinks**. Temp item **`coke zero 500ml`** → suggested **`Coca-Cola Zero 500ml`**, category **Soft Drinks**. No parent-SKU or variation UI.

---

### Story D — “Cold start — new shop” (Phase 2 degrade)

**Persona:** New tenant, empty catalog.

**Narrative**

First temp item **`soap 100g`**. No similar products. Assist returns `source: "rules_only"` with Title Case normalize attempt if trivial; **no category pre-select**. Owner picks category manually. Dialog still works; promote succeeds when name passes rules.

**Acceptance test**

```
Given empty product catalog
When draftName is "soap 100g"
Then suggestedCategoryId is null
And promote succeeds when owner enters valid name and category manually
```

---

### Story E — “Split category hint” (Phase 2)

**Persona:** Owner with messy historical categories.

**Narrative**

Similar products span **Hair Care (2)** and **Personal Care (1)**. System does **not** pre-select. Shows: *“Similar products use: Hair Care (2), Personal Care (1).”* Owner chooses. Name suggestion still offered.

---

### Story F — “Notification deep link” (Phase 2)

**Persona:** Owner on phone.

**Narrative**

Notification opens `/inventory/temporary-items?highlightProductId=…`. Row highlighted. Owner taps Promote; assist loads from row’s draft name. No new notification or dashboard work required.

---

### Story G — “Manual add stays consistent” (Phase 3)

**Persona:** Ama adds product via **Products → New**.

**Narrative**

Same assist panel as promote. She cannot add **`vaseline 500g aloe`** next to clean catalog names.

---

## 12. UI and UX patterns

### Do

- One **“Use suggestions”** button for name + category together.
- Show category as pre-selected `<select>` only when confidence rules pass; otherwise helper text only.
- Link reference product to `/products/[id]`.
- Load assist asynchronously — show draft values immediately; never block dialog open.
- Keep barcode input on promote form (inventory); do not mention barcode in assist copy.

### Do not

- Chatbot, “AI”, or streaming text in owner UI.
- Auto-apply suggestions without click.
- Block promote when assist API fails if name validates and category is chosen.
- Barcode lookup or “we found this product online.”
- Owner digest / priority dashboard card.
- Variation/parent SKU pickers.

### Suggested promote dialog assist block

```
┌─────────────────────────────────────────────────────────────┐
│ Name *                                                       │
│ [vaseline aloe 500g                                        ] │
│ ✦ Suggested: Vaseline Aloe Pomade 500g                      │
│ Similar: Vaseline Original Pomade 500g →                    │
│                                                              │
│ Category *                                                   │
│ [Hair Care ▼]  Suggested — similar products use this category│
│                                                              │
│ Barcode *  [600115…]   (unchanged — not used for suggestions)│
│ ... cost, price, stock ...                                   │
│                                                              │
│ [Use suggestions]                        [Promote]           │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Similarity stack

Deterministic only. No LLM, embeddings, or external APIs.

| Layer | Technology | Owner |
|-------|------------|-------|
| Naming rules | TypeScript in Nest + mirrored in Hub | Backend + Frontend |
| Token + fuzzy similarity | PostgreSQL `pg_trgm` and/or in-app token scorer | Backend |
| Brand aliases (optional) | Static config map, matched against catalog names | Backend |
| Assist cache | Redis or in-memory, key `catalog-assist:{orgId}:{hash}` | Backend |

---

## 14. Testing strategy

### Backend unit tests

- Naming validator: 30+ cases.
- Template substitution: `Original` → `Aloe` with fixed `500g`.
- Category vote: unanimous, split, no matches.
- Assist never reads barcode field.

### Backend integration tests

- `GET /products/catalog-assist` with seeded catalog.
- `POST /products/from-temporary/:id` rejects invalid name; accepts valid name + category.

### Frontend (manual / e2e)

- Promote: Use suggestions, category pre-select, split category hint, assist API failure fallback.
- Notification highlight preserved.

### Regression fixtures

Maintain `docs/fixtures/catalog-assist-cases.json`:

```json
{
  "draft": "vaseline aloe 500g",
  "catalog": [{ "name": "Vaseline Original Pomade 500g", "categoryId": "…" }],
  "expectedName": "Vaseline Aloe Pomade 500g",
  "expectedCategoryId": "…",
  "expectedViolations": ["TITLE_CASE"]
}
```

---

## 15. Rollout and metrics

### Rollout order

1. Phase 1 — name validation on promote + Hub inline errors.
2. Phase 2 — `catalog-assist` + promote dialog panel.
3. Phase 3 — `ProductForm` parity.

### Metrics to track

| Metric | Target |
|--------|--------|
| Promote success rate | No drop vs baseline |
| `PRODUCT_NAME_INVALID` rate | Decreases over 30 days |
| Suggestion acceptance (`Use suggestions` / opens) | &gt; 60% when reference products exist |
| Category pre-select acceptance | Track separately from name-only edits |
| Assist API p95 latency | &lt; 300ms |
| New product name validator pass rate | &gt; 95% after 60 days |

---

## 16. Out of scope (explicit)

- **LLM / generative AI** for names or categories.
- **External barcode lookup** (Open Product Facts, UPC databases, etc.).
- **Owner digest / dashboard priorities** card.
- Product **variation** / parent-child SKU hierarchy.
- Enforcing naming on **staff mobile** at scan time (v1).
- Auto-renaming **existing** catalog without owner action.
- **Rejecting** owner’s category choice when ID is valid.
- Multi-language product names.
- Hub calling external assist APIs from the browser.

---

## 17. Phase checklist summary

| Phase | Backend | Frontend | Delivers |
|-------|---------|----------|----------|
| **1 — Rules** | `ProductNamingService`, enforce on promote (+ create/update) | `lib/product-naming.ts`, promote name inline errors | Invalid names cannot be saved |
| **2 — Catalog assist** | `GET /products/catalog-assist`, similarity, category vote, cache | Assist panel, Use suggestions, category pre-select | Correct name + category from org catalog |
| **3 — Polish** | Bulk import name validation | `ProductForm` + shared assist component | Consistency on manual create/edit |

**Backend status (2026-06-19):** Phases 1–2 complete; Phase 3 backend complete except bulk import (no endpoint). See [§18](#18-backend-implementation-actual).

---

## 18. Backend implementation (actual)

**Implemented:** 2026-06-19  
**Commit:** `5f346e8` (pre-commit working tree)

### What was built

| Area | Location |
|------|----------|
| Naming types & rules | `src/modules/products/catalog-assist/product-naming.types.ts`, `product-naming.rules.ts` |
| Naming service | `src/modules/products/catalog-assist/product-naming.service.ts` |
| Similarity service | `src/modules/products/catalog-assist/catalog-similarity.service.ts` |
| Assist orchestrator | `src/modules/products/catalog-assist/catalog-assist.service.ts` |
| Query DTO | `src/modules/products/catalog-assist/dto/catalog-assist-query.dto.ts` |
| Response types | `src/modules/products/catalog-assist/catalog-assist.types.ts` |
| Error code enum | `src/common/enums/product.enum.ts` → `ProductErrorCode.PRODUCT_NAME_INVALID` |
| Module wiring | `src/modules/products/products.module.ts` (CacheModule + providers) |
| Controller route | `GET /api/v1/products/catalog-assist` in `products.controller.ts` (registered **before** `GET :id`) |
| Write-path validation | `products.service.ts` → `promoteFromTemporary`, `create`, `update` (skips `duplicate`) |

### Deviations from plan

| Plan item | Actual |
|-----------|--------|
| `pg_trgm` fuzzy similarity | **In-app** token Jaccard + Levenshtein scoring (no DB extension) |
| `catalogAssistReferenceProductId` column | **Not added** — optional audit deferred; promote event log unchanged |
| Bulk import validation | **N/A** — no bulk import endpoint exists |
| Cache namespace | `nutapos-catalog-assist` (separate from notifications `nutapos`) |

### Naming rules (Layer 1)

- Format: `{Brand} {Product Name} {Key Attributes}` (trailing size/pack tokens).
- Violation codes: `REQUIRED`, `TITLE_CASE`, `BRAND_POSITION`, `ATTRIBUTE_ORDER`, `WHITESPACE`, `TOO_LONG`, `FORBIDDEN_CHARACTERS`.
- Max length: **200** characters.
- Allowlist tokens: `iPhone`, `SPF`, `McDonald's`, `18V`, `Coca-Cola`, etc. (`product-naming.types.ts`).
- Units stay lowercase: `g`, `kg`, `ml`, `l`, `cl`, `oz`, `lb`.

### Catalog assist (Layer 2)

- **Route:** `GET /api/v1/products/catalog-assist`
- **Roles:** `ADMIN`, `MANAGER`
- **Query:** `draftName` (required), `excludeProductId` (optional UUID)
- **Barcode:** never used in assist logic
- **Similarity:** org active non-temporary products; weighted token overlap (0.40), brand alias (0.25), size match (0.20), Levenshtein (0.15)
- **Template substitution:** reference variant tokens (e.g. `Original`) swapped with draft variants (e.g. `aloe`)
- **Category vote:** pre-select when single match score ≥ 0.65 or ≥ 2 of top 3 agree; otherwise `categoryHint` text
- **Cache key:** `catalog-assist:{organizationId}:{sha256(normalizedDraftName + excludeProductId)}` — `excludeProductId` concatenated into hash input (empty string when omitted)
- **Cache TTL:** 24 hours (`86_400_000` ms); in-memory when `REDIS_HOST` unset

### API reference for frontend

#### `GET /api/v1/products/catalog-assist`

**Example request**

```
GET /api/v1/products/catalog-assist?draftName=vaseline%20aloe%20500g&excludeProductId={tempProductUuid}
Authorization: Bearer {token}
```

**Example 200 response**

```json
{
  "draftName": "vaseline aloe 500g",
  "suggestedName": "Vaseline Aloe Pomade 500g",
  "suggestedCategoryId": "uuid-hair-care",
  "suggestedCategoryName": "Hair Care",
  "confidence": 0.92,
  "source": "catalog_pattern",
  "validation": {
    "valid": false,
    "violations": ["TITLE_CASE"],
    "humanMessage": "Product names use Title Case and follow Brand + Product Name + Key Attributes.",
    "normalizedDraft": "vaseline aloe 500g",
    "suggestedName": "Vaseline Aloe 500g"
  },
  "referenceProducts": [
    {
      "id": "uuid",
      "name": "Vaseline Original Pomade 500g",
      "categoryId": "uuid-hair-care"
    }
  ],
  "categoryHint": null
}
```

**Cold catalog (`source: "rules_only"`)**

```json
{
  "draftName": "soap 100g",
  "suggestedName": "Soap 100g",
  "suggestedCategoryId": null,
  "suggestedCategoryName": null,
  "confidence": 0,
  "source": "rules_only",
  "validation": { "valid": false, "violations": ["TITLE_CASE"], "humanMessage": "..." },
  "referenceProducts": [],
  "categoryHint": null
}
```

#### `PRODUCT_NAME_INVALID` on promote / create / update

```json
{
  "statusCode": 400,
  "code": "PRODUCT_NAME_INVALID",
  "message": "Product names use Title Case and follow Brand + Product Name + Key Attributes.",
  "violations": ["TITLE_CASE"],
  "suggestedName": "Vaseline Aloe 500g"
}
```

**Frontend parsing:** check `response.code === 'PRODUCT_NAME_INVALID'`; read `violations[]` and `suggestedName` for inline UX.

### Seed / test data

Updated `prisma/seed.ts` demo catalog:

| Product | Category |
|---------|----------|
| `Vaseline Original Pomade 500g` | Hair Care |
| `Coca-Cola Original 500ml` | Soft Drinks |
| `Coca-Cola Zero 500ml` | Soft Drinks |

Regression fixtures: `docs/fixtures/catalog-assist-cases.json`

### Tests

| Suite | Command |
|-------|---------|
| Unit (naming + assist) | `npm test -- --testPathPatterns="catalog-assist\|product-naming"` |
| E2E (requires DB) | `E2E_RUN=1 npm run test:e2e -- --testPathPatterns=catalog-assist` |

E2E file: `test/catalog-assist.e2e-spec.ts` — covers assist response, invalid promote rejection, valid promote success.

### Not implemented (and why)

| Item | Reason |
|------|--------|
| `catalogAssistReferenceProductId` DB column | Optional audit; deferred |
| Bulk import name validation | No bulk import endpoint in backend |
| `pg_trgm` extension | In-app scoring sufficient for org catalog sizes |
| Staff mobile naming enforcement | Out of scope per §16 |

### Frontend next steps (Hub)

1. Add `lib/product-naming.ts` mirroring Layer 1 rules.
2. Add `lib/api/catalog-assist.ts` → `GET /products/catalog-assist`.
3. Parse `PRODUCT_NAME_INVALID` in `lib/api/errors.ts`.
4. Build `catalog-assist-panel.tsx` for promote dialog (Phase 2) and `product-form.tsx` (Phase 3).
5. On promote open: fetch assist with `draftName` + `excludeProductId` (temp placeholder id); do not auto-apply until owner clicks **Use suggestions**.

---

## Document history

| Date | Change |
|------|--------|
| 2026-06-18 | Initial plan: phases 1–4, API contracts, user stories |
| 2026-06-18 | **Scope revision:** Renamed to Catalog Assist; removed LLM (old Phase 3), barcode lookup, owner digest; added category alignment; consolidated to 3 phases; `GET /products/catalog-assist` replaces `name-suggestion` |
| 2026-06-19 | **Backend implemented:** §18 added — naming validation, catalog assist API, tests, seed fixtures |
