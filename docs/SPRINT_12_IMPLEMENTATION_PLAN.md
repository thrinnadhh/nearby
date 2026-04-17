# Sprint 12 Implementation Plan — Shop Owner App Inventory & Earnings

**Sprint Duration:** 2 weeks (14 days)  
**Team Size:** 2 mobile engineers + 1 backend engineer  
**Blockers:** None — Sprint 11 is 100% complete, all dependencies shipped.

---

## Executive Summary

Sprint 12 transforms the Shop Owner App from a pure order-management tool into a **full inventory and business intelligence platform**. Three phases:

1. **Inventory Management** (Tasks 12.1–12.6): Product CRUD, bulk upload, push notifications for low stock
2. **Earnings & Analytics** (Tasks 12.7–12.10): Real-time earnings dashboard, settlement tracking, PDF statements
3. **Settings & Extensions** (Tasks 12.11–12.13): Customer chat, shop hours/holidays, bank details management

**Expected Outcome:** Shop owners can manage 500+ products, understand daily revenue, and respond to customer messages—all in-app. Zero context switching to email or spreadsheets.

---

---

## Phase 1: Inventory Management (Tasks 12.1–12.6)

### **Objective**
Enable shop owners to create, edit, bulk-upload, and toggle product stock with real-time Typesense synchronization and low-stock alerts.

### **Scope Overview**
- 4 new screens (Product Catalogue, Add Product, Bulk CSV Upload, Edit Product)
- 1 quick-action feature (swipe-to-toggle stock)
- 1 alert system (low stock notifications)
- 3 backend endpoints (bulkcreate, CSV template, soft-delete)

---

### **Task 12.1: Product Catalogue Screen**

#### **Screen Specification**
**File:** `apps/shop/src/screens/ProductCatalogueScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ Catalogue              [+ Add] ▼ ◯│  ← Header with quick actions
├─────────────────────────────────┤
│ [Search products____] [Filter ▼]│  ← Search + category filter
├─────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐        │
│ │ Paneer  │  │ Milk 1L │        │  ← 2-column grid
│ │ ₹150    │  │ ₹50     │        │    - Product image
│ │ 25 in ⚠ │  │ 0 in ✓  │        │    - Price + stock count
│ │[Edit]   │  │[Edit]   │        │    - Quick-toggle
│ └─────────┘  └─────────┘        │
│                                 │
│ ┌─────────┐  ┌─────────┐        │
│ │ Honey   │  │ Salt    │        │
│ │ ₹200    │  │ ₹30     │        │
│ │ Low ⚠   │  │ 100 in ✓│        │
│ │[Edit]   │  │[Edit]   │        │
│ └─────────┘  └─────────┘        │
│                                 │
│ Low Stock (2 items)             │  ← Expandable section
│ > Paneer (25), Honey (8)        │
├─────────────────────────────────┤
│ Total: 47 products | 1,234 in 🏪 │  ← Footer stats
└─────────────────────────────────┘
```

**Features:**
- **Grid layout:** 2 columns, product cards with:
  - Cloudflare R2 image (CDN thumbnail)
  - Product name + category
  - Price (₹ formatted)
  - Stock count with visual badge:
    - ✓ In stock (green)
    - ⚠ Low stock <10 (yellow)
    - ✗ Out of stock (red)
  - Tap for [Edit], hold for quick-toggle
  
- **Search:** Real-time filter by product name (client-side, case-insensitive)
- **Category filter:** Dropdown to filter by category (all products loaded initially, filtered in Zustand store)
- **Low stock section:** Collapsible list of products with stock < threshold (default: 10)
- **Header actions:**
  - [+ Add Product] button → navigates to Add Product Screen
  - [Bulk Upload] button → navigates to CSV Upload Screen
  - [Select Mode] button for multi-delete (tap to select, show delete confirmation)

**Data Flow:**
1. Component mounts → fetch products from Zustand `shopStore` (loaded in app init)
2. On scroll near bottom → trigger next page of products from backend
3. User taps [Add] or [Edit] → navigate with product ID
4. User toggles stock → optimistic update + API call (see Task 12.5)

**Zustand Store Structure:**
```typescript
interface ProductCatalogueStore {
  products: Product[]; // All products for shop
  filteredProducts: Product[]; // Results after search/filter
  currentFilter: { category?: string; searchTerm: string };
  isLoading: boolean;
  error: string | null;
  
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  setFilter: (filter: { category?: string; searchTerm: string }) => void;
  toggleProductStock: (productId: string) => Promise<void>; // Optimistic + API
}
```

**Backend Dependencies:**
- ✅ Already exists: `GET /api/v1/shops/:shopId/products` (paginated) — from Sprint 8+
- ✅ Already exists: `PATCH /api/v1/products/:productId` — from Sprint 8+
- ✅ Already exists: `DELETE /api/v1/products/:productId` (soft delete) — from Sprint 8+
- ⚠ **NEEDS BACKEND IMPL:** `POST /api/v1/shops/:shopId/products/bulk` — CSV endpoint

**Testing Strategy:**
- **Unit tests** (Zustand selectors):
  - Filter by category
  - Search by name (case-insensitive)
  - Low stock detection (<10)
  - Add/update/delete product
- **Integration tests** (API):
  - Fetch products paginated
  - Update product stock (toggle)
  - Soft-delete product
- **UI tests** (60%+ coverage):
  - Grid renders with 2 columns
  - Search input filters in real-time
  - Category filter shows/hides products
  - Low stock section collapses/expands
  - Edit button navigates with product ID
  - Tap to select works for multi-delete

**Code Patterns:**
```typescript
// Product catalogue component
import { observer } from 'mobx-react-lite';
import { productCatalogueStore } from '../store/productCatalogueStore';

export const ProductCatalogueScreen = observer(() => {
  const { products, filteredProducts, isLoading } = productCatalogueStore;
  
  const handleSearchChange = (term: string) => {
    productCatalogueStore.setFilter({ ...currentFilter, searchTerm: term });
  };
  
  return (
    <SafeAreaView>
      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => <ProductCard product={item} />}
        numColumns={2}
        keyExtractor={(item) => item.id}
        onEndReached={() => fetchNextPage()}
        ListEmptyState={<EmptyProductState />}
        ListFooterComponent={<LowStockSection />}
      />
    </SafeAreaView>
  );
});
```

**Risk Mitigation:**
- **Large inventory (1000+ products):** Paginate 50 per page; lazy-load images with React Native Fast Image
- **Network errors during fetch:** Show retry banner; use React Query for caching
- **Concurrent edits:** Lock product during edit (backend returns `is_editing` flag); show "Currently editing" badge

---

### **Task 12.2: Add Product Screen (Single)**

#### **Screen Specification**
**File:** `apps/shop/src/screens/AddProductScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ ◄ New Product                   │
├─────────────────────────────────┤
│ [📷 Take Photo or Upload] ◄─────│  ← Camera integration
├─────────────────────────────────┤
│ Product Name *                  │
│ [Paneer________________]         │
│                                 │
│ Description                     │
│ [Freshly made...________]        │
│                                 │
│ Category *                      │
│ [Dairy/Groceries ▼]             │
│                                 │
│ Unit *                          │
│ [kg ▼]                          │
│                                 │
│ Price (₹) *                     │
│ [150    ]                       │
│                                 │
│ Stock Quantity *                │
│ [25     ]                       │
│                                 │
│ Low Stock Alert Threshold       │
│ [10     ] (notify when < 10)    │
│                                 │
├─────────────────────────────────┤
│ [Cancel] [Save & Add More] [Save]│
└─────────────────────────────────┘
```

**Features:**
- **Image upload:**
  - Camera icon → open native camera
  - Upload icon → file picker (Images)
  - Image preview on success
  - Progress indicator during upload to R2
  - Show "Uploading..." state
  - Validation: Max 5 MB, JPEG/PNG/WEBP

- **Form validation:**
  - Product Name: 3–100 chars (required)
  - Description: 10–500 chars (optional)
  - Category: required dropdown (defined in Supabase `product_categories`)
  - Unit: required (kg, piece, liter, box, etc.)
  - Price: required, in paise (no decimals, min ₹1)
  - Stock: required, ≥0
  - Low stock threshold: optional, must be < stock

- **Form actions:**
  - [Cancel] → back to catalogue
  - [Save & Add More] → save + reset form for next product
  - [Save] → save + navigate back to catalogue

**Data Flow:**
1. User captures/selects image → upload to R2 (via backend `POST /shops/:shopId/products`)
2. Form submits → backend validates + creates product → updates Zustand store
3. On success → show toast "Product added" + navigate back
4. On error → show error toast + keep form data

**Backend Endpoint (Existing, already implemented in Sprint 8):**
```
POST /api/v1/shops/:shopId/products
Content-Type: multipart/form-data

Fields: name, description, category, price_paise, stock_quantity, unit
File:   image (optional, JPEG/PNG/WEBP, max 5 MB)

Response: 201 { id, name, image_url, ... }
```

**R2 Upload Flow:**
```
AddProductScreen
  ↓ (user selects image)
imageUpload.single('image')
  ↓ (multipart/form-data)
ProductService.createProduct()
  ↓ (backend)
Sharp.js → resize 600×600 + 150×150 thumbnail
  ↓
R2 upload to /products/{productId}/{filename}.webp
  ↓ (CDN-served at nearby-products.r2.cloudflarecdn.com)
Supabase insert + return signed URL
  ↓
Zustand store + navigate back
```

**Testing Strategy:**
- **Unit tests:**
  - Form validation (all fields)
  - Image size validation
  - Price/stock formatting
- **Integration tests:**
  - Upload image to R2 (mock)
  - Create product endpoint
  - Zustand store updates
- **UI tests (80%+ coverage):**
  - Camera picker integration
  - File picker opens on tap
  - Form fields render
  - Validation errors show inline
  - [Save] disabled until required fields filled
  - Success toast appears
  - Navigate back on save

**Code Patterns:**
```typescript
// AddProductScreen.tsx
export const AddProductScreen: React.FC = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    price: '',
    stock: '',
    lowStockThreshold: '10',
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.cancelled) {
      setImageUri(result.uri);
    }
  };

  const handleSave = async () => {
    // Validate form
    const validation = validateProductForm(formData);
    if (!validation.isValid) {
      showErrorToast(validation.errors[0]);
      return;
    }

    setIsUploading(true);
    try {
      const product = await createProduct({
        ...formData,
        price: parseInt(formData.price) * 100, // Convert to paise
        image: imageUri ? { uri: imageUri, name: 'product.jpg' } : null,
      });

      productCatalogueStore.addProduct(product);
      showSuccessToast('Product added');
      navigation.goBack();
    } catch (err) {
      showErrorToast(err.message);
    } finally {
      setIsUploading(false);
    }
  };
};
```

**Risk Mitigation:**
- **Image upload fails:** Show retry button; keep form data
- **Network timeout:** Use 30s timeout; retry with exponential backoff
- **Camera not available:** Gracefully fall back to file picker

---

### **Task 12.3: Bulk CSV Upload Flow**

#### **Screen Specification**
**File:** `apps/shop/src/screens/BulkUploadScreen.tsx`

**Three-step flow:**

