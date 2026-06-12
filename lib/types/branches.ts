export interface HubBranch {
  id: string;
  name: string;
  location?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
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
