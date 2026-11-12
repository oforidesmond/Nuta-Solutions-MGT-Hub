export type MoneyEntryDirection = "IN" | "OUT";

export type MoneyPaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK" | "OTHER";

export type MoneyFeedKind = "SALE" | "MANUAL";

export type MoneyCategory = {
  id: string;
  direction: MoneyEntryDirection;
  name: string;
  slug: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type MoneyBookCategoryAmount = {
  categoryId: string;
  name: string;
  amount: string;
  count: number;
};

export type MoneyBookSummary = {
  currency: string;
  dateRange: { startDate: string; endDate: string };
  salesIn: string;
  salesCount: number;
  otherIn: string;
  otherInCount: number;
  moneyOut: string;
  moneyOutCount: number;
  moneyInTotal: string;
  whatsLeft: string;
  byCategory: {
    otherIn: MoneyBookCategoryAmount[];
    moneyOut: MoneyBookCategoryAmount[];
  };
};

export type MoneyFeedItem = {
  id: string;
  kind: MoneyFeedKind;
  direction: MoneyEntryDirection;
  amount: string;
  occurredAt: string;
  label: string;
  paymentMethod?: string | null;
  note?: string | null;
  receiptNumber?: string | null;
  editable: boolean;
  category?: { id: string; name: string } | null;
};

export type MoneyEntry = {
  id: string;
  kind: "MANUAL";
  direction: MoneyEntryDirection;
  amount: string;
  currency: string;
  paymentMethod: MoneyPaymentMethod;
  occurredAt: string;
  note: string | null;
  categoryId: string;
  category: { id: string; name: string } | null;
  editable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MoneyBookListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CreateMoneyEntryInput = {
  direction: MoneyEntryDirection;
  amount: number;
  categoryId: string;
  paymentMethod: MoneyPaymentMethod;
  occurredAt: string;
  note?: string;
};

export type UpdateMoneyEntryInput = {
  amount?: number;
  categoryId?: string;
  paymentMethod?: MoneyPaymentMethod;
  occurredAt?: string;
  note?: string | null;
};

export type CreateMoneyCategoryInput = {
  direction: MoneyEntryDirection;
  name: string;
  sortOrder?: number;
};

export type UpdateMoneyCategoryInput = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export const MONEY_PAYMENT_LABELS: Record<MoneyPaymentMethod, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "MoMo",
  BANK: "Bank",
  OTHER: "Other",
};

export function moneyPaymentLabel(method: string | null | undefined): string {
  if (!method) return "";
  if (method in MONEY_PAYMENT_LABELS) {
    return MONEY_PAYMENT_LABELS[method as MoneyPaymentMethod];
  }
  if (method === "CARD") return "Card";
  if (method === "TRANSFER") return "Bank";
  if (method === "MIXED") return "Mixed";
  return method.replaceAll("_", " ");
}