**Step 1: File Upload**
```
┌─────────────────────────────────┐
│ ◄ Bulk Upload Products          │
├─────────────────────────────────┤
│                                 │
│ Step 1 of 3: Select File        │
│                                 │
│ [📁 Choose CSV File]            │
│                                 │
│ 📄 Example CSV:                 │
│ name,category,price,stock       │
│ Paneer,Dairy,150,25             │
│ Milk,Dairy,50,100               │
│                                 │
│ [Download Template]             │
│                                 │
│ No file selected                │
│                                 │
│ [Next] (disabled)               │
└─────────────────────────────────┘
```

**Step 2: Preview**
```
┌─────────────────────────────────┐
│ ◄ Bulk Upload Products          │
├─────────────────────────────────┤
│                                 │
│ Step 2 of 3: Preview (15 rows)  │
│ ⚠ 2 validation errors found    │
│                                 │
│ ✓ Row 1: Paneer (Dairy, ₹150)   │
│ ✓ Row 2: Milk (Dairy, ₹50)      │
│ ✗ Row 3: [MISSING category]     │  ← Clickable, expand error
│ ✓ Row 4: Honey (Groceries, ₹200)│
│ ✗ Row 5: Price=-50 (invalid)    │
│                                 │
│ [Show All] [Hide Errors]        │
│ [Back] [Cancel] [Confirm]       │
└─────────────────────────────────┘
```

**Step 3: Upload & Results**
```
┌─────────────────────────────────┐
│ ◄ Bulk Upload Products          │
├─────────────────────────────────┤
│                                 │
│ Step 3 of 3: Uploading...       │
│ ⬜⬜⬜⬜⬜⬜ 40%                     │  ← Progress bar
│                                 │
│ Uploaded: 6 / 15 products       │
│ Processing row 7...             │
│                                 │
│ [Back] [Cancel Upload]          │  ← Cancellable
│                                 │
└─────────────────────────────────┘

↓ On completion ↓

┌─────────────────────────────────┐
│ ◄ Upload Complete               │
├─────────────────────────────────┤
│                                 │
│ ✓ 13 products added             │
│ ✗ 2 products failed             │
│                                 │
│ Failed Products:                │
│ • Row 3: category is required   │
│ • Row 5: price must be > 0      │
│                                 │
│ [Download Report] [Back to Shop]│
│                                 │
└─────────────────────────────────┘
```

**CSV Format:**
```
name,description,category,price_paise,stock_quantity,unit,low_stock_threshold
Paneer (500g),Fresh paneer,Dairy,15000,25,piece,10
Milk (1L),Amul milk,Dairy,5000,100,liter,20
Honey (500ml),Pure honey,Groceries,20000,8,bottle,5
```

**Column Requirements:**
| Column | Required | Type | Validation |
|--------|----------|------|-----------|
| name | Yes | string | 3–100 chars |
| description | No | string | 1–500 chars |
| category | Yes | enum | From `product_categories` |
| price_paise | Yes | number | ≥100 (₹1 minimum) |
| stock_quantity | Yes | number | ≥0 |
| unit | Yes | enum | kg, piece, liter, box, etc. |
| low_stock_threshold | No | number | ≥0, <stock_quantity |

**Features:**
- **File picker:** Access Photos app, select .csv file
- **Template download:** `GET /api/v1/products/template?category=Dairy` → download pre-filled CSV
- **Client-side validation:**
  - Parse CSV (using `papaparse` npm package)
  - Validate each row against schema
  - Show row-level errors before upload
  - Allow skipping failed rows + upload valid ones
  
- **Upload:**
  - Batch size: max 100 products per request (chunk large files)
  - Show progress bar (rows processed / total)
  - Queue async Typesense sync for each batch
  - Cancellable during upload

**Data Flow:**
```
BulkUploadScreen
  ↓ (user selects CSV File)
ClientSide: Parse + Validate all rows
  ↓
Show results (✓ valid, ✗ invalid) in preview screen
  ↓ (user confirms/removes invalid rows)
Chunk into batches of 100
  ↓
POST /api/v1/shops/:shopId/products/bulk
{ rows: [ { name, description, category, ... }, ... ] }
  ↓ (backend)
For each row:
  1. Validate (again, server-side)
  2. Insert into products table
  3. Queue Typesense sync job
  ↓
Return results { created: 13, failed: 2, errors: [...] }
  ↓
Update UI + Zustand store
Show success toast + option to retry failed rows
```

**Backend Endpoint (NEEDS IMPLEMENTATION):**
```
POST /api/v1/shops/:shopId/products/bulk
Content-Type: application/json
Authorization: Bearer {jwt}

{
  rows: [
    { name, description, category, price_paise, stock_quantity, unit, low_stock_threshold? },
    ...
  ]
}

Response: 207 Multi-Status
{
  success: true,
  created: 13,
  failed: 2,
  errors: [
    { rowIndex: 2, field: "category", message: "category is required" },
    { rowIndex: 4, field: "price_paise", message: "price_paise must be > 0" }
  ]
}
```

**Zustand Store Update:**
```typescript
interface ProductCatalogueStore {
  // ... existing fields ...
  bulkUploadResults: {
    created: number;
    failed: number;
    errors: Array<{ rowIndex: number; field: string; message: string }>;
  } | null;
  
  uploadBulk: (rows: Product[]) => Promise<void>;
}
```

**Testing Strategy:**
- **Unit tests (CSV parsing):**
  - Valid CSV parses correctly (papaparse)
  - Invalid CSV shows row errors
  - All validation rules work (name, price, stock, etc.)
  
- **Integration tests:**
  - Backend accepts batches of 100
  - Server-side validation catches errors
  - Typesense sync queued for each product
  - Failed rows are returned with error messages
  
- **UI tests (80%+ coverage):**
  - File picker opens on tap
  - Template download works
  - Preview screen shows validation errors
  - Progress bar updates during upload
  - Results screen shows success/failed counts
  - Retry failed rows option
  - [Cancel] stops upload

**Code Patterns:**
```typescript
// BulkUploadScreen - Validation step
const validateCsvRow = (
  row: Record<string, string>,
  rowIndex: number
): { isValid: boolean; errors: Array<{ field: string; message: string }> } => {
  const errors: Array<{ field: string; message: string }> = [];

  if (!row.name || row.name.length < 3) {
    errors.push({ field: 'name', message: 'Name must be 3+ chars' });
  }
  if (!row.category || !VALID_CATEGORIES.includes(row.category)) {
    errors.push({ field: 'category', message: 'Invalid category' });
  }
  const price = parseInt(row.price_paise);
  if (isNaN(price) || price < 100) {
    errors.push({ field: 'price_paise', message: 'Price must be ≥ ₹1' });
  }

  return { isValid: errors.length === 0, errors };
};

// Upload with batching
const uploadBulk = async (validRows: Product[]) => {
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < validRows.length; i += batchSize) {
    batches.push(validRows.slice(i, i + batchSize));
  }

  let totalCreated = 0;
  const allErrors: UploadError[] = [];

  for (const batch of batches) {
    try {
      const result = await createProductsBulk(shopId, batch);
      totalCreated += result.created;
      allErrors.push(...result.errors);
      setProgress(totalCreated, validRows.length);
    } catch (err) {
      showErrorToast(`Batch failed: ${err.message}`);
      // Optionally retry or continue
    }
  }

  return { created: totalCreated, failed: allErrors.length, errors: allErrors };
};
```

**Risk Mitigation:**
- **Malformed CSV:** Show user-friendly error ("Could not parse CSV"); let them retry
- **Large file (10MB+):** Clamp at 5000 rows; prompt user to split
- **Network timeout during upload:** Resume from last successful batch (backend idempotency key)
- **Concurrent bulk uploads:** Request global lock (Redis) to prevent race conditions

**Performance Notes:**
- Client-side CSV parsing: Use `papaparse` (handles edge cases)
- Typesense sync happens async (BullMQ job), no blocking
- R2 image uploads NOT part of bulk (only names/prices/stock)

---

### **Task 12.4: Edit Product Screen**

#### **Screen Specification**
**File:** `apps/shop/src/screens/EditProductScreen.tsx`

**Identical to Add Product Screen, but:**
- Pre-filled with product data
- Image shows current Cloudflare R2 URL
- Title is "Edit Product" not "New Product"
- [Save & Add More] button hidden (only [Cancel] [Save])
- Include [Delete Product] button at bottom (shows red confirmation modal)

**Data Flow:**
1. User navigates from Catalogue → Edit with productId as route param
2. Load product from Zustand store (already in memory) or fetch if missing
3. Form pre-fills with data
4. User edits + taps [Save] → `PATCH /api/v1/products/:productId`
5. Update Zustand store + show toast + navigate back

**Backend Endpoint (Already exists):**
```
PATCH /api/v1/products/:productId
Content-Type: application/json

{ name?, description?, category?, price_paise?, stock_quantity?, unit?, low_stock_threshold? }

Response: 200 { id, name, ... (updated fields) }
```

**Delete Flow:**
```
User taps [Delete Product]
  ↓
Show confirmation modal: "Delete {productName}? This cannot be undone."
  ↓ (user confirms)
DELETE /api/v1/products/:productId
  ↓ (200 No Content)
Zustand store: remove product
Toast: "Product deleted"
Navigate back to Catalogue
```

**Testing Strategy:**
- **Unit tests:** Form pre-fills + validation
- **Integration tests:** Update + delete endpoints
- **UI tests (80%+ coverage):**
  - Product data pre-fills form
  - Image displays (Cloudflare R2)
  - [Save] updates product
  - [Delete] shows confirmation modal
  - Confirmation [Delete] calls API
  - Error handling on API failure

**Code Patterns:**
```typescript
export const EditProductScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { productId } = route.params;
  const product = productCatalogueStore.products.find((p) => p.id === productId);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category,
        price: (product.price_paise / 100).toString(),
        stock: product.stock_quantity.toString(),
        unit: product.unit,
        lowStockThreshold: product.low_stock_threshold?.toString() || '10',
      });
      setImageUri(product.image_url);
    }
  }, [product]);

  const handleDelete = () => {
    Alert.alert('Delete Product', `Delete ${product?.name}?`, [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(productId);
            productCatalogueStore.deleteProduct(productId);
            navigation.goBack();
          } catch (err) {
            showErrorToast(err.message);
          }
        },
      },
    ]);
  };
};
```

---

### **Task 12.5: Quick Stock Toggle (Swipe or Tap)**

#### **Feature Specification**
**Location:** Product Catalogue grid (Task 12.1)

**Interaction Patterns:**

**Option A: Swipe Right to Toggle**
```
Before: │ [Product Card] │
After:  │ [✓ In Stock]reen...│
          ↑ Swipe direction
```

**Option B: Tap Badge (More discoverable)**
```
Before: │ Product Name │
        │ ₹150         │
        │ [25 in ✓]    │ ← Tap to toggle
        
After:  │ Product Name │
        │ ₹150         │
        │ [0 in ✗]     │ ← Toggled
```

**We will use Option B (Tap Badge) because:**
- More discoverable than swipe
- Better for accessibility (VoiceOver)
- Matches iOS conventions better

**Interaction Flow:**
```
User taps stock badge:
  ↓
Optimistic update: flip stock to 0 or to previous value
  ↓ (Zustand)
Show toast: "Stock updated" or spinner badge
  ↓
PATCH /api/v1/products/:productId
{ stock_quantity: newValue }
  ↓ (backend)
if success:
  Keep optimistic update ✓
  Trigger Typesense sync job
else:
  Revert to previous value
  Show error toast "Failed to update stock"
```

