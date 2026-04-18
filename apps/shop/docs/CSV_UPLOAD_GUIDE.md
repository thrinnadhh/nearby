# Bulk CSV Product Upload — Complete Guide

## Overview

The CSV upload feature allows shop owners to upload multiple products at once via a 4-step wizard:

1. **File Picker** — Select CSV file from device
2. **Preview** — Validate rows, see errors
3. **Upload** — Progress tracking with batch processing
4. **Results** — Success/failure summary, retry failed products

---

## CSV File Format

### Required Columns

| Column | Aliases | Type | Constraints | Example |
|--------|---------|------|-------------|---------|
| **name** | Product Name, Item Name, Title | String | 2-100 chars, required | "Basmati Rice" |
| **description** | Description, Details, Notes | String | Optional, ≤500 chars | "Premium long grain" |
| **category** | Category, Type, Class | Enum | Must match 12 options | "Vegetables" |
| **price** | Price, Cost, MRP, Unit Price | Number | ≥₹1.00 (100 paise min) | "250" (₹250.00) |
| **stockQty** | Stock, Quantity, Units, Qty | Integer | ≥0, no upper limit | "50" |
| **unit** | Unit, Pack Size, Measure | Enum | Must match 8 options | "kg" |

### Valid Categories (12)
```
Vegetables, Fruits, Dairy & Eggs, Bakery, Beverages,
Spices & Seasonings, Personal Care, Household Items,
Pharmacy, Confectionery, Ready-to-eat, Meat & Fish
```

### Valid Units (8)
```
kg, gram, litre, ml, piece, pack, dozen, box
```

### Column Aliases

The system accepts 30+ user-friendly aliases for each column:

**Name aliases:** Product Name, Item Name, Title, Product, Name
**Price aliases:** Price, Cost, MRP, Unit Price, Selling Price, Rate, Amount
**Stock aliases:** Stock, Quantity, Units, Qty, Available Stock, On Hand
**Unit aliases:** Unit, Pack Size, Measure, Measurement, Type
**Category aliases:** Category, Type, Class, Product Category, Group
**Description aliases:** Description, Details, Notes, Additional Info, Remarks

---

## Example CSV

```csv
Product Name,Description,Category,Price,Stock,Unit
Basmati Rice,Premium long grain,Vegetables,250,50,kg
Whole Milk,1L pack,Dairy & Eggs,60,100,litre
Chicken Breast,Fresh,Meat & Fish,450,30,kg
Tomatoes,Red ripe,Vegetables,80,200,kg
```

---

## Validation Rules

### Price Validation
- ✅ **Valid:** "250", "99.99", "1"
- ❌ **Invalid:** "0", "0.50" (below ₹1.00), "abc"
- **Conversion:** Client multiplies by 100 (stored as paise)
- **Error Message:** "Minimum price is ₹1.00"

### Stock Validation
- ✅ **Valid:** "0", "50", "1000000"
- ❌ **Invalid:** "-5", "abc"
- **Error Message:** "Stock must be 0 or greater"

### Category Validation
- ✅ **Valid:** Must exactly match one of 12 categories (case-insensitive)
- ❌ **Invalid:** "Veges", "Vegetable", "veg"
- **Error Message:** "Category not recognized. Valid options: [list]"

### Unit Validation
- ✅ **Valid:** Must match one of 8 units (case-insensitive)
- ❌ **Invalid:** "kilogram", "l", "pcs"
- **Error Message:** "Unit not recognized. Valid options: [list]"

---

## File Constraints

| Constraint | Value | Error |
|------------|-------|-------|
| **File Type** | .csv only | "Please select a CSV file" |
| **File Size** | ≤5MB | "File size must be under 5 MB" |
| **Empty File** | Not allowed | "CSV file is empty" |
| **Rows per Batch** | ≤100 | "Batch size cannot exceed 100" |
| **Concurrent Uploads** | 1 at a time | Queue or block during upload |

---

## Upload Flow

### Step 1: File Selection
- User taps "Choose CSV File"
- Document picker opens
- System validates: extension (.csv) + size (≤5MB)
- File content is read and parsed

### Step 2: CSV Preview
- CSV is parsed using papaparse
- Each row is validated against schema
- ✅ Valid rows show green checkmark
- ❌ Invalid rows show red X with error details
- Summary: "48 valid, 2 errors"
- User can [Confirm] to proceed or [Back] to pick different file

### Step 3: Upload Progress
- Products split into batches (max 100 per batch)
- Progress bar shows: "150 of 250 products"
- Each batch gets idempotency key: `bulk-{timestamp}-{batchNumber}`
- User can [Cancel] upload mid-way
- 30s timeout per batch with automatic retry (3 attempts)
- Real-time status: "Uploading...", "Processing..." 

### Step 4: Results
- Success summary: "150 products uploaded successfully"
- Failure summary (if any): "2 products failed"
- Failed products listed with specific errors
- Options: [Retry Failed], [Download Report], [Back to Catalogue]
- Zustand store auto-refreshed (no manual refresh needed)

---

## Error Handling

### User-Facing Errors
```typescript
// Good (user-friendly)
"File size must be under 5 MB"
"Price must be at least ₹1.00"
"Tomatoes (Row 5): Unit 'kg' is not recognized"

// Bad (technical, unhelpful)
"Papa.parse() returned errors: undefined"
"500 Internal Server Error"
```

### Partial Success (207 Multi-Status)
- Backend returns: `{ successful: [...], failed: [...] }`
- Frontend shows:
  - ✅ "150 products uploaded successfully"
  - ⚠️ "2 products failed: [reasons]"
