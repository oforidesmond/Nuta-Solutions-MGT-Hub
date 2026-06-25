export interface BatchTraceReceived {
  occurredAt?: string | null;
  quantity?: string | null;
  unitCost?: string | null;
  totalCost?: string | null;
  summary?: string | null;
  [key: string]: unknown;
}

export interface BatchTraceConsumption {
  id?: string;
  saleId?: string | null;
  receiptNumber?: string | null;
  quantityConsumed?: string | null;
  unitCostAtConsumption?: string | null;
  revenue?: string | null;
  occurredAt?: string | null;
  summary?: string | null;
  [key: string]: unknown;
}

export interface BatchTraceWriteOff {
  id?: string;
  category?: string | null;
  quantity?: string | null;
  lossAmount?: string | null;
  occurredAt?: string | null;
  summary?: string | null;
  [key: string]: unknown;
}

export interface BatchTraceFinancials {
  totalCost?: string | null;
  totalRevenue?: string | null;
  remainingValue?: string | null;
  receivedValue?: string | null;
  soldRevenue?: string | null;
  soldValue?: string | null;
  grossProfit?: string | null;
  writtenOffValue?: string | null;
  roi?: string | null;
  spent?: string | null;
  soldFor?: string | null;
  remaining?: string | null;
  [key: string]: unknown;
}

export interface BatchTrace {
  batch: {
    id: string;
    batchNumber?: string | null;
    productId?: string | null;
    productName?: string | null;
    expiryDate?: string | null;
    initialQuantity?: string | null;
    remainingQuantity?: string | null;
    costPriceAtPurchase?: string | null;
    receivedAt?: string | null;
    [key: string]: unknown;
  };
  received?: BatchTraceReceived | null;
  consumptions: BatchTraceConsumption[];
  writeOffs: BatchTraceWriteOff[];
  financials?: BatchTraceFinancials | null;
  [key: string]: unknown;
}