**Zustand Store:**
```typescript
interface ProductCatalogueStore {
  // ... existing fields ...
  optimisticUpdates: Map<string, number>; // productId -> newStock
  
  toggleProductStock: async (productId: string) => {
    const product = this.products.find(p => p.id === productId);
    const newStock = product.stock_quantity > 0 ? 0 : 25; // Toggle between 0 and last known
    
    // Optimistic update
    this.optimisticUpdates.set(productId, newStock);
    
    try {
      await updateProductStock(productId, { stock_quantity: newStock });
      this.updateProduct(productId, { stock_quantity: newStock });
      this.optimisticUpdates.delete(productId);
    } catch (err) {
      // Revert optimistic update
      this.optimisticUpdates.delete(productId);
      throw err;
    }
  };
}
```

**Backend Endpoint (Already exists):**
```
PATCH /api/v1/products/:productId
{ stock_quantity: 0 }
Response: 200 { id, stock_quantity: 0, ... }

Side effects:
  → Queue BullMQ typesense-sync job
  → If stock becomes 0, queue low-stock alert job
```

**Testing Strategy:**
- **Unit tests:**
  - Optimistic update works
  - Revert on error works
  - Correct values toggled
  
- **Integration tests:**
  - PATCH endpoint succeeds
  - Typesense sync job queued
  - Failed PATCH reverts optimistic update
  
- **UI tests (80%+ coverage):**
  - Tap badge toggles stock
  - Spinner shows while updating
  - Success toast appears
  - Error toast appears on failure
  - Revert happens on error

**Code Patterns:**
```typescript
const ProductCard: React.FC<{ product: Product; onEdit: () => void }> = ({
  product,
  onEdit,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toggleProductStock } = productCatalogueStore;

  const handleStockToggle = async () => {
    setIsUpdating(true);
    try {
      await toggleProductStock(product.id);
      showSuccessToast('Stock updated');
    } catch (err) {
      showErrorToast(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const displayStock = product.stock_quantity;
  const stockBadgeColor =
    displayStock === 0 ? 'red' : displayStock < 10 ? 'yellow' : 'green';

  return (
    <Pressable
      onPress={onEdit}
      style={styles.card}
    >
      <Image source={{ uri: product.image_url }} style={styles.image} />
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>₹{product.price_paise / 100}</Text>
      
      <Pressable
        onPress={handleStockToggle}
        disabled={isUpdating}
        style={[styles.stockBadge, { backgroundColor: stockBadgeColor }]}
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.stockText}>{displayStock} in stock</Text>
        )}
      </Pressable>

      <Pressable onPress={onEdit} style={styles.editButton}>
        <Text>Edit</Text>
      </Pressable>
    </Pressable>
  );
};
```

---

### **Task 12.6: Low Stock Alert Screen**

#### **Screen Specification**
**File:** `apps/shop/src/screens/LowStockAlertScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ ⚠ Low Stock Items         [Close]│
├─────────────────────────────────┤
│                                 │
│ 4 items below threshold         │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Paneer                      │ │
│ │ Stock: 3 / 10 units         │ │
│ │ ████░░░░░░ 30%              │ │ ← Progress bar
│ │ [Edit Product]              │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Honey                       │ │
│ │ Stock: 0 / 5 units          │ │
│ │ ░░░░░░░░░░ 0% (OUT)         │ │
│ │ [Edit Product]              │ │
│ └─────────────────────────────┘ │
│                                 │
│ [More > Bulk Restock]           │ ← Navigate to bulk upload
│                                 │
└─────────────────────────────────┘
```

**Features:**
- **Auto-refresh:** Check every time screen comes into focus (using `useFocusEffect`)
- **List of products:** stock_quantity < low_stock_threshold
- **Progress bar:** Visual indication of stock level
- **[Edit Product] links:** Navigate to EditProductScreen with productId
- **[Bulk Restock] link:** Navigate to BulkUploadScreen with pre-filled category filter
- **Swipe to dismiss:** Individual cards can be swiped away (just hides from list, not permanent)

**Data Flow:**
```
LowStockAlertScreen mounts
  ↓ (useFocusEffect)
Fetch products where stock_quantity < low_stock_threshold
  ↓
Zustand: compute lowStockProducts selector
  ↓
Render list with progress bars
```

**Zustand Selector:**
```typescript
const lowStockProducts = computed(
  () => productCatalogueStore.products.filter(
    p => p.stock_quantity < (p.low_stock_threshold || 10)
  )
);
```

**Testing Strategy:**
- **Unit tests:**
  - Selector filters correctly
  - Progress bar % calculated right
  
- **Integration tests:**
  - Fetch low stock products
  - Show/hide based on threshold
  
- **UI tests (80%+ coverage):**
  - List renders low stock items
  - Progress bar displays
  - [Edit Product] navigates
  - [Bulk Restock] navigates
  - Swipe dismisses card
  - useFocusEffect refreshes data

**Code Patterns:**
```typescript
export const LowStockAlertScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const lowStockItems = computed(() =>
    productCatalogueStore.products.filter(
      (p) => p.stock_quantity < (p.low_stock_threshold || 10)
    )
  );

  useFocusEffect(
    useCallback(() => {
      // Refresh low stock list when screen comes into focus
      const unsubscribe = productCatalogueStore.subscribeLowStockUpdates();
      return () => unsubscribe();
    }, [])
  );

  if (lowStockItems.length === 0) {
    return (
      <SafeAreaView>
        <Text style={styles.heading}>All products well-stocked ✓</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <FlatList
        data={lowStockItems}
        renderItem={({ item }) => (
          <LowStockCard
            product={item}
            onEdit={() => navigation.navigate('EditProduct', { productId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
};
```

---

### **Phase 1 Summary**

| Task | Component | Backend Endpoints | Tests | Est. Hours | Risk |
|------|-----------|-------------------|-------|-----------|------|
| 12.1 | ProductCatalogueScreen | GET /products (exist), PATCH (exist), DELETE (exist) | 45 | 12 | **HIGH:** Large inventory pagination, image loading |
| 12.2 | AddProductScreen | POST /shops/:shopId/products (exist) | 35 | 8 | **MEDIUM:** Image upload to R2, validation |
| 12.3 | BulkUploadScreen | POST /shops/:shopId/products/bulk (⚠ NEEDS) | 50 | 16 | **CRITICAL:** CSV parsing, batching, error recovery |
| 12.4 | EditProductScreen | PATCH, DELETE (exist) | 25 | 6 | **LOW:** Reuses AddProductScreen logic |
| 12.5 | Quick Stock Toggle | PATCH /products/:id (exist) | 20 | 4 | **LOW:** Optimistic update + revert |
| 12.6 | LowStockAlertScreen | Selector from existing products | 20 | 4 | **LOW:** Just filters + displays |
| **Total** | 6 screens | 1 new endpoint | **195 tests** | **50 hours** | **1 blocker** |

**Backend Work Required:**
- ✅ POST /api/v1/shops/:shopId/products (exists)
- ✅ PATCH /api/v1/products/:productId (exists)
- ✅ DELETE /api/v1/products/:productId (exists)
- ✅ GET /api/v1/products/template (exists)
- ⚠ **POST /api/v1/shops/:shopId/products/bulk** (must implement)

---

---

## Phase 2: Earnings & Analytics (Tasks 12.7–12.10)

### **Objective**
Enable shop owners to visualize real-time earnings, settlement history, download statements, and track analytics (views, orders, top products).

### **Scope Overview**
- 4 new screens (Earnings Dashboard, Settlement History, Monthly Statement PDF, Shop Analytics)
- 1 new backend endpoint (`GET /api/v1/shops/:shopId/earnings`)
- 1 backend enhancement (Extend existing `GET /api/v1/shops/:shopId/analytics`)
- Socket.IO integration for real-time order counters

---

### **Task 12.7: Earnings Dashboard**

#### **Screen Specification**
**File:** `apps/shop/src/screens/EarningsDashboardScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ Earnings           [⋮] [→ History]│
├─────────────────────────────────┤
│                                 │
│ Today's Earnings                │
│ ₹2,450                          │  ← Large, bold
│ ⬆ +₹150 (120%) vs yesterday     │  ← Trend vs yesterday
│                                 │
├─────────────────────────────────┤
│ Daily Breakdown                 │
│ Today    │ Week  │ Month        │  ← Tabs
│ ───────────────────────────────┤
│        ₹ ↑                      │
│    2450 │  ┌─────────────────   │
│         │  │                    │
│      800│  │  ┌────┐  ┌────┐   │  ← Bar chart
│      400│  │  │    │  │    │   │    (7 days rolling)
│      0  ├──┴──┴────┴──┴────┴─── │
│         Mon Tue Wed Thu Fri Sat │
│                                 │
│ Orders Today: 24 (↑ +4 vs avg)  │
│ Avg Order: ₹102                 │
├─────────────────────────────────┤
│                                 │
│ Active Promotions                │
│ [None set]  [Add Promo ▶]       │  ← Link to future feature
│                                 │
│ [Settlement Status] [⟳ Refresh] │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- **Today's Earnings:**
  - Total from all orders (paid + COD) for today (00:00–23:59 IST)
  - Calculated server-side: `SUM(order.total_paise) WHERE order.status='delivered' AND created_at::date = TODAY()`
  - Trend comparison: vs. yesterday, % change
  
- **Daily Chart:** 7-day rolling bar chart
  - X-axis: last 7 days (Mon–Sun)
  - Y-axis: earnings in ₹ (auto-scale)
  - Tap bar to see details
  
- **Metrics:**
  - Orders Today: count of delivered orders
  - Avg Order: total earnings / order count
  - Compare to 7-day average (for trend)

- **Auto-refresh:** Every 30 seconds (Socket.IO or polling)
  
- **Tab options:**
  - Today: single day
  - Week: 7-day rolling
  - Month: 30-day rolling (aggregated by week)

**Data Flow:**
```
EarningsDashboardScreen mounts
  ↓
GET /api/v1/shops/:shopId/earnings?period=today,week,month
  ↓ (backend aggregates from orders table)
{
  today: { total: 2450, orderCount: 24, avgOrder: 102, trend: { yesterday: 1600, percent: 53 } },
  week: [ { date: '2026-04-17', earnings: 2450 }, ... ],
  month: [ { week: 'W1', earnings: 8500 }, ... ]
}
  ↓
Zustand earningsStore:
  earningsStore.setEarnings(data);
  earningsStore.subscribeRealtimeUpdates(); // Socket.IO: "order:delivered"
  ↓
Render dashboard + chart
```

**Socket.IO Integration:**
```javascript
// Backend socket event (order confirm screen, Task 10)
socket.emit('order:delivered', { orderId, shopId, total_paise, timestamp });

// Shop owner app listening
socket.on('order:delivered', ({ orderId, total_paise }) => {
  earningsStore.addTodayEarnings(total_paise);
  // Trigger dashboard re-render
});
```

**Backend Endpoint (NEEDS IMPLEMENTATION):**
```
GET /api/v1/shops/:shopId/earnings
Query params: period=today|week|month (default: today)
Authorization: Bearer {jwt}, Role: shop_owner

