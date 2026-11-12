import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { handleApiError } from "@/lib/api/errors";
import { cleanQueryParams } from "@/lib/api/query-params";
import { unwrapList } from "@/lib/api/response";
import type {
  CreateMoneyCategoryInput,
  CreateMoneyEntryInput,
  MoneyBookListMeta,
  MoneyBookSummary,
  MoneyCategory,
  MoneyEntry,
  MoneyEntryDirection,
  MoneyFeedItem,
  UpdateMoneyCategoryInput,
  UpdateMoneyEntryInput,
} from "@/lib/types/money-book";

function asSummary(raw: unknown): MoneyBookSummary {
  const d = (raw ?? {}) as Record<string, unknown>;
  const byCat = (d.byCategory ?? {}) as Record<string, unknown>;
  return {
    currency: typeof d.currency === "string" ? d.currency : "GHS",
    dateRange: (d.dateRange as MoneyBookSummary["dateRange"]) ?? {
      startDate: "",
      endDate: "",
    },
    salesIn: String(d.salesIn ?? "0.00"),
    salesCount: Number(d.salesCount ?? 0),
    otherIn: String(d.otherIn ?? "0.00"),
    otherInCount: Number(d.otherInCount ?? 0),
    moneyOut: String(d.moneyOut ?? "0.00"),
    moneyOutCount: Number(d.moneyOutCount ?? 0),
    moneyInTotal: String(d.moneyInTotal ?? "0.00"),
    whatsLeft: String(d.whatsLeft ?? "0.00"),
    byCategory: {
      otherIn: Array.isArray(byCat.otherIn)
        ? (byCat.otherIn as MoneyBookSummary["byCategory"]["otherIn"])
        : [],
      moneyOut: Array.isArray(byCat.moneyOut)
        ? (byCat.moneyOut as MoneyBookSummary["byCategory"]["moneyOut"])
        : [],
    },
  };
}

export async function fetchMoneyBookSummary(params: {
  startDate: string;
  endDate: string;
}): Promise<MoneyBookSummary> {
  try {
    const { data } = await apiClient.get(endpoints.moneyBook.summary, {
      params: cleanQueryParams(params),
    });
    return asSummary(data);
  } catch (e) {
    throw handleApiError(e);
  }
}

export async function fetchMoneyBookFeed(params: {
  startDate: string;
  endDate: string;
  page?: number;
  limit?: number;
  direction?: MoneyEntryDirection;
}): Promise<{ data: MoneyFeedItem[]; meta: MoneyBookListMeta }> {
  try {
    const { data } = await apiClient.get(endpoints.moneyBook.feed, {
      params: cleanQueryParams(params),
    });
    const unwrapped = unwrapList<MoneyFeedItem>(
      data,
      params.page ?? 1,
      params.limit ?? 20,
    );
    return {
      data: unwrapped.items,
      meta: {
        page: unwrapped.meta.page,
        limit: unwrapped.meta.limit,
        total: unwrapped.meta.total,
        totalPages: unwrapped.meta.totalPages,
      },
    };
  } catch (e) {
    throw handleApiError(e);
  }
}

export async function createMoneyEntry(
  input: CreateMoneyEntryInput,
): Promise<MoneyEntry> {
  try {
    const { data } = await apiClient.post(endpoints.moneyBook.entries, input);
    return data as MoneyEntry;
  } catch (e) {
    throw handleApiError(e);
  }
}

export async function updateMoneyEntry(
  id: string,
  input: UpdateMoneyEntryInput,
): Promise<MoneyEntry> {
  try {
    const { data } = await apiClient.patch(
      endpoints.moneyBook.entryById(id),
      input,
    );
    return data as MoneyEntry;
  } catch (e) {
    throw handleApiError(e);
  }
}

export async function deleteMoneyEntry(id: string): Promise<void> {
  try {
    await apiClient.delete(endpoints.moneyBook.entryById(id));
  } catch (e) {
    throw handleApiError(e);
  }
}

export async function fetchMoneyCategories(params?: {
  direction?: MoneyEntryDirection;
  includeInactive?: boolean;
}): Promise<MoneyCategory[]> {
  try {
    const { data } = await apiClient.get(endpoints.moneyBook.categories, {
      params: cleanQueryParams(params ?? {}),
    });
    if (Array.isArray(data)) return data as MoneyCategory[];
    return unwrapList<MoneyCategory>(data).items;
  } catch (e) {
    throw handleApiError(e);
  }
}

export async function createMoneyCategory(
  input: CreateMoneyCategoryInput,
): Promise<MoneyCategory> {
  try {
    const { data } = await apiClient.post(
      endpoints.moneyBook.categories,
      input,
    );
    return data as MoneyCategory;
  } catch (e) {
    throw handleApiError(e);
  }
}

export async function updateMoneyCategory(
  id: string,
  input: UpdateMoneyCategoryInput,
): Promise<MoneyCategory> {
  try {
    const { data } = await apiClient.patch(
      endpoints.moneyBook.categoryById(id),
      input,
    );
    return data as MoneyCategory;
  } catch (e) {
    throw handleApiError(e);
  }
}