- User can retry failed products without re-uploading successful ones

### Network Failures
- **Timeout (>30s):** "Upload timeout. [Retry]"
- **Network Error:** "Connection lost. [Retry]"
- **Server Error:** "Server error. Try again later."
- Batch can be retried with same idempotency key

### Concurrent Protection
- If upload in progress: Disable file picker
- If user navigates away: Cancel upload + confirm warning
- Idempotency key prevents duplicate batches if retried

---

## Implementation Details

### Architecture

```
BulkUploadScreen (main container)
├── FilePickerStep (file selection)
├── PreviewStep (CSV preview + validation)
├── UploadStep (progress bar)
└── ResultsStep (success/failure summary)

Hooks:
├── useCsvParser (file picking + parsing)
├── useBulkUpload (orchestrates 4 steps + uploads)

Services:
├── csv-parser.ts (CSV parsing)
├── csv-validator.ts (row validation)
├── csv-upload.ts (API calls)

State:
└── Zustand useProductsStore (refreshed after success)
```

### Batch Processing Algorithm

```typescript
1. Split validated rows into batches of ≤100
2. For each batch:
   a. Create FormData with products + idempotencyKey
   b. POST to /shops/{shopId}/products/bulk
   c. If 207 (partial): store failures
   d. If timeout: retry up to 3 times
   e. If error: add to failed list
3. Refresh Zustand store
4. Show results (successes + failures)
```

### Idempotency

Each batch upload includes idempotency key:
```
Format: bulk-{timestamp}-{batchNumber}
Example: bulk-1713444000000-1

Backend uses this to:
- Detect if batch already uploaded
- Return cached result if retry occurs
- Prevent duplicate products
- TTL: 24 hours
```

---

## Testing

### Unit Tests Included
- CSV parsing (valid, empty, malformed, BOM handling)
- Row validation (all fields, price conversion, unit matching)
- Batch size limits (100 max, ≤100 allowed)
- File validation (extension, size, content)

### Integration Tests Needed
- ✅ Complete 4-step flow
- ✅ Batch splitting (200 products → 3 batches)
- ✅ Partial success handling (207 response)
- ✅ Network timeout + retry
- ✅ Cancel mid-upload
- ✅ Store refresh verification

### Edge Cases Tested
- ✅ Empty CSV file
- ✅ CSV with only headers
- ✅ Exactly 100 products (batch boundary)
- ✅ 101 products (2 batches)
- ✅ Extra columns (handled gracefully)
- ✅ Missing columns (validation fails)
- ✅ Malformed CSV (Papa.parse handles)
- ✅ BOM handling (removed automatically)

---

## Performance

| Operation | Time | Note |
|-----------|------|------|
| File picker | <500ms | Native dialog |
| CSV parsing (100 rows) | <100ms | papaparse is fast |
| Row validation (100 rows) | <50ms | Joi schema |
| Batch upload (100 products) | 1-3s | Network dependent |
| Store refresh | <200ms | Zustand update |

**Total:** 100-product file: ~2-4 seconds end-to-end

---

## Troubleshooting

### User can't select file
- **Cause:** File permissions on device
- **Solution:** Verify app has "Read Files" permission in OS settings

### CSV parsed but shows validation errors
- **Cause:** Column names don't match expected format
- **Solution:** Use provided CSV template or check column aliases

### Upload stuck at 50%
- **Cause:** Network timeout (30s limit per batch)
- **Solution:** User should [Retry] — idempotency key prevents duplicates

### Products uploaded but store doesn't refresh
- **Cause:** Race condition in Zustand update
- **Solution:** Manual refresh via pull-down or navigate away/back

### "Batch size cannot exceed 100" error
- **Cause:** User uploaded > 100 products in single request
- **Solution:** System auto-splits into batches now (should not occur)

---

## API Contract

### Backend Endpoint

```
POST /shops/{shopId}/products/bulk

Headers:
  Content-Type: multipart/form-data
  Authorization: Bearer {jwt}
  Idempotency-Key: bulk-{timestamp}-{batchNumber}

Body (FormData):
  products: JSON.stringify([...CsvProductRow[]])

Response (200 OK or 207 Multi-Status):
  {
    "statusCode": 200 | 207,
    "data": {
      "successful": [{ id, name, ... }],
      "failed": [{ row, errors: {} }]
    }
  }
```

### Expected Status Codes
- **200:** All products uploaded successfully
- **207:** Partial success (some failed, some succeeded)
- **400:** Invalid batch format, shop not found
- **413:** Batch too large
- **500:** Server error (user should retry)

---

## Maintenance

### Changing Validation Rules
1. Update `src/constants/csv-schema.ts` (categories, units, constraints)
2. Update tests in `csv-validator.test.ts`
3. Update this guide with new constraints

### Adding New Columns
1. Update `CsvProductRow` type in `src/types/csv.ts`
2. Add to `CSV_HEADERS` in `src/constants/csv-schema.ts`
3. Add Joi schema rule in `csv-schema.ts`
4. Add tests for new field
5. Update this guide

### Performance Optimization
- Current: 100 products per batch
- To increase: Change `BATCH_SIZE = 100` in `csv-upload.ts`
- Monitor: Backend timeout (30s per request)
- Trade-off: Fewer requests vs. timeout risk

---

## Related Documentation

- [CSV Upload Components](./COMPONENT_DOCS.md) — Props, state, behavior
- [NearBy API Reference](../../docs/API.md) — Full endpoint docs
- [Product Management Flow](../../docs/FLOWS.md#f12-product-management) — User journey