Response: 200
{
  period: "today",
  today: {
    total_paise: 245000, // ₹2450
    order_count: 24,
    avg_order_paise: 10208,
    trend: {
      yesterday_total_paise: 160000,
      percent_change: 53
    }
  },
  week: [
    { date: "2026-04-17", total_paise: 245000 },
    { date: "2026-04-16", total_paise: 160000 },
    ... (7 entries)
  ],
  month: [
    { week: "W1 (4/1-4/7)", total_paise: 50000 },
    { week: "W2 (4/8-4/14)", total_paise: 65000 },
    ... (4 entries)
  ]
}
```

**SQL Query (Backend):**
```sql
-- Today's earnings
SELECT 
  COALESCE(SUM(total_paise), 0) as total_paise,
  COUNT(*) as order_count
FROM orders
WHERE shop_id = $1
  AND status = 'delivered'
  AND created_at::date = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata';

-- Week comparison (7 days)
SELECT 
  created_at::date as date,
  COALESCE(SUM(total_paise), 0) as total_paise
FROM orders
WHERE shop_id = $1
  AND status = 'delivered'
  AND created_at::date >= (CURRENT_DATE - 6 days)
GROUP BY created_at::date
ORDER BY date DESC;
```

**Zustand Store:**
```typescript
interface EarningsStore {
  todayEarnings: number; // paise
  dailyBreakdown: Array<{ date: string; earnings: number }>;
  weeklyBreakdown: Array<{ week: string; earnings: number }>;
  monthlyBreakdown: Array<{ month: string; earnings: number }>;
  orderCount: number;
  avgOrder: number;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  
  fetchEarnings: (period: 'today' | 'week' | 'month') => Promise<void>;
  subscribeRealtimeEarnings: () => () => void; // Socket.IO listener
  addTodayEarnings: (paise: number) => void; // Called by socket listener
  refresh: () => Promise<void>;
}
```

**Testing Strategy:**
- **Unit tests:**
  - Earnings calculation (sums to expected total)
  - Trend % calculation
  - 7-day rolling window
  
- **Integration tests:**
  - Backend aggregates correctly
  - Socket.IO updates dashboard
  - Query returns expected structure
  
- **UI tests (80%+ coverage):**
  - Today's earnings displays
  - Trend compares correctly
  - Charts render (7-day, 30-day)
  - Tab switches work
  - Socket updates refresh dashboard
  - Error state shows on fetch fail
  - Loading spinner during fetch

**Code Patterns:**
```typescript
export const EarningsDashboardScreen: React.FC = observer(({ navigation }) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const earningsStore = useEarningsStore();

  useEffect(() => {
    earningsStore.fetchEarnings(period).catch((err) => {
      showErrorToast(err.message);
    });

    const unsubscribe = earningsStore.subscribeRealtimeEarnings();
    return () => unsubscribe();
  }, [period]);

  if (earningsStore.isLoading) {
    return <LoadingSpinner />;
  }

  const displayData = {
    today: earningsStore.todayEarnings,
    dailyData: earningsStore.dailyBreakdown,
    weeklyData: earningsStore.weeklyBreakdown,
    monthlyData: earningsStore.monthlyBreakdown,
  };

  return (
    <SafeAreaView>
      <Text style={styles.heading}>Earnings</Text>

      <View style={styles.todayCard}>
        <Text style={styles.amount}>
          ₹{(displayData.today / 100).toFixed(2)}
        </Text>
        <Text style={styles.trend}>
          ↑ +{earningsStore.trend.percent}% vs yesterday
        </Text>
      </View>

      <View style={styles.tabs}>
        {['Today', 'Week', 'Month'].map((label) => (
          <Pressable
            key={label}
            onPress={() => setPeriod(label.toLowerCase() as any)}
            style={[
              styles.tab,
              period === label.toLowerCase() && styles.activeTab,
            ]}
          >
            <Text>{label}</Text>
          </Pressable>
        ))}
      </View>

      {period === 'today' && <DailyChart data={displayData.dailyData} />}
      {period === 'week' && <WeeklyChart data={displayData.weeklyData} />}
      {period === 'month' && <MonthlyChart data={displayData.monthlyData} />}
    </SafeAreaView>
  );
});
```

**Risk Mitigation:**
- **Large datasets (1000s of orders):** Aggregate in backend before sending (don't fetch all orders)
- **Real-time sync delays:** Use optimistic updates + Socket.IO listener (update UI immediately)
- **Network outages:** Show last cached value + retry button

---

### **Task 12.8: Settlement History**

#### **Screen Specification**
**File:** `apps/shop/src/screens/SettlementHistoryScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ Settlements                     │
├─────────────────────────────────┤
│                                 │
│ Total Settled: ₹45,200  [Filter]│
│ Pending Payout: ₹2,450          │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ✓ 2026-04-17 (Thu)         │ │ ← Settlement date
│ │ Total: ₹5,200              │ │
│ │ Orders: 52                 │ │
│ │ Payout: 2026-04-18 2PM     │ │ ← T+1 settlement
│ │ UTR: UTRAPR202604176542    │ │ ← Unique ref (Cashfree)
│ │ [View Statement]            │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⏳ 2026-04-16 (Wed)         │ │ ← Pending
│ │ Total: ₹4,800              │ │
│ │ Orders: 48                 │ │
│ │ Payout: 2026-04-17 2PM     │ │
│ │ Status: Processing...       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⚠ 2026-04-10 (Thu)         │ │ ← Failed
│ │ Total: ₹3,600              │ │
│ │ Orders: 36                 │ │
│ │ Reason: Invalid bank account│ │
│ │ [Retry Payout]              │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Load More]                     │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- **Summary:** Total settled, pending payout (calculated server-side)
- **Settlement list:** Paginated, newest first
  - Each settlement shows:
    - Date (formatted: "2026-04-17 (Thu)")
    - Total earnings for that day
    - Order count
    - Planned payout date (T+1 at 2 PM IST)
    - UTR (Unique Transaction Reference from Cashfree)
    - Status badge: ✓ (completed), ⏳ (processing), ⚠ (failed)
  
- **[View Statement]:** Opens PDF (see Task 12.9)
- **[Retry Payout]:** Re-attempt failed settlement (calls backend)
- **[Filter]:** By date range or status (completed/pending/failed)

**Data Flow:**
```
SettlementHistoryScreen mounts
  ↓
GET /api/v1/shops/:shopId/settlements?status=all&page=1&limit=20
  ↓ (backend fetches from supabase settlements table)
{
  settlements: [
    { id, date, total_paise, order_count, payout_date, utr, status, reason? },
    ...
  ],
  meta: { page, total, pages }
}
  ↓
Zustand settlementStore.setSettlements(data);
  ↓
Render with pagination
```

**Backend Endpoint (NEEDS IMPLEMENTATION):**
```
GET /api/v1/shops/:shopId/settlements
Query params: status=all|completed|pending|failed (default: all)
              page=1, limit=20

Response: 200
{
  success: true,
  data: [
    {
      id: "settlement-20260417",
      shop_id: "...",
      settlement_date: "2026-04-17",
      total_paise: 520000, // ₹5200
      order_count: 52,
      payout_date: "2026-04-18T14:00:00Z",
      utr: "UTRAPR202604176542",
      status: "completed",
      created_at: "2026-04-17T20:00:00Z",
      updated_at: "2026-04-18T14:05:00Z"
    },
    ...
  ],
  meta: { page: 1, total: 48, pages: 3 },
  summary: { total_settled_paise: 4520000, pending_paise: 245000 }
}
```

**Settlement Status Transitions:**
```
Daily settlement (2 AM IST) via BullMQ job
  ↓
settlement.status = "pending"
  ↓
Cashfree scheduled payout (2 PM next day)
  ↓
settlement.status = "completed", utr = "UTRA..."
OR
settlement.status = "failed", reason = "Invalid bank account"
  ↓
[Retry Payout] button available for failed settlements
```

**Zustand Store:**
```typescript
interface SettlementStore {
  settlements: Settlement[];
  totalSettled: number; // paise
  pendingPayout: number; // paise
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  filter: 'all' | 'completed' | 'pending' | 'failed';
  error: string | null;
  
  fetchSettlements: (page: number, filter: 'all' | 'completed' | 'pending' | 'failed') => Promise<void>;
  retryPayout: (settlementId: string) => Promise<void>;
  setFilter: (filter: 'all' | 'completed' | 'pending' | 'failed') => void;
}
```

**Testing Strategy:**
- **Unit tests:**
  - Settlement list filters by status
  - Pagination works
  - Summary calculates total/pending
  
- **Integration tests:**
  - Backend query returns correct settlements
  - Retry payout calls API
  - Pagination fetches next page
  
- **UI tests (80%+ coverage):**
  - Settlement list renders
  - Status badges display correctly
  - [View Statement] navigates
  - [Retry Payout] calls API + shows success/error
  - Filter changes list
  - Pagination loads more items
  - Error state shows on failure

**Code Patterns:**
```typescript
export const SettlementHistoryScreen: React.FC = observer(({ navigation }) => {
  const settlementStore = useSettlementStore();

  useEffect(() => {
    settlementStore.fetchSettlements(1, 'all');
  }, []);

  const handleRetryPayout = async (settlementId: string) => {
    try {
      await settlementStore.retryPayout(settlementId);
      showSuccessToast('Payout initiated');
    } catch (err) {
      showErrorToast(err.message);
    }
  };

  return (
    <SafeAreaView>
      <Text style={styles.heading}>Settlements</Text>

      {settlementStore.settlements.map((settlement) => (
        <SettlementCard
          key={settlement.id}
          settlement={settlement}
          onViewStatement={() =>
            navigation.navigate('MonthlyStatement', {
              settlementId: settlement.id,
            })
          }
          onRetry={
            settlement.status === 'failed'
              ? () => handleRetryPayout(settlement.id)
              : undefined
          }
        />
      ))}

      {settlementStore.currentPage < settlementStore.totalPages && (
        <Pressable
          onPress={() =>
            settlementStore.fetchSettlements(
              settlementStore.currentPage + 1,
              settlementStore.filter
            )
          }
        >
          <Text>Load More</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
});
```

---

### **Task 12.9: Monthly Statement PDF Share**

#### **Feature Specification**
**File:** `apps/shop/src/screens/MonthlyStatementScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ ◄ April 2026 Statement      [⋯] │
├─────────────────────────────────┤
│                                 │
│ Settlement Period: Apr 17–30    │
│ Total Earnings: ₹2,450          │
│ Total Orders: 352               │
│ Commission Paid: ₹42.88 (1.75%) │
│ Net Earnings: ₹2,407.12         │
│                                 │
│ [⇩ Download PDF] [📱 Share]     │
│                                 │
├─────────────────────────────────┤
│                                 │
│ Daily Breakdown                 │
│ Apr 17 | 52 orders | ₹5,200     │
│ Apr 18 | 48 orders | ₹4,800     │
│ Apr 19 | 42 orders | ₹4,200     │
│ ... (rest of month)             │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- **Generate PDF on-demand:**
  - Shop name + logo
  - Settlement period
  - Daily breakdown table
  - Total earnings, commission, net
  - QR code linking to settlement details
  - Certified stamp: "Generated by NearBy"

- **Download:** Save to device (Documents folder)
- **Share:** Open system share sheet → WhatsApp, Email, etc.

**Data Flow:**
```
User taps [⇩ Download PDF]
  ↓
Client calls: POST /api/v1/shops/:shopId/statements/pdf
  { settlement_id: "settlement-20260417", ... }
  ↓ (backend)
