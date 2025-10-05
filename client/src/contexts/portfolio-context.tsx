import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EffectAData } from "@shared/schema";
import { useKeyless } from "@/contexts/keyless-context";

export type PortfolioSnapshot = {
  aptosAddress: string;
  credits: number;
  usdc: number;
  apt: number;
  debt: number;
  healthFactor: number | null;
  selectedNonprofit: string | null | undefined;
  completedEffects: string[];
  effectsCompleted: number;
  donatedTotal: number;
  vaultBalanceMicro: string;
  updatedAt: string;
};

type ReceiptBase = {
  hash: string;
  journeyId: string;
  amount: number;
  assetMetadata: string | null;
  causeSlug: string | null;
  causeName: string | null;
  timestamp: string | null;
  blockHeight: string | null;
  sequenceNumber: string;
};

export type ReceiptVerificationStatus = "idle" | "verifying" | "pending" | "verified" | "failed";

type ReceiptVerificationRecord = {
  status: ReceiptVerificationStatus;
  explorerUrl?: string | null;
  message?: string | null;
};

export type ReceiptEntry = ReceiptBase & {
  verified: boolean;
  explorerUrl: string | null;
  verificationStatus: ReceiptVerificationStatus;
  verificationMessage: string | null;
};

export type NonprofitEntry = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  imageUrl: string;
  category: string;
  payoutAddress: string | null;
  verified: number;
};

interface PortfolioContextType {
  portfolio: PortfolioSnapshot | null;
  receipts: ReceiptEntry[];
  nonprofits: NonprofitEntry[];
  effectAData: EffectAData;
  isLoading: boolean;
  refreshPortfolio: () => Promise<void>;
  refreshReceipts: () => Promise<void>;
  updatePreferences: (updates: { selectedNonprofit?: string | null; completedEffects?: string[]; effectsCompleted?: number }) => Promise<void>;
  recordDonationMetadata: (payload: { hash: string; causeName?: string | null; causeSlug?: string | null }) => Promise<void>;
  verifyReceipt: (hash: string, journeyId: string) => Promise<void>;
  setEffectAData: (data: Partial<EffectAData>) => void;
  resetEffectAData: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

const initialEffectAData: EffectAData = {
  allocatedAmount: 0,
  step1: { fee: 0, usdcReceived: 0 },
  step2: { slippage: 0, aptReceived: 0 },
  step3: { borrowPercent: 80, borrowed: 0, healthFactor: 0 },
  step4: { donationAmount: 0, reference: "" },
};

const VERIFIER_POLL_INTERVAL_MS = Number(import.meta.env.VITE_VERIFIER_POLL_INTERVAL ?? 5_000);
const VERIFIER_MAX_ATTEMPTS = 6;

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return response.json() as Promise<T>;
}

async function fetchPortfolioSnapshot(aptosAddress: string): Promise<PortfolioSnapshot> {
  const url = `/api/portfolio?${new URLSearchParams({ aptosAddress })}`;
  return fetchJson<PortfolioSnapshot>(url);
}

async function fetchReceipts(aptosAddress: string): Promise<ReceiptBase[]> {
  const url = `/api/receipts?${new URLSearchParams({ aptosAddress })}`;
  return fetchJson<ReceiptBase[]>(url);
}

