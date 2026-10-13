# Auto-convert on sale

Opt-in packaging/portion conversion at sale time. Extends [Product Conversion](../product_conversion.md).

## Flag

`ProductConversion.autoConvertOnSale` (boolean, **default `false`**).

- Only **active** conversions participate (`isActive: true`).
- Applies when selling the **child** (singles/portion), consuming the **parent** (pack/bulk) via the same `BULK_TO_SINGLES` math as `POST /inventory/convert-bulk`.
- Manual convert-bulk is unchanged for existing callers.

### Multi-parent rule (v1)

A child may have at most **one** active `autoConvertOnSale` parent link. Create/PATCH that would enable a second active auto parent for the same child returns **400**. Do not guess which parent to break.

## Hub API (toggle wiring)

| Endpoint | Field |
|----------|--------|
| `POST /products/conversions` | optional `autoConvertOnSale` (default false) |
| `PATCH /products/conversions/:id` | optional `autoConvertOnSale` |
| `GET /products/:productId/conversions` | included on each row |

### Hub UI

Owners set the flag on **Product edit → Product packaging** (checkbox defaults off) or on the product detail **Linked products → Edit link** dialog.

## Sale-time behavior

Inside the same **Serializable** transaction as Hub `POST /sales` and staff `POST /staff/sales`:

1. If child on-hand ≥ qty → no conversion; deduct as today.
2. If short and exactly one active auto parent:
   - `packsNeeded = ceil(shortfall / ratio)`
   - If parent on-hand ≥ packsNeeded → convert (paired adjustments), then deduct sold child qty.
   - Else → leave stock unchanged; existing variance / insufficient-stock policy applies.
3. Minimum packs only (not the whole parent inventory).
4. Lines processed sequentially so multi-line sales re-read stock after each convert/deduct.

### Adjustment linkage

Auto legs:

- `referenceId` = sale id
- `referenceType` = `SALE_AUTO_CONVERSION`
- `reason` = `sale_auto_bulk_to_singles`
- `notes` include `conversionId=…`
- Cost-neutral parent `costPrice` rules unchanged

Manual convert-bulk still uses `referenceType: PRODUCT_CONVERSION`.

### Variance

Prefer auto-convert over stock variance when parent can cover the shortfall. After a successful auto-convert, the line is **not** marked `hasStockVariance` even if the client sent variance metadata. If parent cannot cover, keep today’s variance policy (require `varianceReason` when still short).

### Idempotency

Staff sale re-posts with the same sale `id` short-circuit as duplicates and do not convert twice.

## Staff effective sellable vs Hub physical

| Audience | Endpoints | Stock shown |
|----------|-----------|-------------|
| Staff app | `GET /staff/inventory`, `/staff/pricing`, `/staff/master-data`, `GET /sync/initial-pull` | **Effective:** `childStock + floor(parentStock × ratio)` for auto children (exactly one auto parent) |
| Hub | `GET /products*`, stock-takes, adjustments | **True** `BranchInventory` on-hand |

Inflation is **response-only**. Physical counts and Hub stocktakes must use true on-hand.

Multi-product oversell risk (Whole / Half / Quarter sharing one parent pool) is accepted for v1 offline UX; the **server still enforces** real stock at sale ingest.

## Void policy

1. Reverse sale stock on the sold (child) product as today.
2. Reverse each sale-linked auto-conversion (`SINGLES_TO_BULK`) if child on-hand ≥ packs × ratio.
3. Otherwise **reject void** with a clear conflict (e.g. leftover converted units were later sold). Never silently corrupt stock.

Void reverse adjustments use `referenceType: SALE_VOID_AUTO_CONVERSION`.

## Return policy (v1)

Restock the returned **child** product only. Do **not** auto-assemble back to parent.

## Concurrency

Sale create and void (with auto-convert reverse) use **Serializable** isolation, matching convert-bulk, so two concurrent sales cannot both convert the last parent pack.