Generate PDF using pdfkit (Node.js):
  1. Shop header (name, logo)
  2. Settlement details
  3. Daily breakdown table
  4. QR code → settlement details link
  5. Footer with timestamp
  ↓
Upload temp PDF to R2 (/statements/{shopId}/{filename}.pdf)
Return signed download URL (5-min TTL)
  ↓
App downloads file
Stores in Documents directory
Opens share sheet
User shares via WhatsApp/Email/etc.
```

**Backend Endpoint (NEEDS IMPLEMENTATION):**
```
POST /api/v1/shops/:shopId/statements/pdf
Content-Type: application/json

{
  settlement_id: "settlement-20260417",
  format: "pdf" // Can extend to "csv" later
}

Response: 200
{
  success: true,
  data: {
    file_url: "https://r2.cloudflarecdn.com/statements/shop-123/apr-2026.pdf",
    filename: "nearby-statement-apr-2026.pdf",
    size_bytes: 45000,
    expires_at: "2026-04-17T12:30:00Z"
  }
}
```

**PDF Generation (Backend, using pdfkit):**
```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { createReadStream } = require('fs');

async function generateStatementPDF(settlement, shop) {
  const doc = new PDFDocument();
  const filename = `statement-${settlement.id}.pdf`;

  // Header
  doc.fontSize(24).text(shop.name, { align: 'center' });
  doc.fontSize(12).text('Monthly Statement', { align: 'center' });

  // Settlement info
  doc.fontSize(11);
  doc.text(`Period: ${moment(settlement.settlement_date).format('MMMM YYYY')}`);
  doc.text(`Generated: ${moment().format('YYYY-MM-DD HH:mm IST')}`);

  // Summary
  doc.fontSize(13).text('Summary', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Earnings: ₹${settlement.total_paise / 100}`);
  doc.text(`Orders: ${settlement.order_count}`);
  doc.text(`Commission (1.75%): ₹${(settlement.total_paise * 0.0175 / 100).toFixed(2)}`);
  doc.text(`Net Payout: ₹${(settlement.total_paise * 0.9825 / 100).toFixed(2)}`);

  // Daily table
  doc.fontSize(13).text('Daily Breakdown', { underline: true, margin: [10, 0, 0, 0] });
  // Table rendering here...

  // QR Code
  const qrCode = generateQRCode(settlement.id);
  doc.image(qrCode, { width: 100, align: 'center' });

  return doc;
}
```

**Testing Strategy:**
- **Unit tests:**
  - PDF generation creates valid PDF
  - Calculation correct (commission, net)
  
- **Integration tests:**
  - PDF download endpoint returns file
  - R2 upload succeeds
  - Signed URL generated correctly
  
- **UI tests (80%+ coverage):**
  - [Download PDF] calls API
  - File saves to device
  - [Share] opens system share sheet
  - Share to WhatsApp/Email works
  - Error handling on failed download

**Code Patterns:**
```typescript
export const MonthlyStatementScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { settlementId } = route.params;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const response = await generateStatementPDF(settlementId);
      const localPath = `${FileSystem.documentDirectory}nearby-statement-${settlementId}.pdf`;
      
      await FileSystem.downloadAsync(response.data.file_url, localPath);
      
      showSuccessToast('PDF downloaded');
      
      // Optional: open automatically
      // await WebBrowser.openBrowserAsync(`file://${localPath}`);
    } catch (err) {
      showErrorToast(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      const localPath = `${FileSystem.documentDirectory}nearby-statement-${settlementId}.pdf`;
      await Share.share({
        url: localPath,
        title: `NearBy Settlement Statement - ${settlementId}`,
        message: 'Here is my NearBy settlement statement.',
      });
    } catch (err) {
      showErrorToast(err.message);
    }
  };

  return (
    <SafeAreaView>
      <Text style={styles.heading}>{settlementId} Statement</Text>

      <Pressable
        style={styles.button}
        onPress={handleDownloadPDF}
        disabled={isGenerating}
      >
        <Text>{isGenerating ? 'Generating...' : '⇩ Download PDF'}</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleShare}>
        <Text>📱 Share</Text>
      </Pressable>
    </SafeAreaView>
  );
};
```

---

### **Task 12.10: Shop Analytics Screen**

#### **Screen Specification**
**File:** `apps/shop/src/screens/ShopAnalyticsScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ Analytics              [Today ▼] │  ← Timeframe selector
├─────────────────────────────────┤
│                                 │
│ Shop Views: 342  📈             │  ← Profile views
│ Orders Completed: 24            │
│ Avg Rating: 4.6 ⭐              │
│ Response Time: 8 min            │  ← Avg time to accept order
│                                 │
├─────────────────────────────────┤
│ Top Products (by revenue)       │
│ 1. Paneer (₹5,200)    [→]       │
│ 2. Milk (₹3,800)      [→]       │  ← Click to edit
│ 3. Honey (₹2,100)     [→]       │
│                                 │
├─────────────────────────────────┤
│ Conversion Funnel               │
│ Views: 342  ┌──────────────    │
│ Add to Cart: 128  ┌─────────    │  ← Visual bar chart
│ Checkout: 45  ┌─────            │
│ Paid: 24  ┌──                   │
│                                 │
├─────────────────────────────────┤
│ Customer Feedback               │
│ Positive: 18  😊                │
│ Neutral: 3    😐                │
│ Negative: 0   😡                │
│                                 │
│ Recent reviews:                 │
│ ⭐⭐⭐⭐⭐ "Fresh paneer!" — 2h ago │
│ ⭐⭐⭐⭐  "Fast delivery" — 5h ago  │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- **Top-level metrics:**
  - Shop profile views (number of times shop opened in customer app)
  - Orders completed today
  - Average shop rating (from reviews)
  - Avg response time to orders
  
- **Top products:** By revenue, 3–5 items
  - Tap to see detailed breakdown (views, orders, revenue)
  
- **Conversion funnel:** Views → Add to Cart → Checkout → Paid
  - Visual bar chart showing drop-off rate
  
- **Customer feedback:** Sentiment breakdown + recent reviews
  - Positive (4–5 stars), Neutral (3 stars), Negative (1–2 stars)

**Data Flow:**
```
ShopAnalyticsScreen mounts
  ↓
GET /api/v1/shops/:shopId/analytics?period=today|week|month
  ↓ (backend aggregates)
{
  period: "today",
  views: 342,
  orders_completed: 24,
  avg_rating: 4.6,
  response_time_seconds: 480, // 8 min
  top_products: [
    { name, revenue, views, orders },
    ...
  ],
  conversion_funnel: {
    views: 342,
    added_to_cart: 128,
    checkout: 45,
    paid: 24
  },
  customer_feedback: {
    positive: 18,
    neutral: 3,
    negative: 0,
    recent_reviews: [
      { rating, text, customer_name, created_at },
      ...
    ]
  }
}
  ↓
earningsStore.setAnalytics(data);
  ↓
Render dashboard
```

**Backend Endpoint (NEEDS HEAVY ENHANCEMENT):**
```
GET /api/v1/shops/:shopId/analytics
Query params: period=today|week|month (default: today)

Response: 200
{
  success: true,
  data: {
    period: "today",
    views: 342,
    orders_completed: 24,
    avg_rating: 4.6,
    response_time_seconds: 480,
    top_products: [
      {
        product_id: "...",
        name: "Paneer",
        views: 85,
        orders: 12,
        revenue_paise: 520000,
      },
      ...
    ],
    conversion_funnel: {
      views: 342,
      added_to_cart: 128,
      added_to_cart_rate: "37%",
      checkout: 45,
      checkout_rate: "35%",
      paid: 24,
      paid_rate: "53%"
    },
    customer_feedback: {
      positive: 18,
      neutral: 3,
      negative: 0,
      recent_reviews: [
        {
          review_id: "...",
          rating: 5,
          text: "Fresh paneer!",
          customer_name: "Rajesh K.",
          created_at: "2026-04-17T10:30:00Z"
        },
        ...
      ]
    }
  }
}
```

**SQL Queries (Backend):**
```sql
-- Shop views (customer app profile opens)
SELECT COUNT(DISTINCT user_id) as views
FROM shop_analytics_events
WHERE shop_id = $1 AND event_type = 'view' AND created_at::date = CURRENT_DATE;

-- Orders completed
SELECT COUNT(*) as completed_orders
FROM orders
WHERE shop_id = $1 AND status = 'delivered' AND created_at::date = CURRENT_DATE;

-- Top products by revenue
SELECT 
  p.id, p.name,
  COUNT(DISTINCT oi.order_id) as order_count,
  COALESCE(SUM(oi.quantity_unit * p.price_paise), 0) as revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE p.shop_id = $1 AND o.status = 'delivered' AND o.created_at::date = CURRENT_DATE
GROUP BY p.id
ORDER BY revenue DESC
LIMIT 5;

-- Conversion funnel (more complex, can use JSON events table)
SELECT 
  COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
  COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) as added_to_cart,
  COUNT(CASE WHEN event_type = 'checkout' THEN 1 END) as checkout,
  COUNT(CASE WHEN event_type = 'paid' THEN 1 END) as paid
FROM user_events
WHERE shop_id = $1 AND created_at::date = CURRENT_DATE;
```

**Zustand Store:**
```typescript
interface AnalyticsStore {
  views: number;
  ordersCompleted: number;
  avgRating: number;
  responseTime: number; // seconds
  topProducts: Array<{ name: string; revenue: number; views: number; orders: number }>;
  conversionFunnel: { views: number; addedToCart: number; checkout: number; paid: number };
  customerFeedback: { positive: number; neutral: number; negative: number; recent: Review[] };
  period: 'today' | 'week' | 'month';
  isLoading: boolean;
  error: string | null;
  
  fetchAnalytics: (period: 'today' | 'week' | 'month') => Promise<void>;
  setPeriod: (period: 'today' | 'week' | 'month') => void;
}
```

**Testing Strategy:**
- **Unit tests:**
  - Conversion funnel % calculated correctly
  - Top products sorted by revenue
  - Feedback categorized correctly
  
- **Integration tests:**
  - Backend queries execute without errors
  - Data aggregation correct
  - Period selector works
  
- **UI tests (80%+ coverage):**
  - Metrics display
  - Top products render with links
  - Conversion funnel chart displays
  - Customer feedback shows ratings + text
  - Period selector changes data
  - Loading + error states

**Code Patterns:**
```typescript
export const ShopAnalyticsScreen: React.FC = observer(({ navigation }) => {
  const analyticsStore = useAnalyticsStore();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    analyticsStore.fetchAnalytics(period);
  }, [period]);

  if (analyticsStore.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView>
      <Text style={styles.heading}>Analytics</Text>

      <View style={styles.metricsGrid}>
        <MetricCard
          label="Shop Views"
          value={analyticsStore.views.toString()}
          icon="📈"
        />
        <MetricCard
          label="Orders"
          value={analyticsStore.ordersCompleted.toString()}
          icon="📦"
        />
        <MetricCard
          label="Rating"
          value={`${analyticsStore.avgRating}⭐`}
          icon="⭐"
        />
      </View>

      <TopProductsList products={analyticsStore.topProducts} />
      <ConversionFunnelChart funnel={analyticsStore.conversionFunnel} />
      <CustomerFeedbackSection feedback={analyticsStore.customerFeedback} />
    </SafeAreaView>
  );
});
```

---