async function fetchNonprofitsMetadata(): Promise<NonprofitEntry[]> {
  return fetchJson<NonprofitEntry[]>("/api/nonprofits");
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [effectAData, setEffectADataState] = useState<EffectAData>(initialEffectAData);
  const [receiptVerifications, setReceiptVerifications] = useState<Record<string, ReceiptVerificationRecord>>({});
  const queryClient = useQueryClient();
  const { isAuthenticated, aptosAddress } = useKeyless();

  const normalizedAddress = useMemo(() => aptosAddress?.toLowerCase() ?? null, [aptosAddress]);

  const portfolioQuery = useQuery({
    queryKey: ["/api/portfolio", normalizedAddress],
    queryFn: () => fetchPortfolioSnapshot(normalizedAddress!),
    enabled: Boolean(normalizedAddress),
  });

  const receiptsQuery = useQuery({
    queryKey: ["/api/receipts", normalizedAddress],
    queryFn: () => fetchReceipts(normalizedAddress!),
    enabled: Boolean(normalizedAddress),
    refetchInterval: 30_000,
  });

  const nonprofitsQuery = useQuery({
    queryKey: ["/api/nonprofits"],
    queryFn: fetchNonprofitsMetadata,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: { selectedNonprofit?: string | null; completedEffects?: string[]; effectsCompleted?: number }) => {
      if (!normalizedAddress) {
        throw new Error("Aptos address unavailable");
      }
      await fetchJson("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aptosAddress: normalizedAddress, ...updates }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio", normalizedAddress] });
    },
  });

  const recordDonationMetadataMutation = useMutation({
    mutationFn: async (payload: { hash: string; causeName?: string | null; causeSlug?: string | null }) => {
      if (!normalizedAddress) {
        throw new Error("Aptos address unavailable");
      }
      await fetchJson("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aptosAddress: normalizedAddress, ...payload }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts", normalizedAddress] });
    },
  });

  const refreshPortfolio = useCallback(async () => {
    if (!normalizedAddress) return;
    await queryClient.invalidateQueries({ queryKey: ["/api/portfolio", normalizedAddress] });
  }, [normalizedAddress, queryClient]);

  const refreshReceipts = useCallback(async () => {
    if (!normalizedAddress) return;
    await queryClient.invalidateQueries({ queryKey: ["/api/receipts", normalizedAddress] });
  }, [normalizedAddress, queryClient]);

  const updatePreferences = useCallback(
    async (updates: { selectedNonprofit?: string | null; completedEffects?: string[]; effectsCompleted?: number }) => {
      await updatePreferencesMutation.mutateAsync(updates);
    },
    [updatePreferencesMutation],
  );

  const recordDonationMetadata = useCallback(
    async (payload: { hash: string; causeName?: string | null; causeSlug?: string | null }) => {
      await recordDonationMetadataMutation.mutateAsync(payload);
    },
    [recordDonationMetadataMutation],
  );

  const verifyReceipt = useCallback(
    async (hash: string, journeyId: string) => {
      if (!normalizedAddress) return;
      if (!hash || !hash.toLowerCase().startsWith("0x")) return;
      if (!journeyId) return;

      const loweredHash = hash.toLowerCase();
      const pollInterval = Number.isFinite(VERIFIER_POLL_INTERVAL_MS) && VERIFIER_POLL_INTERVAL_MS > 0
        ? VERIFIER_POLL_INTERVAL_MS
        : 5_000;

      setReceiptVerifications((prev) => {
        const existing = prev[loweredHash];
        if (existing && ["verifying", "pending", "verified"].includes(existing.status)) {
          return prev;
        }
        return {
          ...prev,
          [loweredHash]: { status: "verifying", explorerUrl: existing?.explorerUrl ?? null, message: null },
        };
      });

      const params = new URLSearchParams({
        user: normalizedAddress,
        journey_id: journeyId,
      });
      const url = `/api/verify/${hash}?${params.toString()}`;
      let lastExplorerUrl: string | null = null;

      for (let attempt = 0; attempt < VERIFIER_MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch(url, { headers: { Accept: "application/json" } });
          if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Verification failed with status ${response.status}`);
          }

          const data = (await response.json()) as {
            verified: boolean;
            explorerUrl?: string;
          };

          if (data.explorerUrl) {
            lastExplorerUrl = data.explorerUrl;
          }

          if (data.verified) {
            setReceiptVerifications((prev) => ({
              ...prev,
              [loweredHash]: {
                status: "verified",
                explorerUrl: data.explorerUrl ?? lastExplorerUrl,
                message: null,
              },
            }));
            return;
          }

          setReceiptVerifications((prev) => ({
            ...prev,
            [loweredHash]: {
              status: "pending",
              explorerUrl: data.explorerUrl ?? lastExplorerUrl,
              message: null,
            },
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const isFinalAttempt = attempt === VERIFIER_MAX_ATTEMPTS - 1;

          setReceiptVerifications((prev) => ({
            ...prev,
            [loweredHash]: {
              status: isFinalAttempt ? "failed" : "pending",
              explorerUrl: prev[loweredHash]?.explorerUrl ?? lastExplorerUrl,
              message,
            },
          }));

          if (isFinalAttempt) {
            return;
          }
        }

        if (attempt < VERIFIER_MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      setReceiptVerifications((prev) => ({
        ...prev,
      [loweredHash]: {
          status: "failed",
          explorerUrl: prev[loweredHash]?.explorerUrl ?? lastExplorerUrl,
          message: prev[loweredHash]?.message ?? "Unable to verify receipt on-chain.",
        },
      }));
    },
    [normalizedAddress],
  );

  const rawReceipts = useMemo<ReceiptBase[]>(
    () => (normalizedAddress ? receiptsQuery.data ?? [] : []),
    [normalizedAddress, receiptsQuery.data],
  );

  useEffect(() => {
    if (!normalizedAddress) {
      setReceiptVerifications({});
    }
  }, [normalizedAddress]);

  useEffect(() => {
    if (!normalizedAddress) return;

    rawReceipts.forEach((receipt) => {
      if (!receipt.hash || !receipt.hash.toLowerCase().startsWith("0x")) return;
      if (!receipt.journeyId) return;

      const status = receiptVerifications[receipt.hash.toLowerCase()]?.status;
      if (!status || status === "idle") {
        void verifyReceipt(receipt.hash, receipt.journeyId);
      }
    });
  }, [normalizedAddress, rawReceipts, receiptVerifications, verifyReceipt]);

  const receipts = useMemo<ReceiptEntry[]>(
    () =>
      rawReceipts.map((receipt) => {
        const hash = receipt.hash ? receipt.hash.toLowerCase() : "";
        const verification = hash ? receiptVerifications[hash] : undefined;
        const status = verification?.status ?? (receipt.hash ? "idle" : "idle");
        return {
          ...receipt,
          verified: status === "verified",
          explorerUrl: verification?.explorerUrl ?? null,
          verificationStatus: status,
          verificationMessage: verification?.message ?? null,
        };
      }),
    [rawReceipts, receiptVerifications],
  );

  const setEffectAData = useCallback((data: Partial<EffectAData>) => {
    setEffectADataState((prev) => ({ ...prev, ...data }));
  }, []);

  const resetEffectAData = useCallback(() => {
    setEffectADataState(initialEffectAData);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      resetEffectAData();
      setReceiptVerifications({});
      queryClient.removeQueries({ queryKey: ["/api/portfolio"] });
      queryClient.removeQueries({ queryKey: ["/api/receipts"] });
    }
  }, [isAuthenticated, queryClient, resetEffectAData]);

  const value: PortfolioContextType = {
    portfolio: (normalizedAddress ? portfolioQuery.data ?? null : null),
    receipts,
    nonprofits: nonprofitsQuery.data ?? [],
    effectAData,
    isLoading:
      Boolean(normalizedAddress) &&
      (portfolioQuery.isLoading || receiptsQuery.isLoading || nonprofitsQuery.isLoading),
    refreshPortfolio,
    refreshReceipts,
    updatePreferences,
    recordDonationMetadata,
    verifyReceipt,
    setEffectAData,
    resetEffectAData,
  };

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
}
