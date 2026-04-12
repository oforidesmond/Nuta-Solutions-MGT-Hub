# NutaPOS Management Hub - Frontend Development Guide

## Project Context

You are working on the **Management Hub** for NutaPOS in this workspace - a web application where **business owners, admins, and managers** in Ghana manage their retail operations. This is NOT the point-of-sale interface (that's a separate mobile app). This is the **back-office management system** where they:

- Set up and manage their product catalog
- Monitor inventory levels and expiry dates
- Track stock movements and adjustments
- Manage staff and permissions
- View sales reports and analytics
- Configure business settings

## Target Users

**Primary Users:** Small to medium business owners in Ghana (pharmacies, retail shops, supermarkets, etc.)

**User Characteristics:**
- Not tech-savvy - need simple, intuitive interfaces
- Busy - want to accomplish tasks quickly
- Mobile-first mindset but using web for management
- Value clarity over complexity
- Need visual feedback and confirmation
- Prefer simple language over technical jargon

**Design Philosophy:**
- **"No-brainer" interactions** - buttons and actions should be self-explanatory
- **Visual hierarchy** - most important actions should stand out
- **Forgiveness** - easy to undo mistakes, confirm destructive actions
- **Progressive disclosure** - show advanced features only when needed
- **Immediate feedback** - loading states, success messages, error explanations
- **Mobile-responsive** - many will access from phones/tablets

## Technology Stack & Existing Code

**Analyze the existing codebase first:**
- Review current component patterns and naming conventions
- Identify existing UI libraries and design system
- Find reusable components (buttons, modals, tables, forms)
- Locate existing API service files and patterns
- Check authentication/authorization implementation
- Review state management approach (Context, Redux, Zustand, etc.)

**Maintain consistency:**
- Use the same styling approach (Tailwind, CSS modules, styled-components, etc.)
- Follow existing folder structure
- Reuse existing components before creating new ones
- Match existing error handling patterns
- Use established routing conventions

## Backend API Endpoints Available

### Products Module (`/products`)

**List & Search**
```
GET /products
Query params:
  - page: number (default: 1)
  - limit: number (default: 20)
  - search: string (searches name, SKU, barcode)
  - categoryId: string (UUID)
  - lowStock: boolean (show only low stock items)
  - sortBy: string (name, createdAt, stockQuantity, sellingPrice)
  - sortOrder: 'asc' | 'desc'

Response: {
  data: Product[],
  meta: { page, limit, total, totalPages }
}
```

**CRUD Operations**
```
POST   /products                    - Create product
GET    /products/:id                - Get product details (includes batches, stock history)
PATCH  /products/:id                - Update product
DELETE /products/:id                - Soft delete (Admin/Manager only)
```

**Specialized Endpoints**
```
PATCH  /products/:id/pricing        - Update pricing only
POST   /products/:id/duplicate      - Duplicate product
GET    /products/low-stock          - Get low stock alerts
GET    /products/:id/stock-history  - Get stock adjustment history
GET    /products/expiring-soon      - Get products with expiring batches
```

### Categories Module (`/categories`)

```
POST   /categories                  - Create category
GET    /categories                  - List all (includes product count)
GET    /categories/:id              - Get single category
GET    /categories/:id/products     - Get products in category
PATCH  /categories/:id              - Update category name
DELETE /categories/:id              - Delete (only if no active products)
```

### Batches Module (`/batches`)

```
POST   /batches                     - Create batch
GET    /batches                     - List batches (filter by date range, product)
GET    /batches/:id                 - Get batch details
PATCH  /batches/:id                 - Update batch
DELETE /batches/:id                 - Remove batch
GET    /batches/expiring            - Get expiring batches (configurable threshold)
GET    /batches/expired             - Get expired batches
POST   /batches/:id/remove-expired  - Mark batch expired & adjust stock
```

## Upcoming Endpoints (Phase 2-6) - Prepare UI Structure

These endpoints are NOT yet implemented but will be added. **Create placeholders/empty states** for these sections:

### Inventory Management (Phase 2)
```
POST   /inventory/adjustments       - Stock adjustments
GET    /inventory/adjustments       - List adjustments
POST   /inventory/stock-take        - Physical count
GET    /inventory/discrepancies     - Stock discrepancies
GET    /inventory/valuation         - Inventory value
```

### Staff Management (Phase 3)
```
POST   /staff                       - Create staff
GET    /staff                       - List staff
PATCH  /staff/:id                   - Update staff
DELETE /staff/:id                   - Deactivate staff
POST   /staff/:id/reset-password    - Reset password
```

### Branch Management (Phase 3)
```
POST   /branches                    - Create branch (give option to duplicate current default branch data to new branch)
GET    /branches                    - List branches
PATCH  /branches/:id                - Update branch
POST   /branches/:id/transfer-stock - Transfer stock
```

### Reports & Analytics (Phase 5)
```
GET    /reports/dashboard           - Dashboard metrics
GET    /reports/sales-trend         - Sales trends
GET    /reports/profit-loss         - P&L statement
GET    /reports/inventory-aging     - Inventory aging
GET    /reports/staff-performance   - Staff performance
```

### Organization Settings (Phase 4)
```
GET    /organization                - Get org details
PATCH  /organization                - Update org info
PATCH  /organization/tax-settings   - Tax configuration
PATCH  /organization/discount-limits - Discount thresholds
GET    /organization/plan           - Plan details
```

## Required Pages & Features

### 1. Dashboard (Landing Page after Login)

**Purpose:** Quick overview of business health (initial branch is default; only data from that branch is displayed; If owner creates multiple branches, they can switch branches to view branch specific data)

**Key Metrics to Display:**
- Total products count
- Low stock alerts (red badge if > 0)
- Items expiring soon (orange badge if > 0)
- Today's sales summary (if available from Phase 5)
- Quick action buttons

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Welcome back, [Business Name]! 👋               │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ 450  │  │  12  │  │  8   │  │ GHS  │        │
│  │Items │  │ Low  │  │Expiry│  │45.2K │        │
│  │      │  │Stock │  │Alerts│  │Value │        │
│  └──────┘  └──────┘  └──────┘  └──────┘        │
├─────────────────────────────────────────────────┤
│ Quick Actions:                                  │
│ [+ Add Product] [View Inventory] [Reports]      │
└─────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use card-based layout
- Red badges for urgent items (low stock, expired)
- Orange badges for warnings (expiring soon)
- Large, tappable buttons for quick actions
- Show loading skeletons while fetching data

### 2. Products Page (`/products`)

**Layout:** Table/Grid view with search and filters

**Features:**
1. **Search Bar** (prominent at top)
   - Placeholder: "Search by name, SKU, or barcode..."
   - Real-time search or debounced (300ms)

2. **Filters** (collapsible on mobile)
   - Category dropdown
   - Stock status: All | In Stock | Low Stock | Out of Stock
   - Price range slider
   - Clear filters button

3. **Actions Bar**
   - [+ Add New Product] button (primary, prominent)
   - [Export to Excel] button (secondary)
   - View toggle: Table | Grid

4. **Product List/Grid**
   - **Table View** (desktop): Name, SKU, Category, Stock, Price, Actions
   - **Grid View** (mobile-friendly): Card with image, name, stock badge, price
   - Color-coded stock status:
     - Green: In stock
     - Orange: Low stock (below reorder level)
     - Red: Out of stock
   - Quick actions: Edit, View Details, Duplicate, Delete

5. **Pagination**
   - Show "Showing 1-20 of 450 products"
   - Page numbers or Load More button
   - Items per page selector: 20 | 50 | 100

**Table Columns:**
| Product | SKU | Category | Stock | Cost | Price | Actions |
|---------|-----|----------|-------|------|-------|---------|
| Paracetamol 500mg | MED-001 | Medicine | 45 🟢 | GHS 0.50 | GHS 2.00 | •••

**Stock Status Indicators:**
- 🟢 45 (In stock)
- 🟠 5 (Low stock - with tooltip "Below reorder level")
- 🔴 0 (Out of stock)

**Mobile Optimization:**
```
┌─────────────────────────────┐
│ [Search box]         [Filter]│
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Paracetamol 500mg   🟠5│ │
│ │ MED-001 • Medicine      │ │
│ │ GHS 2.00                │ │
│ │ [Edit] [•••]            │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 3. Add/Edit Product Form

**Form Structure:** Multi-step or single page with sections

**Section 1: Basic Information**
```
Product Name *          [_________________________]
SKU (optional)          [_________________________] [Auto-generate]
Barcode                 [_________________________]
Category *              [Select category ▼] [+ New]
Description             [_________________________]
                        [_________________________]
```

**Section 2: Pricing**
```
Cost Price (GHS) *      [___________]
Selling Price (GHS) *   [___________]
                        Profit: GHS 1.50 (75%)
Tax Rate (%)            [___________] (default from org settings)
```

**Section 3: Inventory**
```
Initial Stock Quantity * [___________]
Reorder Level           [___________]  ⓘ Get alert when stock falls below this
Unit of Measure         [Select ▼] (e.g., pcs, boxes, bottles)
```

**Section 4: Batch & Expiry (Optional - expandable)**
```
☑ Track batches for this product

Batch Number            [___________]
Expiry Date            [Pick date 📅]
Quantity in Batch      [___________]
[+ Add another batch]
```

**Form Behavior:**
- Real-time validation with inline error messages
- Profit calculation auto-updates as prices change
- Warning if selling price < cost price
- Disable submit until required fields valid
- Show loading spinner on submit
- Success toast: "Product added successfully!" with [View Product] action
- Error handling: Clear, actionable messages

**Mobile Layout:** Stack fields vertically, larger input fields

### 4. Product Details Page (`/products/:id`)

**Layout:** Two-column (desktop) / stacked (mobile)

**Left Column: Product Info Card**
```
┌─────────────────────────────────────┐
│ Paracetamol 500mg                   │
│ SKU: MED-001 | Barcode: 123456789   │
├─────────────────────────────────────┤
│ Category: Medicine                  │
│ Stock: 45 units 🟢                  │
│ Reorder Level: 20 units             │
├─────────────────────────────────────┤
│ Cost Price:    GHS 0.50             │
│ Selling Price: GHS 2.00             │
│ Profit Margin: 75%                  │
│ Tax Rate:      0%                   │
├─────────────────────────────────────┤
│ Created: Jan 15, 2025               │
│ Last Updated: Mar 3, 2025           │
├─────────────────────────────────────┤
│ [Edit Product] [Duplicate] [Delete] │
└─────────────────────────────────────┘
```

**Right Column: Tabs**
- **Batches** - List of batches with expiry dates
- **Stock History** - Stock adjustments timeline
- **Sales Data** (future) - Sales performance

**Batches Tab:**
```
| Batch # | Quantity | Expiry Date | Status  | Actions |
|---------|----------|-------------|---------|---------|
| B001    | 20       | Dec 2025    | Active  | Edit    |
| B002    | 25       | Mar 2026    | Active  | Edit    |
```

**Stock History Tab:**
```
Timeline view:
Mar 5, 2025 - Stock Adjustment
+50 units added (SUPPLIER_ADD)
By: John Mensah
Note: New delivery from supplier

Mar 1, 2025 - Sale
-3 units sold
Receipt: #R00123
```

### 5. Categories Page (`/categories`)

**Simple List View:**
```
┌─────────────────────────────────────────┐
│ Categories                      [+ New] │
├─────────────────────────────────────────┤
│ Medicine                    (145 items) │
│ [Edit] [View Products]                  │
├─────────────────────────────────────────┤
│ Toiletries                   (89 items) │
│ [Edit] [View Products]                  │
├─────────────────────────────────────────┤
│ Food & Beverages             (67 items) │
│ [Edit] [View Products]                  │
└─────────────────────────────────────────┘
```

**Add/Edit Category Modal:**
```
┌──────────────────────────┐
│ Add New Category      [×]│
├──────────────────────────┤
│ Category Name *          │
│ [___________________]    │
│                          │
│ Description (optional)   │
│ [___________________]    │
│                          │
│     [Cancel]  [Save]     │
└──────────────────────────┘
```

**Delete Confirmation:**
```
⚠️ Cannot delete category "Medicine"
This category has 145 active products.
Move or delete products first.

[OK, Got it]
```

### 6. Batches & Expiry Management (`/batches`)

**Two Views:**
1. **All Batches** - Filterable list
2. **Expiry Alerts** - Focused view of expiring/expired items

**All Batches View:**
```
Filters: [Product ▼] [Date Range 📅] [Status ▼]

| Product | Batch # | Quantity | Expiry | Status | Actions |
|---------|---------|----------|--------|--------|---------|
| Para... | B001    | 20       | 30 days| ⚠️Alert| View    |
| Ibup... | B005    | 50       | 6 months|   ✓   | View    |
```

**Expiry Alerts View (Dashboard Widget + Dedicated Page):**
```
┌─────────────────────────────────────────┐
│ 🔴 Expired (2 items)                    │
│ Paracetamol B001 - Expired 5 days ago  │
│ [Remove from Stock]                     │
│                                         │
│ Ibuprofen B003 - Expired yesterday      │
│ [Remove from Stock]                     │
├─────────────────────────────────────────┤
│ 🟠 Expiring Soon (5 items)              │
│ Vitamin C B012 - Expires in 15 days    │
│ Antibiotic B045 - Expires in 28 days   │
│ [View All]                              │
└─────────────────────────────────────────┘
```

**Batch Details Modal:**
```
Batch B001 - Paracetamol 500mg
Expiry Date: Dec 31, 2025 (30 days)
Current Quantity: 20 units
Added: Nov 15, 2025

[Edit Quantity] [Edit Expiry] [Remove Batch]
```

### 7. Low Stock Alerts (`/inventory/alerts`)

**Alert List:**
```
12 products need restocking

| Product | Current | Reorder | Short by | Actions |
|---------|---------|---------|----------|---------|
| Para... | 8       | 20      | 12 units | Restock |
| Ibup... | 5       | 15      | 10 units | Restock |
```

**Restock Action:**
Opens form to add stock adjustment or create new batch

### 8. Inventory Adjustments (Phase 2 - Placeholder)

**Empty State:**
```
┌─────────────────────────────────────┐
│                                     │
│         📦                          │
│   Stock Adjustments                 │
│   Coming Soon                       │
│                                     │
│   Record stock additions, removals, │
│   and corrections.                  │
│                                     │
└─────────────────────────────────────┘
```

### 9. Staff Management (Phase 3 - Placeholder)

**Empty State:**
```
┌─────────────────────────────────────┐
│                                     │
│         👥                          │
│   Staff Management                  │
│   Coming Soon                       │
│                                     │
│   Manage your team members and      │
│   their permissions.                │
│                                     │
└─────────────────────────────────────┘
```

### 10. Reports (Phase 5 - Placeholder)

**Empty State with Preview:**
```
┌─────────────────────────────────────┐
│         📊 Reports & Analytics      │
│         Coming Soon                 │
│                                     │
│   You'll be able to view:           │
│   • Sales trends                    │
│   • Profit & loss statements        │
│   • Inventory reports               │
│   • Staff performance               │
└─────────────────────────────────────┘
```

### 11. Settings Page

**Organization Settings:**
```
Business Information
Name:     [______________________]
Phone:    [______________________]
Email:    [______________________]
Location: [______________________]

Tax Settings
☑ Enable tax
Default Tax Rate: [____] %

Inventory Settings
☑ Enable expiry alerts
Alert me [___] days before expiry

Discount Limits (for staff)
Max discount %: [____] %
☑ Alert me when limit exceeded

[Save Changes]
```

## UI/UX Guidelines for Ghanaian Business Owners

### Language & Terminology

**Use simple, everyday language:**
- ✅ "Add Product" NOT "Create SKU"
- ✅ "Items in stock" NOT "Inventory count"
- ✅ "Running low" NOT "Below reorder threshold"
- ✅ "Money made" NOT "Gross profit margin"
- ✅ "Expired items" NOT "Batch expiration events"

**Local Context:**
- Default currency: GHS (Ghana Cedis)
- Date format: DD/MM/YYYY (or make configurable)
- 12-hour time format (8:00 AM) preferred over 24-hour

### Color Coding System

**Status Colors (accessible):**
- 🟢 Green: Good, In Stock, Active, Success
- 🟠 Orange: Warning, Low Stock, Expiring Soon
- 🔴 Red: Critical, Out of Stock, Expired, Error
- 🔵 Blue: Information, Neutral status
- ⚪ Gray: Inactive, Disabled

**Contextual Use:**
- Stock levels: Green (healthy) → Orange (low) → Red (out)
- Actions: Blue (primary) → Gray (secondary) → Red (destructive)
- Notifications: Green (success) → Orange (warning) → Red (error)

### Button Design

**Primary Actions (most important):**
- Large, colorful buttons
- Examples: "Add Product", "Save", "Confirm"
- Color: Brand primary (blue/green)

**Secondary Actions:**
- Outlined or ghost buttons
- Examples: "Cancel", "Back", "View Details"

**Destructive Actions:**
- Red, require confirmation
- Examples: "Delete Product", "Remove Batch"
- Always show confirmation dialog

**Button Text Guidelines:**
- Use action verbs: "Add Product" not "Product Addition"
- Be specific: "Save Product" not just "Save"
- Show loading state: "Saving..." with spinner

### Form Design

**Input Fields:**
- Large touch targets (min 44px height)
- Clear labels above inputs
- Placeholder text as examples: "e.g., Paracetamol 500mg"
- Required fields marked with *
- Inline validation (real-time feedback)
- Help text below field: "This is your internal product code"

**Validation Messages:**
- ❌ "Product name is required" NOT "Field cannot be empty"
- ❌ "Price must be greater than cost" NOT "Invalid input"
- ❌ "SKU already exists" NOT "Duplicate key violation"

**Error Prevention:**
- Confirm before deleting: "Delete [Product Name]? This cannot be undone."
- Warn before expensive actions: "This will affect 45 items"
- Auto-save drafts where possible
- Undo option for non-critical actions

### Mobile Responsiveness

**Breakpoints:**
- Mobile: < 640px (single column, full-width)
- Tablet: 640px - 1024px (adaptive layout)
- Desktop: > 1024px (multi-column)

**Mobile-Specific Patterns:**
- Bottom navigation for primary tabs
- Floating action button for "Add" actions
- Swipe gestures for common actions
- Pull to refresh on lists
- Sticky headers on scroll
- Modal forms slide up from bottom

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Adequate spacing between buttons (8px minimum)
- Large input fields (48px height minimum)

### Loading States & Feedback

**Loading Indicators:**
- Skeleton screens for initial page load
- Spinners for actions (save, delete)
- Progress bars for long operations
- Optimistic updates where safe

**Success Feedback:**
- Toast messages (auto-dismiss after 4s)
- ✅ "Product added successfully!"
- ✅ "Changes saved"
- Green checkmark animation

**Error Feedback:**
- Toast or inline messages
- ❌ "Could not save product. Please check your internet connection."
- ❌ "This SKU already exists. Try MED-002 instead."
- Red error icon
- Suggest solutions when possible

### Empty States

**Make them helpful and actionable:**

```
┌─────────────────────────────────────┐
│           📦                        │
│     No products yet                 │
│                                     │
│  Get started by adding your first   │
│  product to your inventory.         │
│                                     │
│      [+ Add First Product]          │
│                                     │
│  or  [Import from Excel]            │
└─────────────────────────────────────┘
```

**Zero State with Illustration:**
- Friendly icon or illustration
- Clear explanation of what this section does
- Prominent call-to-action button
- Optional secondary action (import, tutorial)

### Navigation Structure

**Top-Level Navigation (Sidebar/Header):**
1. 🏠 Dashboard
2. 📦 Products
   - All Products
   - Categories
   - Low Stock
   - Expiring Soon
3. 📊 Inventory
   - Stock Adjustments (Phase 2)
   - Stock Take (Phase 2)
4. 👥 Staff (Phase 3)
5. 🏢 Branches (Phase 3)
6. 📈 Reports (Phase 5)
7. ⚙️ Settings

**Mobile Bottom Nav (Top 4-5 items):**
- Home, Products, Inventory, Reports, More

### Data Tables Best Practices

**Desktop Tables:**
- Sortable columns (click header)
- Fixed header on scroll
- Row actions in dropdown (•••)
- Bulk actions with checkbox selection
- Zebra striping for readability
- Hover state on rows

**Mobile Tables:**
- Convert to card layout
- Show only essential columns
- Tap card for full details
- Or use horizontal scroll with pinned first column

**Pagination:**
- Show current page clearly
- "< Previous | Next >" buttons
- Jump to page input for large datasets
- "Showing 1-20 of 450 items"

### Accessibility

**Must-haves:**
- Keyboard navigation (Tab, Enter, Esc)
- Focus indicators on interactive elements
- ARIA labels for screen readers
- Sufficient color contrast (WCAG AA minimum)
- Text alternatives for icons
- Error messages announced to screen readers

## Technical Implementation Guide

### API Integration Pattern

**Service Layer Example:**
```typescript
// services/products.service.ts
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  category?: Category;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  stockQuantity: number;
  reorderLevel?: number;
  unitOfMeasure?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class ProductService {
  private baseUrl = `${API_BASE}/products`;

  async getProducts(params: ProductQueryParams = {}): Promise<PaginatedResponse<Product>> {
    const response = await axios.get(this.baseUrl, { params });
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response = await axios.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async createProduct(data: CreateProductDto): Promise<Product> {
    const response = await axios.post(this.baseUrl, data);
    return response.data;
  }

  async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
    const response = await axios.patch(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }

  async duplicateProduct(id: string): Promise<Product> {
    const response = await axios.post(`${this.baseUrl}/${id}/duplicate`);
    return response.data;
  }

  async getLowStock(): Promise<Product[]> {
    const response = await axios.get(`${this.baseUrl}/low-stock`);
    return response.data;
  }

  async getExpiringSoon(): Promise<Product[]> {
    const response = await axios.get(`${this.baseUrl}/expiring-soon`);
    return response.data;
  }
}

export const productService = new ProductService();
```

### React Component Example (Products List)

```tsx
// components/products/ProductList.tsx
'use client';

import { useState, useEffect } from 'react';
import { productService, Product, ProductQueryParams } from '@/services/products.service';
import { ProductCard } from './ProductCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<ProductQueryParams>({
    page: 1,
    limit: 20,
    search: '',
  });

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts(filters);
      setProducts(response.data);
      setMeta(response.meta);
    } catch (error) {
      toast.error('Failed to load products. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (search: string) => {
    setFilters({ ...filters, search, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productService.deleteProduct(id);
      toast.success('Product deleted successfully');
      fetchProducts(); // Refresh list
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return <LoadingSkeleton count={6} />;
  }

  if (products.length === 0 && !filters.search) {
    return (
      <EmptyState
        icon="📦"
        title="No products yet"
        description="Get started by adding your first product to your inventory."
        action={{
          label: 'Add First Product',
          onClick: () => router.push('/products/new'),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SearchBar
        placeholder="Search by name, SKU, or barcode..."
        onSearch={handleSearch}
        value={filters.search}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <Pagination
        currentPage={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
```

### State Management Options

**Choose based on existing codebase:**

1. **React Context** (simple, built-in)
   - Good for: Auth state, theme, simple app state
   - Use if already using Context

2. **Zustand** (lightweight)
   - Good for: Medium complexity, clean API
   - Minimal boilerplate

3. **Redux Toolkit** (enterprise)
   - Good for: Complex state, large teams
   - Use if already in project

4. **TanStack Query (React Query)** (recommended for API state)
   - Excellent for: Server state management
   - Built-in caching, refetching, optimistic updates
   - Reduces boilerplate significantly

**Example with TanStack Query:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useProducts(filters: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.getProducts(filters),
  });
}

function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });
}
```

### Error Handling Pattern

```typescript
// utils/errorHandler.ts
import { AxiosError } from 'axios';

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    
    // User-friendly messages
    if (error.response?.status === 404) {
      return 'Item not found';
    }
    if (error.response?.status === 401) {
      return 'Please log in to continue';
    }
    if (error.response?.status === 403) {
      return 'You don\'t have permission to do this';
    }
    if (error.response?.status === 409) {
      return message || 'This item already exists';
    }
    
    return message || 'Something went wrong. Please try again.';
  }
  
  return 'Connection error. Please check your internet.';
}
```

### Form Validation Example

```tsx
// components/products/ProductForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  costPrice: z.number().min(0, 'Cost price must be 0 or more'),
  sellingPrice: z.number().min(0, 'Selling price must be 0 or more'),
  stockQuantity: z.number().min(0, 'Stock cannot be negative'),
  reorderLevel: z.number().min(0).optional(),
}).refine((data) => data.sellingPrice >= data.costPrice, {
  message: 'Selling price should be higher than cost price',
  path: ['sellingPrice'],
});

type ProductFormData = z.infer<typeof productSchema>;

export function ProductForm({ onSubmit, initialData }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData,
  });

  const costPrice = watch('costPrice');
  const sellingPrice = watch('sellingPrice');
  const profit = sellingPrice - costPrice;
  const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Product Name *
        </label>
        <input
          {...register('name')}
          className="w-full px-4 py-3 border rounded-lg"
          placeholder="e.g., Paracetamol 500mg"
        />
        {errors.name && (
          <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Cost Price (GHS) *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('costPrice', { valueAsNumber: true })}
            className="w-full px-4 py-3 border rounded-lg"
          />
          {errors.costPrice && (
            <p className="text-red-600 text-sm mt-1">{errors.costPrice.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Selling Price (GHS) *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('sellingPrice', { valueAsNumber: true })}
            className="w-full px-4 py-3 border rounded-lg"
          />
          {errors.sellingPrice && (
            <p className="text-red-600 text-sm mt-1">{errors.sellingPrice.message}</p>
          )}
        </div>
      </div>

      {profit > 0 && (
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-green-800">
            Profit: GHS {profit.toFixed(2)} ({profitMargin.toFixed(1)}%)
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Product'}
      </button>
    </form>
  );
}
```

## Deliverables Expected

### Immediate (Phase 1 - Products, Categories, Batches):
- [ ] Dashboard page with metrics
- [ ] Products list page with search/filter
- [ ] Add/Edit product form
- [ ] Product details page
- [ ] Categories management page
- [ ] Batches & expiry management page
- [ ] Low stock alerts page
- [ ] Responsive layouts (mobile, tablet, desktop)
- [ ] API service layer for all endpoints
- [ ] Error handling and loading states
- [ ] Toast notifications
- [ ] Form validation
- [ ] Empty states

### Future Phases (Placeholders):
- [ ] Inventory adjustments page (empty state)
- [ ] Staff management page (empty state)
- [ ] Branches page (empty state)
- [ ] Reports page (empty state)
- [ ] Navigation structure for future sections

### Cross-cutting:
- [ ] Authentication pages (login, password reset)
- [ ] Settings page (organization settings)
- [ ] User profile management
- [ ] Navigation sidebar/header
- [ ] Mobile bottom navigation
- [ ] Global search
- [ ] Notifications center

## Testing Checklist

**Functionality:**
- [ ] Can create, read, update, delete products
- [ ] Search and filters work correctly
- [ ] Pagination works
- [ ] Form validation catches errors
- [ ] Success/error messages appear
- [ ] Loading states show during API calls

**Responsiveness:**
- [ ] Works on mobile (375px width)
- [ ] Works on tablet (768px width)
- [ ] Works on desktop (1920px width)
- [ ] Touch targets are large enough
- [ ] Text is readable on all screens

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast passes WCAG AA
- [ ] Screen reader compatible

**Performance:**
- [ ] Initial page load < 3s
- [ ] Navigation feels instant
- [ ] Large lists don't lag
- [ ] Images optimized

## Design Resources

**Colors (adjust to match brand):**
```css
--primary: #2563eb;      /* Blue - primary actions */
--success: #16a34a;      /* Green - in stock, success */
--warning: #ea580c;      /* Orange - low stock, warnings */
--danger: #dc2626;       /* Red - out of stock, errors */
--neutral: #64748b;      /* Gray - secondary text */
```

## Final Notes

- **Analyze existing codebase first** - maintain consistency
- **Keep it simple** - business owners value clarity over features
- **Optimize for slow connections** - many users may have slower internet
- **Make it forgiving** - easy to undo mistakes, clear error messages
- **Use local language** - simple English, avoid jargon
- **Mobile-first** - many will access on phones

Build production-grade interfaces that feel professional yet approachable for non-technical users.
