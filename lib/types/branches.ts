export interface HubBranch {
  id: string;
  organizationId?: string | null;
  name: string;
  location?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Plan-limit metadata from GET /branches `meta`. */
export interface BranchesListMeta {
  /** null means unlimited plan. */
  limit: number | null;
  used: number;
  /** null when limit is unlimited. */
  remaining: number | null;
  /** true when a super-admin set a custom limit. */
  isOverridden: boolean;
  planType: string;
}

/** Full GET /branches response: list + plan-limit meta. */
export interface BranchesListResponse {
  branches: HubBranch[];
  meta: BranchesListMeta | null;
}

export type CreateBranchBody = {
  name: string;
  location?: string;
};

export type UpdateBranchBody = {
  name?: string;
  location?: string;
  isActive?: boolean;
};

/** POST /inventory/transfer request body. */
export type StockTransferBody = {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  note?: string;
};

/** One side of a transfer in the success response. */
export interface StockTransferBranchSummary {
  id: string;
  name: string;
  stockBefore: string;
  stockAfter: string;
}

/** POST /inventory/transfer success (200) response. */
export interface StockTransferResult {
  transferId: string;
  productId: string;
  quantity: string;
  note?: string | null;
  fromBranch: StockTransferBranchSummary;
  toBranch: StockTransferBranchSummary;
}