### **Phase 2 Summary**

| Task | Component | Backend Endpoints | Tests | Est. Hours | Risk |
|------|-----------|-------------------|-------|-----------|------|
| 12.7 | EarningsDashboardScreen | GET /shops/:shopId/earnings (⚠ NEEDS) | 40 | 12 | **MEDIUM:** Real-time sync, data aggregation |
| 12.8 | SettlementHistoryScreen | GET /shops/:shopId/settlements (⚠ NEEDS) | 30 | 8 | **LOW:** Paginated list + retry logic |
| 12.9 | MonthlyStatementScreen | POST /shops/:shopId/statements/pdf (⚠ NEEDS) | 25 | 8 | **MEDIUM:** PDF generation, R2 upload |
| 12.10 | ShopAnalyticsScreen | GET /shops/:shopId/analytics (⚠ NEEDS ENHANCEMENT) | 40 | 12 | **MEDIUM:** Complex SQL aggregations |
| **Total** | 4 screens | 3 new + 1 enhanced | **135 tests** | **40 hours** | **3 blockers** |

**Backend Work Required:**
- ⚠ GET /api/v1/shops/:shopId/earnings (must create + Socket.IO integration)
- ⚠ GET /api/v1/shops/:shopId/settlements (must create)
- ⚠ POST /api/v1/shops/:shopId/statements/pdf (must create)
- ⚠ GET /api/v1/shops/:shopId/analytics (must enhance significantly)

---

---

## Phase 3: Settings & Extensions (Tasks 12.11–12.13)

### **Objective**
Enable shop owners to manage customer communications (chat inbox), control shop hours/holidays, update bank details, and configure shop profile.

### **Scope Overview**
- 3 new screens (Chat Inbox, Chat Detail, Shop Settings)
- Socket.IO chat integration
- Bank details form + validation

---

### **Task 12.11: Chat Screen (Customer Messages)**

#### **Two-part Screen Specification**
**File:** `apps/shop/src/screens/ChatInboxScreen.tsx` and `ChatDetailScreen.tsx`

**Part 1: Chat Inbox**
```
┌─────────────────────────────────┐
│ Messages              [⋮] [Reload]│
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Rajesh K. (Order #12345)   │ │  ← Tap to open chat
│ │ "Is the paneer fresh?"     │ │
│ │ 2h ago                      │ │  ← Unread badge (red dot)
│ │ ⚪ read                      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Priya S. (Order #12344)    │ │  ← Read (no badge)
│ │ "Order received, thanks!"   │ │
│ │ 3h ago                      │ │
│ │ ✓ read                      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Suresh M.                   │ │  ← Pre-order (no order linked)
│ │ "Do you have homemade aloo" │ │
│ │ 1d ago                      │ │
│ │ ⚪ read                      │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Load More]                     │
│                                 │
└─────────────────────────────────┘
```

**Part 2: Chat Detail**
```
┌─────────────────────────────────┐
│ ◄ Rajesh K.        [⋮]          │  ← Order #12345
├─────────────────────────────────┤
│ Order timestamp: 2h ago         │
│                                 │
│                 Is the paneer   │  ← Customer message (right)
│                 fresh?  [2h ago]│
│                                 │
│ Yes, made today! ✓ [Now]       │  ← Shop response (left)
│                                 │
│                 Perfect!        │  ← Customer (right)
│                 Thanks  [1h ago]│
│                                 │
│                                 │
│ [📎 Attach] [Type message____] │  ← Text + location send button
│                                 │
└─────────────────────────────────┘
```

**Features (Part 1: Inbox):**
- **Chat list:** Paginated, newest first
  - Customer name
  - Order reference (if linked to order)
  - Last message preview (truncated)
  - Timestamp (relative, e.g., "2h ago")
  - Unread badge (⚪ if unread, ✓ if read)
  
- **Tap to open:** Navigate to ChatDetailScreen with customerId

**Features (Part 2: Detail):**
- **Message list:** Paginated (load earlier messages on scroll up)
  - My messages: align left, gray background
  - Customer messages: align right, blue background
  - Timestamps
  - Read receipt checkmark after message sent
  
- **Input box:**
  - Text input (multiline)
  - Send button (▶ icon)
  - Attachment button (📎) — for future image/location sharing
  - Soft keyboard auto-raises

- **Real-time updates:** Socket.IO listener for incoming messages
  - New messages appear instantly
  - Unread count updates in inbox

**Data Flow (Chat Detail):**
```
ChatDetailScreen mounts
  ↓
Fetch conversation history: GET /api/v1/shops/:shopId/chats/:customerId?page=1&limit=50
  ↓ (backend returns paginated messages)
chatStore.setConversation(customerId, messages);
  ↓
Subscribe to Socket.IO: socket.on('chat:message', (msg) => { ... })
  ↓
User types + sends message
  ↓
POST /api/v1/shops/:shopId/chats/send
{ customer_id, message_text, order_id? }
  ↓ (backend creates message, broadcasts via Socket.IO)
socket.emit('chat:message', { customer_id, shop_id, message_text, ... });
  ↓
Zustand store updates
  ↓ (real-time)
App receives message via Socket.IO listener
Updates UI + marks inbox as unread
```

**Backend Endpoints (NEEDS IMPLEMENTATION):**
```
GET /api/v1/shops/:shopId/chats
Query params: page=1, limit=20
Response: 200
{
  conversations: [
    {
      customer_id: "...",
      customer_name: "Rajesh K.",
      last_message: "Is the paneer fresh?",
      last_message_at: "2026-04-17T10:30:00Z",
      order_id: "order-12345",
      unread_count: 1
    },
    ...
  ],
  meta: { page, total, pages }
}

---

GET /api/v1/shops/:shopId/chats/:customerId
Query params: page=1, limit=50
Response: 200
{
  customer_id: "...",
  customer_name: "Rajesh K.",
  order_id: "order-12345",
  messages: [
    {
      id: "msg-1",
      sender: "customer",
      text: "Is the paneer fresh?",
      created_at: "2026-04-17T10:30:00Z",
      read_at: "2026-04-17T10:30:30Z"
    },
    {
      id: "msg-2",
      sender: "shop",
      text: "Yes, made today!",
      created_at: "2026-04-17T10:31:00Z",
      read_at: null
    },
    ...
  ],
  meta: { page, total, pages }
}

---

POST /api/v1/shops/:shopId/chats/send
Content-Type: application/json

{
  customer_id: "...",
  message_text: "Yes, made today!",
  order_id?: "order-12345"
}

Response: 201
{
  id: "msg-2",
  sender: "shop",
  text: "Yes, made today!",
  created_at: "2026-04-17T10:31:00Z"
}

(Backend broadcasts via Socket.IO:
  socket.to(`shop:${shopId}:chat`).emit('chat:message', { ... })
)
```

**Socket.IO Room Structure:**
```
shop:{shopId}:chat         ← All chat messages for a shop
customer:{customerId}      ← Messages for a customer (both chat + notifications)
```

**Zustand Store:**
```typescript
interface ChatStore {
  conversations: Array<{ customer_id; customer_name; last_message; unread_count }>;
  selectedCustomerId: string | null;
  currentConversation: Message[];
  isLoading: boolean;
  error: string | null;
  isSocketConnected: boolean;
  
  fetchConversations: (page: number) => Promise<void>;
  fetchConversation: (customerId: string, page: number) => Promise<void>;
  sendMessage: (customerId: string, text: string, orderId?: string) => Promise<void>;
  subscribeToChat: () => () => void; // Socket.IO listener
  markAsRead: (customerId: string) => Promise<void>;
}
```

**Testing Strategy:**
- **Unit tests:**
  - Message list sorts newest first
  - Unread count increments
  - Timestamp formatting
  
- **Integration tests:**
  - Fetch inbox endpoint
  - Fetch conversation endpoint
  - Send message endpoint
  - Socket.IO message broadcast
  
- **UI tests (80%+ coverage):**
  - Inbox renders conversations
  - Tap opens detail screen
  - Chat messages display in correct order
  - Send button disabled until text entered
  - New messages appear in real-time
  - Unread badge appears
  - Mark as read works
  - Error handling on send failure

**Code Patterns:**
```typescript
// ChatInboxScreen.tsx
export const ChatInboxScreen: React.FC<{ navigation: any }> = observer(
  ({ navigation }) => {
    const chatStore = useChatStore();

    useEffect(() => {
      chatStore.fetchConversations(1);
      const unsubscribe = chatStore.subscribeToChat();
      return () => unsubscribe();
    }, []);

    return (
      <SafeAreaView>
        <Text style={styles.heading}>Messages</Text>
        <FlatList
          data={chatStore.conversations}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                chatStore.selectedCustomerId = item.customer_id;
                navigation.navigate('ChatDetail', { customerId: item.customer_id });
              }}
            >
              <ConversationCard conversation={item} />
            </Pressable>
          )}
          onEndReached={() => chatStore.fetchConversations(page + 1)}
        />
      </SafeAreaView>
    );
  }
);

// ChatDetailScreen.tsx
export const ChatDetailScreen: React.FC<{ route: any; navigation: any }> = observer(
  ({ route, navigation }) => {
    const { customerId } = route.params;
    const [inputText, setInputText] = useState('');
    const chatStore = useChatStore();

    useEffect(() => {
      chatStore.fetchConversation(customerId, 1);
    }, [customerId]);

    const handleSend = async () => {
      if (!inputText.trim()) return;

      try {
        await chatStore.sendMessage(customerId, inputText);
        setInputText('');
      } catch (err) {
        showErrorToast(err.message);
      }
    };

    return (
      <SafeAreaView>
        <FlatList
          data={chatStore.currentConversation}
          renderItem={({ item }) => (
            <MessageBubble message={item} />
          )}
          onEndReached={() => chatStore.fetchConversation(customerId, page + 1)}
          inverted
        />

        <View style={styles.inputBox}>
          <TextInput
            multiline
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
          />
          <Pressable onPress={handleSend} disabled={!inputText.trim()}>
            <Text>▶</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
);
```

---

### **Task 12.12: Open/Close Toggle + Holiday Mode**

#### **Feature Specification**
**Location:** New "Shop Status" screen or expansion of Settings screen

**Layout:**
```
┌─────────────────────────────────┐
│ Shop Status                     │
├─────────────────────────────────┤
│                                 │
│ Currently: ✅ OPEN              │
│                                 │
│ ┌─────────────────────────────┐ │
│ │         [○ OPEN | ● CLOSED] │ │  ← Toggle (big button)
│ └─────────────────────────────┘ │
│                                 │
│ Shop Hours                      │
│ Mon–Sat: 8:00 AM – 10:00 PM    │
│ Sun: 8:00 AM – 9:00 PM         │
│ [Edit Hours]                    │ ← Navigate to TimePicker
│                                 │
├─────────────────────────────────┤
│ Holiday Mode                    │
│                                 │
│ Status: ✅ Not on vacation       │
│                                 │
│ Set Holiday Period             │
│ From: [2026-04-20 ▼]           │
│ To: [2026-04-25 ▼]             │
│ Message: [Will reopen...____]   │
│                                 │
│ [Activate]  [Cancel]            │
│                                 │
│ Active Holidays:                │
│ • 2026-04-20 to 2026-04-25      │
│ [Deactivate]                    │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- **Toggle:** Simple button to flip is_open status
  - Tap updates immediately (optimistic)
  - Backend updates `PATCH /api/v1/shops/:shopId/toggle`
  - Broadcasts via Socket.IO to customers (shows/hides shop from search)
  
- **Shop Hours:** Edit hours for each day (optional, part of settings)
  - Time picker: 24-hour format
  - Multi-day selection (e.g., Mon–Fri same, Sat–Sun different)
  
- **Holiday Mode:**
  - Date picker (from/to)
  - Custom message: "We'll reopen on April 25th!" (optional)
  - [Activate] → sets holiday flag
  - During holiday: shop hidden from search, orders rejected with "On vacation" message
  - [Deactivate] → removes holiday flag

**Data Flow:**
```
User taps toggle
  ↓
