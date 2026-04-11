export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "STAFF"
  | "SALES_AGENT"
  | string;

export interface HubUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  organizationId?: string | null;
  organization?: HubOrganization | null;
}

export interface HubOrganization {
  id: string;
  name: string;
  businessType?: string | null;
  businessLocation?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string;
  defaultTaxRate?: string | number | null;
  taxEnabled?: boolean;
  expiryReminderMonths?: number | null;
  expiryAlertEnabled?: boolean;
}

export interface HubProduct {
  id: string;
  name: string;
  currentStock?: string | number | null;
  sellingPrice?: string | number | null;
  isActive?: boolean;
  /** Nearest batch expiry or server-computed status */
  expirySummary?: string | null;
  nearestExpiryDate?: string | null;
}

export interface HubSale {
  id: string;
  totalAmount: string | number;
  soldAt?: string | null;
  createdAt?: string | null;
  createdBy?: { id: string; firstName?: string | null; lastName?: string | null; email?: string } | null;
  createdById?: string;
  receiptNumber?: string;
}

export interface DashboardSummary {
  totalSales: number;
  inventoryCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
}
