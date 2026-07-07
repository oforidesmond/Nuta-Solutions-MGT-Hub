# Backend Task: Fix Global Unique Constraints That Should Be Per-Organization

**Reported by:** Management Hub team
**Priority:** P0 (blocks staff creation for every org after the first)
**Owner:** NestJS backend

---

## 1. Confirmed bug: `StaffProfile.staffId` collides across organizations

### Symptom
An ADMIN creating a new staff member gets a **"unique constraint"** error even though the phone/email they entered does not exist anywhere in the database.

### Root cause (verified against production DB)
- `StaffProfile.staffId` has a **global** unique index:
  ```
  CREATE UNIQUE INDEX "StaffProfile_staffId_key" ON public."StaffProfile" (staffId)
  ```
- Staff IDs are generated **per organization** as `STF-001`, `STF-002`, … (count of that org's staff + 1).
- Because the human-readable ID restarts at `STF-001` for every org but the constraint is global, the **second organization onward always collides**.

### Evidence (live data at time of report)
| staffId | organization | email |
|---------|--------------|-------|
| STF-001 | Test Org 2   | stafftest1@nutasolutions.com |
| STF-002 | Test Org 2   | STF-002@temp.nutasolutions.com |

Org **SSVentures** has 0 staff. Creating its first staff generates `STF-001`, which already exists globally (Test Org 2) → **P2002 unique violation on `StaffProfile.staffId`**. The Hub cannot detect this pre-flight because the colliding row belongs to a different org the admin cannot see.

### Required fix
Make `staffId` unique **per organization**, not globally.

1. `StaffProfile` currently has **no `organizationId` column** (only `branchId`). Add `organizationId` (FK → `Organization`) to `StaffProfile`, backfilled from the related `User.organizationId`.
2. Replace the global unique index with a composite:
   ```prisma
   @@unique([organizationId, staffId])
   ```
3. Make staff-ID generation **collision-safe and atomic** (avoid `count()+1`, which races and reuses freed numbers). Prefer one of:
   - A per-org counter/sequence, or
   - `SELECT max(staffId)` within the org inside the same transaction with a retry on unique violation.
4. Migration safety: staff IDs are per-org today, so backfilling `organizationId` and adding the composite index should not conflict — **but verify** there are no existing global duplicates before dropping the old index.

---

## 2. Related bug: auto-generated placeholder email

When email is omitted (now optional from the Hub), the backend generates `${staffId}@temp.nutasolutions.com`. Because this is derived from the per-org `staffId` and `User.email` is globally unique, it has the **same cross-org collision class** as issue #1 (e.g. two orgs both generating `STF-001@temp.nutasolutions.com`).

**Fix:** keep `User.email` globally unique (it's the login identity), but make the generated placeholder globally unique — e.g. include the org id or a UUID:
```
staff+${uuid}@placeholder.nutasolutions.com
```
Also confirm the backend accepts an **absent/optional `email`** on `POST /staff` (the Hub now omits the field when blank).

---

## 3. Review task: audit ALL global unique constraints for tenancy scoping

The following single-column **global** unique constraints exist. Review each: anything that is an **org-defined or org-generated value** must be scoped `@@unique([organizationId, <field>])` instead of being globally unique.

### Should almost certainly become per-org
| Table.column | Current index | Why it should be per-org |
|--------------|---------------|--------------------------|
| `StaffProfile.staffId` | `StaffProfile_staffId_key` | Per-org sequence (issue #1). |
| `Product.barcode` | `Product_barcode_key` | Real-world barcodes (EAN/UPC) are shared across retailers; two orgs legitimately stock the same product. Blocks org B from adding a product org A already has. |
| `Product.sku` | `Product_sku_key` | SKUs are org-defined; different orgs will reuse the same SKU strings. |
| `Sale.receiptNumber` | `Sale_receiptNumber_key` | Receipt numbers are generated per org (e.g. `RCP-YYYYMMDD-XXXXXX`); two orgs can generate the same value. |
| `Return.returnNumber` | `Return_returnNumber_key` | Same as receipt numbers — generated per org. |

`Product`, `Sale`, and `Return` all already have an `organizationId` column, so scoping is straightforward.

### Keep global (do NOT change) — documented for completeness
| Table.column | Reason |
|--------------|--------|
| `User.email` | Login identity; must be globally unique. (Fix the placeholder generator instead — issue #2.) |
| `Device.deviceUuid` | Physical/device-install identifier; global identity is intended. |
| `RefreshToken.tokenHash` | Secret token value; global uniqueness required. |
| `SyncQueue.idempotencyKey` | Client-generated UUID. Global is acceptable; optionally scope per-org for defense in depth. |
| Unique FK columns (`DiscountAlert.saleId`, `StaffStockDelta.stockAdjustmentId`, `StockAdjustment.linkedAdjustmentId`, `TemporaryItem*.notificationId`) | 1:1 relationship guards; correct as-is. |

### Already correctly scoped (no action)
`Category(organizationId, name)`, `BranchInventory(branchId, productId)`, `product_conversions(organizationId, parentProductId, childProductId)`, `TemporaryItemDailyAggregate(organizationId, branchScopeKey, barcode, saleDay)`, `TemporaryItemOrgDayNotification(organizationId, summaryDate)`, `TemporaryItemSaleLine(organizationId, localProductId, localSaleId)`, `NotificationReadReceipt(notificationId, userId)`.

---

## 4. Acceptance criteria
- [ ] `StaffProfile.staffId` is unique per organization; two orgs can both have `STF-001`.
- [ ] Creating the first staff in a brand-new org succeeds with no unique-constraint error.
- [ ] Staff-ID generation is atomic/retry-safe under concurrency (no `count()+1` race).
- [ ] Omitting `email` on `POST /staff` succeeds; generated placeholder emails are globally unique.
- [ ] Migration checks for and resolves any pre-existing global duplicates before switching indexes.
- [ ] `Product.barcode`, `Product.sku`, `Sale.receiptNumber`, `Return.returnNumber` reviewed and re-scoped per-org (with data-migration dedupe plan) unless there is an explicit business reason to keep them global — document the decision.
- [ ] Any query/`findUnique` calls that relied on the old global uniqueness are updated to include `organizationId`.

## 5. Notes for the Hub side
- The Hub already normalizes phone numbers to E.164 and pre-checks the current org's staff (including inactive) for duplicate phone/email. It cannot detect cross-org internal-ID collisions — those must be prevented server-side.
- `User.phoneNumber` is **not** unique in the DB, so phone duplicates are only a soft/product-level check, not a DB constraint.