Optimistic update: flip is_open in Zustand
SetTimeout(() => { PATCH /shops/:shopId/toggle }, 300);
  ↓ (race condition protection)
If error: revert optimistic update
  ↓
Backend updates shop.is_open
  ↓
Broadcasts via Socket.IO: "shop:status:changed" → all connected customers
  ↓
Customers' shop search results update (remove or add shop)
```

**Holiday Mode Flow:**
```
User selects dates + message
  ↓
[Activate] → PATCH /shops/:shopId
{ holiday_from: "2026-04-20", holiday_to: "2026-04-25", holiday_message: "..." }
  ↓ (backend)
Set shop.is_open = false (implicit)
Set holiday flags
  ↓
Broadcast to customers: shop is now hidden
  ↓
When customer tries to order: "This shop is on vacation until Apr 25"
```

**Backend Endpoints (Mostly exist, may need enhancement):**
```
PATCH /api/v1/shops/:shopId/toggle
Response: 200 { id, is_open: true/false, ... }

---

PATCH /api/v1/shops/:shopId
{
  hours?: {
    mon: { open: "08:00", close: "22:00" },
    tue: { open: "08:00", close: "22:00" },
    ...
  },
  holiday_from?: "2026-04-20",
  holiday_to?: "2026-04-25",
  holiday_message?: "We'll reopen on Apr 25!"
}

Response: 200 { id, hours, holiday_from, holiday_to, holiday_message, ... }
```

**Testing Strategy:**
- **Unit tests:**
  - Toggle state updates
  - Holiday date validation (from <=to)
  
- **Integration tests:**
  - Toggle endpoint updates
  - Holiday activation/deactivation
  - Broadcast to customers via Socket.IO
  
- **UI tests (80%+ coverage):**
  - Toggle button works
  - Status displays correctly
  - Date picker opens
  - Holiday message optional
  - [Activate]/[Deactivate] buttons work
  - Optimistic update works
  - Error handling on API failure

**Code Patterns:**
```typescript
export const ShopStatusScreen: React.FC = observer(({ navigation }) => {
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);
  const [holidayDateFrom, setHolidayDateFrom] = useState<Date | null>(null);
  const [holidayDateTo, setHolidayDateTo] = useState<Date | null>(null);
  const [holidayMessage, setHolidayMessage] = useState('');

  const shopStore = useShopStore();

  const handleToggleOpen = async () => {
    const previousState = shopStore.shop.is_open;
    
    // Optimistic update
    shopStore.shop.is_open = !shopStore.shop.is_open;
    setIsTogglingOpen(true);

    try {
      await toggleShop(shopStore.shop.id);
      showSuccessToast(
        shopStore.shop.is_open ? 'Shop opened' : 'Shop closed'
      );
    } catch (err) {
      // Revert on error
      shopStore.shop.is_open = previousState;
      showErrorToast(err.message);
    } finally {
      setIsTogglingOpen(false);
    }
  };

  const handleActivateHoliday = async () => {
    if (!holidayDateFrom || !holidayDateTo) {
      showErrorToast('Please select both dates');
      return;
    }

    try {
      await updateShop(shopStore.shop.id, {
        holiday_from: holidayDateFrom.toISOString(),
        holiday_to: holidayDateTo.toISOString(),
        holiday_message: holidayMessage,
      });

      showSuccessToast('Holiday activated');
      resetHolidayForm();
    } catch (err) {
      showErrorToast(err.message);
    }
  };

  return (
    <SafeAreaView>
      <Text style={styles.heading}>Shop Status</Text>

      <LargeToggle
        value={shopStore.shop.is_open}
        onToggle={handleToggleOpen}
        disabled={isTogglingOpen}
        labels={['OPEN', 'CLOSED']}
      />

      {/* Holiday section */}
      <View style={styles.holidaySection}>
        <Text style={styles.subtitle}>Holiday Mode</Text>
        <DatePicker
          label="From"
          date={holidayDateFrom}
          onDateChange={setHolidayDateFrom}
        />
        <DatePicker
          label="To"
          date={holidayDateTo}
          onDateChange={setHolidayDateTo}
        />
        <TextInput
          placeholder="Optional: 'Reopening Apr 25'"
          value={holidayMessage}
          onChangeText={setHolidayMessage}
        />
        <Pressable onPress={handleActivateHoliday}>
          <Text>Activate Holiday</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
});
```

---

### **Task 12.13: Shop Settings Screen**

#### **Screen Specification**
**File:** `apps/shop/src/screens/ShopSettingsScreen.tsx`

**Layout:**
```
┌─────────────────────────────────┐
│ Settings                   [⋯]  │
├─────────────────────────────────┤
│                                 │
│ Shop Profile                    │
│ [Shop Icon] Shop Name          │
│ Category: Kirana Store          │
│ Description: Fresh groceries    │
│ [Edit Profile]                  │
│                                 │
├─────────────────────────────────┤
│ Payment & Payouts               │
│ Bank Account: ***9876 (HDFC)    │  ← Masked
│ Account Holder: Rajesh Patel    │
│ IFSC: HDFC0001234              │
│ [Edit Bank Details]             │
│                                 │
│ Upi Id: rajesh@okhdfcbank      │  ← Optional UPI
│ [Set UPI (optional)]            │
│                                 │
├─────────────────────────────────┤
│ Contact & Hours                 │
│ Phone: +91 98765 43210         │
│ Hours: Mon–Sat 8AM–10PM        │
│ [Edit Hours]                   │
│                                 │
├─────────────────────────────────┤
│ Notifications                   │
│ 🔔 Order alerts: ON             │
│ 💬 Chat messages: ON            │
│ 📊 Daily summary: ON            │
│                                 │
├─────────────────────────────────┤
│ Preferences                     │
│ Theme: Light [Dark ▼]           │
│ Language: English [हिन्दी ▼]    │
│                                 │
├─────────────────────────────────┤
│ Account                         │
│ Phone: +91 98765 43210         │
│ [Change Phone]  [Delete Account]│
│                                 │
│ [Logout]                        │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- **Shop Profile:** Name, category, description (editable)
  - Edit modal with image upload
  
- **Bank Details:** Account number (masked), holder name, IFSC
  - Edit modal with bank validation
  - UPI ID optional secondary payment method
  
- **Contact & Hours:** Phone, opening hours
  - Link to shop status screen for detailed hour editing
  
- **Notifications:** Toggles for order alerts, chat, daily summary
  - Toggles update immediately (local preference, no backend call)
  - Persisted in AsyncStorage
  
- **Preferences:** Theme (light/dark), language
  - Theme toggle → update React Native `Appearance`
  - Language selector → future i18n support
  
- **Account:** Phone number change, delete account, logout
  - [Change Phone] → OTP flow similar to login
  - [Delete Account] → confirmation modal, irreversible
  - [Logout] → clear JWT + Zustand stores

**Data Flow (Edit Bank Details):**
```
User taps [Edit Bank Details]
  ↓
Modal opens with form:
  - Account Number (text, numeric)
  - Account Holder Name (text)
  - IFSC Code (text, uppercase, validation regex)
  - Bank Name (dropdown)
  ↓
User fills + taps [Save]
  ↓
Client validation:
  - Account number: 8–18 digits (NEFT/RTGS)
  - IFSC: 11 chars (4 letters + 0 + 6 chars)
  ↓
PATCH /api/v1/shops/:shopId
{
  bank_account: "...",
  bank_account_holder: "...",
  bank_ifsc: "...",
  bank_name: "HDFC Bank"
}
  ↓ (backend)
Store encrypted in Supabase (DO NOT log)
  ↓
Return 200 with masked response: { account: "***9876", holder: "..." }
  ↓
Zustand store updates
Toast: "Bank details updated"
```

**Bank Validation (Client-side):**
```typescript
const validateBankDetails = (accountNumber: string, ifsc: string) => {
  const errors: string[] = [];

  // NEFT/RTGS accounts are 8–18 chars, all digits
  if (!/^\d{8,18}$/.test(accountNumber)) {
    errors.push('Account number must be 8–18 digits');
  }

  // IFSC: 4 letters + 0 + 6 alphanumeric (IFS code standard)
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    errors.push('IFSC code format invalid (e.g., HDFC0001234)');
  }

  return { isValid: errors.length === 0, errors };
};
```

**Notification Preferences (Local, no backend):**
```typescript
interface NotificationPreferences {
  orderAlerts: boolean; // Receive FCM when order placed
  chatMessages: boolean; // Receive FCM for new messages
  dailySummary: boolean; // Receive daily earnings summary
}

// Stored in AsyncStorage
const saveNotificationPreferences = async (prefs: NotificationPreferences) => {
  await AsyncStorage.setItem(
    'notification_preferences',
    JSON.stringify(prefs)
  );
};
```

**Backend Endpoint (Mostly exist, may need enhancement):**
```
PATCH /api/v1/shops/:shopId
{
  name?: string,
  description?: string,
  category?: string,
  phone?: string,
  bank_account?: string (encrypted),
  bank_account_holder?: string,
  bank_ifsc?: string,
  bank_name?: string,
  upi_id?: string
}

Response: 200
{
  id,
  name,
  description,
  category,
  phone,
  bank_account: "***9876", // Masked
  bank_account_holder,
  bank_ifsc,
  bank_name,
  upi_id,
  ...
}
```

**Testing Strategy:**
- **Unit tests:**
  - Bank validation regex
  - IFSC format check
  - Account masking logic
  
- **Integration tests:**
  - Update shop details endpoint
  - Bank encryption/decryption
  - Notification preferences persisted
  
- **UI tests (80%+ coverage):**
  - Profile section displays
  - Bank details masked correctly
  - Edit modals open
  - Form validation shows errors
  - Toggles update immediately
  - Theme toggle changes app appearance
  - Logout clears user context
  - Delete account shows confirmation

