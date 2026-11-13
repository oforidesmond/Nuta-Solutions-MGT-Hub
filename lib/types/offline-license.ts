export type OfflineLicensePaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface OfflineLicenseDevice {
  id: string;
  customerId: string;
  deviceId: string;
  installationId: string;
  fingerprintHash: string;
  boundAt: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
  lastEntitlementHash: string | null;
  lastKnownGoodTime: string | null;
  clockTamperReported: boolean;
}

export interface OfflineActivationCode {
  id: string;
  code: string;
  customerId: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedDeviceId: string | null;
  createdAt: string;
}

export interface OfflineLicensePayment {
  id: string;
  customerId: string;
  deviceId: string | null;
  reference: string;
  amountGhs: string | number;
  periodDays: number;
  phone: string | null;
  provider: string | null;
  status: OfflineLicensePaymentStatus;
  displayText: string | null;
  paystackStatus: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
}

export interface OfflineLicenseCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  amountGhs: string | number;
  periodDays: number;
  graceDays: number;
  supportNotes: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  devices?: OfflineLicenseDevice[];
  activationCodes?: OfflineActivationCode[];
  payments?: OfflineLicensePayment[];
}

export interface CreateOfflineLicenseCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  amountGhs?: number;
  periodDays?: number;
  graceDays?: number;
  supportNotes?: string;
}

export interface UpdateOfflineLicenseCustomerDto {
  name?: string;
  phone?: string | null;
  email?: string | null;
  amountGhs?: number;
  periodDays?: number;
  graceDays?: number;
  supportNotes?: string | null;
  isActive?: boolean;
}

export interface OfflineActivationCodeResponse {
  code: string;
  expiresAt: string | null;
  customerId: string;
}

export interface OfflineLicenseUnlockResponse {
  validUntil: string;
  unlockToken: string | null;
  deviceId: string | null;
}

export const OFFLINE_LICENSE_DEFAULT_AMOUNT_GHS = 600;
export const OFFLINE_LICENSE_DEFAULT_PERIOD_DAYS = 365;
export const OFFLINE_LICENSE_DEFAULT_GRACE_DAYS = 0;