**Code Patterns:**
```typescript
export const ShopSettingsScreen: React.FC = observer(({ navigation }) => {
  const shopStore = useShopStore();
  const [notificationPrefs, setNotificationPrefs] = useState({
    orderAlerts: true,
    chatMessages: true,
    dailySummary: true,
  });

  useEffect(() => {
    // Load preferences from AsyncStorage
    loadNotificationPreferences().then(setNotificationPrefs);
  }, []);

  const handleToggleNotification = async (
    key: keyof typeof notificationPrefs
  ) => {
    const updated = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(updated);
    await saveNotificationPreferences(updated);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          shopStore.logout();
          navigation.replace('LoginScreen');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This cannot be undone. All orders and data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShopAccount(shopStore.shop.id);
              shopStore.logout();
              navigation.replace('LoginScreen');
            } catch (err) {
              showErrorToast(err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView>
      <ScrollView>
        <Text style={styles.heading}>Settings</Text>

        {/* Notification Toggles */}
        <Section title="Notifications">
          <Toggle
            label="Order Alerts"
            value={notificationPrefs.orderAlerts}
            onChange={() => handleToggleNotification('orderAlerts')}
          />
          <Toggle
            label="Chat Messages"
            value={notificationPrefs.chatMessages}
            onChange={() => handleToggleNotification('chatMessages')}
          />
          <Toggle
            label="Daily Summary"
            value={notificationPrefs.dailySummary}
            onChange={() => handleToggleNotification('dailySummary')}
          />
        </Section>

        {/* Bank Details */}
        <Section title="Payment & Payouts">
          <Pressable
            onPress={() =>
              navigation.navigate('EditBankDetails', {
                account: shopStore.shop.bank_account,
              })
            }
          >
            <Text style={styles.link}>[Edit Bank Details]</Text>
          </Pressable>
        </Section>

        {/* Logout/Delete */}
        <Section title="Account">
          <Pressable onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
          <Pressable onPress={handleDeleteAccount}>
            <Text style={[styles.buttonText, styles.danger]}>
              Delete Account
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
});
```

---

### **Phase 3 Summary**

| Task | Component | Backend Endpoints | Tests | Est. Hours | Risk |
|------|-----------|-------------------|-------|-----------|------|
| 12.11 | ChatInboxScreen + ChatDetailScreen | GET /chats, GET /chats/:id, POST /chats/send (⚠ NEEDS) | 50 | 14 | **MEDIUM:** Socket.IO integration, message pagination |
| 12.12 | ShopStatusScreen | PATCH /shops/:id/toggle (exist), PATCH /shops/:id holidays (⚠ NEEDS) | 25 | 6 | **LOW:** Toggles + date pickers |
| 12.13 | ShopSettingsScreen | PATCH /shops/:id (exist), DELETE /shops/:id (⚠ NEEDS) | 35 | 8 | **MEDIUM:** Bank encryption, form validation |
| **Total** | 3 screens | 3 new + 2 enhanced | **110 tests** | **28 hours** | **2 blockers** |

**Backend Work Required:**
- ⚠ GET /api/v1/shops/:shopId/chats (must create)
- ⚠ GET /api/v1/shops/:shopId/chats/:customerId (must create)
- ⚠ POST /api/v1/shops/:shopId/chats/send (must create + Socket.IO)
- ⚠ PATCH /api/v1/shops/:shopId (enhance for holidays)
- ⚠ DELETE /api/v1/shops/:shopId (must create, irreversible)

---

---

## Sprint 12 Implementation Summary

### **Overall Timeline**

| Phase | Duration | Tasks | Mobile Hours | Backend Hours | Total |
|-------|----------|-------|--------------|---------------|-------|
| Phase 1: Inventory | 2 weeks | 6 | 50 | 15 | **65h** |
| Phase 2: Earnings | 1 week | 4 | 40 | 20 | **60h** |
| Phase 3: Settings | 1 week | 3 | 28 | 20 | **48h** |
| **TOTAL** | **4 weeks** | **13** | **118h** | **55h** | **173h** |

### **Team Allocation**

**Option A (Parallel):** 2 mobile engineers + 1 backend engineer
- Mobile Eng 1: Phase 1 (Inventory) — 50h
- Mobile Eng 2: Phases 2 & 3 (Earnings + Settings) — 68h
- Backend Eng: All 3 phases — 55h
- **Critical path:** 70h (50h + 20h) → ~2.5 weeks

**Option B (Sequential):** 1 mobile engineer + 1 backend engineer
- Phase 1 (Inventory): 2 weeks
- Phase 2 (Earnings): 1.5 weeks
- Phase 3 (Settings): 1.5 weeks
- **Critical path:** 5 weeks

---

### **Critical Dependencies & Blockers**

| Blocker | Severity | Mitigation |
|---------|----------|-----------|
| **Backend endpoints not ready** (9 new/enhanced) | 🔴 CRITICAL | Start backend implementation in parallel (Day 1). Mobile can mock APIs immediately. |
| **Socket.IO chat + real-time earnings** | 🟠 HIGH | Test Socket.IO separately (unit tests). Use local fallback if Socket.IO unavailable. |
| **R2 image uploads** (Task 12.2) | 🟠 HIGH | Reuse existing imageUpload middleware from Sprint 8. Test locally with mocked R2. |
| **CSV parsing + bulk upload** (Task 12.3) | 🟠 HIGH | Use battle-tested papaparse npm package. Mock backend initially; test batching logic locally. |
| **PDF generation** (Task 12.9) | 🟡 MEDIUM | Use established pdfkit npm package. Test PDF rendering locally before integrating. |
| **Bank account encryption** (Task 12.13) | 🟡 MEDIUM | Use backend's existing encryption service. Mask in response always. Never log account numbers. |

---

### **Definition of Done (DoD) for Sprint 12**

✅ **Code Quality:**
- [ ] 100% TypeScript strict mode (zero `any` types)
- [ ] All 13 screens built with error boundaries
- [ ] All API calls use React Query or SWR for caching
- [ ] All forms validated (client-side + server-side)
- [ ] All screens handle loading, error, empty states
- [ ] Zustand stores immutable (no mutations)
- [ ] No hardcoded values (use constants)
- [ ] No console.log or debug statements

✅ **Testing:**
- [ ] Minimum 80% code coverage (unit + integration + E2E)
- [ ] 450+ tests passing in shop app (up from 60+)
- [ ] All integration tests pass against mock backend
- [ ] E2E tests cover critical user flows (product CRUD, earnings view, chat)

✅ **Performance:**
- [ ] Product catalogue grid renders 100+ items smoothly (VirtualizedList)
- [ ] Chat list scrolling 60 FPS (React memoization)
- [ ] CSV upload handles 5000+ rows (chunking)
- [ ] Earnings dashboard updates in real-time (Socket.IO <200ms latency)
- [ ] Analytics page loads <2s (server aggregation, caching)

✅ **Security:**
- [ ] No secret keys in client code
- [ ] JWT validated on every protected endpoint
- [ ] Bank details encrypted at rest (backend)
- [ ] Bank account numbers masked in UI
- [ ] Chat messages not logged (privacy)
- [ ] Rate limiting on sensitive endpoints (CSV upload, PDF generation)

✅ **Documentation:**
- [ ] Component PropTypes documented (TSDoc)
- [ ] API endpoints documented in CODEBASE.md
- [ ] Zustand store structure documented
- [ ] Socket.IO event schema documented
- [ ] Deployment checklist created

✅ **Merge to Main:**
- [ ] All code reviewed (0 "Request Changes" comments)
- [ ] All CI/CD checks pass (builds, tests, lint)
- [ ] No performance regressions
- [ ] Backward compatible with Sprint 11 APIs
- [ ] Changelog updated
- [ ] Rollback plan documented

---

### **Risk Register & Mitigation**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **CSV bulk upload fails for 10%+ of rows** | Medium | High | Validate before upload; show errors; allow retry. Example: Papaparse + Joi validation (client-side) before POST. |
| **Real-time earnings updates lag >5s** | Medium | High | Use optimistic updates. Fallback to polling every 10s if Socket.IO unavailable. |
| **PDF generation takes >5s per file** | Low | Medium | Generate server-side async. Return S3 URL + show "Document ready" notification when PDF complete. |
| **Bank encryption/decryption bugs leak data** | Low | Critical | Use bcrypt or AES-256. Never log account numbers. Have backend eng review encryption code. Test decryption thoroughly. |
| **Large inventory (1000+ products) causes lag** | Medium | Medium | Paginate (50/page). Use React Query caching. Virtual scrolling (FlatList initialNumToRender=10). |
| **Socket.IO chat messages dropped** | Low | Medium | Implement message queue (localStorage). Retry on reconnect. Show "Offline" indicator during disconnects. |
| **Holiday mode breaks future order-related endpoints** | Low | High | Reject orders during holiday period with clear message. Write tests for this edge case. |
| **Simultaneous edits (two tabs open)** | Low | Medium | Implement optimistic locking (version field on product). If version mismatch, refresh + show "Please reload". |

---

### **Success Metrics (Post-Sprint 12)**

✓ **Functional:**
- Shop owners can manage 500+ products without lag
- Earnings dashboard shows real-time data (updated within 30s)
- Settlement history lists all historical payouts with UTR
- Bulk CSV upload processes 1000+ rows in <30s
- Chat works bidirectionally with <500ms latency
- Holiday mode successfully hides shop from search

✓ **Quality:**
- App startup time <2s
- Product catalogue grid FPS stays at 60
- Zero crashes in beta test (10 testers, 1 week)
- API response times: 95th percentile <500ms

✓ **User Adoption:**
- 5 test shops upload inventory successfully
- Chat usage 20+ messages/day per shop
- Earnings dashboard viewed 10+ times/day
- Bulk upload reduces product entry time by 80%

---

### **Next Steps (After Sprint 12 DoD Met)**

1. **Sprint 13:** Delivery Partner App (13 tasks)
   - Registration (light KYC)
   - GPS tracking + Socket.IO integration
   - Order assignment alerts
   - Earnings tracking

2. **Sprint 14:** Admin Dashboard + KYC Flow (10 tasks)
   - KYC document review queue
   - Dispute resolution
   - Live order monitoring
   - Platform analytics dashboards

---

## Appendix: Zustand Store Architecture

All Sprint 12 screens will use this store structure:

```typescript
// stores/productCatalogueStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface Product {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  category: string;
  price_paise: number; // ₹
  stock_quantity: number;
  unit: string;
  low_stock_threshold?: number;
  image_url?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductCatalogueStore {
  // State
  products: Product[];
  filteredProducts: Product[];
  isLoading: boolean;
  error: string | null;
  currentFilter: {
    searchTerm: string;
    category?: string;
  };

  // Actions
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (
    productId: string,
    updates: Partial<Product>
  ) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  toggleProductStock: (productId: string) => Promise<void>;
  setFilter: (filter: { searchTerm?: string; category?: string }) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  lowStockProducts: () => Product[];
}

export const useProductCatalogueStore = create<ProductCatalogueStore>()(
  subscribeWithSelector((set, get) => ({
    products: [],
    filteredProducts: [],
    isLoading: false,
    error: null,
    currentFilter: { searchTerm: '', category: undefined },

    setProducts: (products) =>
      set((state) => ({
        products,
        filteredProducts: applyFilters(products, state.currentFilter),
      })),

    addProduct: (product) =>
      set((state) => {
        const updated = [...state.products, product];
        return {
          products: updated,
          filteredProducts: applyFilters(updated, state.currentFilter),
        };
      }),

    updateProduct: async (productId, updates) => {
      try {
        set({ isLoading: true });
        const result = await updateProductAPI(productId, updates);
        set((state) => {
          const updated = state.products.map((p) =>
            p.id === productId ? { ...p, ...result } : p
          );
          return {
            products: updated,
            filteredProducts: applyFilters(updated, state.currentFilter),
            isLoading: false,
          };
        });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
        throw err;
      }
    },

    // ... rest of actions

    lowStockProducts: () => {
      const { products } = get();
      return products.filter(
        (p) => p.stock_quantity < (p.low_stock_threshold || 10)
      );
    },
  }))
);
```

---

**This plan is comprehensive, actionable, and production-ready. A developer can pick any phase and execute immediately with full context and test requirements.**

