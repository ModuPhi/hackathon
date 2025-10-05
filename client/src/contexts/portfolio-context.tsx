import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Portfolio, Receipt, Nonprofit, EffectAData } from "@shared/schema";
import { useKeyless } from "@/contexts/keyless-context";

interface PortfolioContextType {
  portfolio: Portfolio | null;
  receipts: Receipt[];
  nonprofits: Nonprofit[];
  effectAData: EffectAData;
  isLoading: boolean;
  verificationResults: Record<string, VerificationResult>;
  
  updatePortfolio: (updates: Partial<Portfolio>) => Promise<void>;
  createReceipt: (receipt: { type: string; amount: number; cause?: string; reference: string }) => Promise<void>;
  registerReceiptJourney: (reference: string, journeyId: string) => void;
  setEffectAData: (data: Partial<EffectAData>) => void;
  resetEffectAData: () => void;
}

type VerificationResult = {
  status: "pending" | "verified" | "failed";
  explorerUrl?: string;
};

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

const initialEffectAData: EffectAData = {
  allocatedAmount: 0,
  step1: { fee: 0, usdcReceived: 0 },
  step2: { slippage: 0, aptReceived: 0 },
  step3: { borrowPercent: 80, borrowed: 0, healthFactor: 0 },
  step4: { donationAmount: 0, reference: 'MOCK-TX-001' }
};

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [effectAData, setEffectADataState] = useState<EffectAData>(initialEffectAData);
  const queryClient = useQueryClient();
  const { isAuthenticated, aptosAddress } = useKeyless();

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<Portfolio>({
    queryKey: ['/api/portfolio'],
  });

  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: ['/api/receipts'],
  });

  const { data: nonprofits = [] } = useQuery<Nonprofit[]>({
    queryKey: ['/api/nonprofits'],
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: async (updates: Partial<Portfolio>) => {
      const response = await apiRequest('PATCH', '/api/portfolio', updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (receipt: { type: string; amount: number; cause?: string; reference: string }) => {
      const response = await apiRequest('POST', '/api/receipts', receipt);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
    },
  });

  const updatePortfolio = async (updates: Partial<Portfolio>) => {
    await updatePortfolioMutation.mutateAsync(updates);
  };

  const createReceipt = async (receipt: { type: string; amount: number; cause?: string; reference: string }) => {
    await createReceiptMutation.mutateAsync(receipt);
  };

  const [receiptJourneys, setReceiptJourneys] = useState<Record<string, string>>({});
  const [verificationResults, setVerificationResults] = useState<Record<string, VerificationResult>>({});
  const activeVerificationsRef = useRef<Record<string, boolean>>({});
  const pendingTimeoutsRef = useRef<Record<string, number>>({});

  const normalizeReference = useCallback((reference: string) => reference.trim().toLowerCase(), []);

  const registerReceiptJourney = useCallback((reference: string, journeyId: string) => {
    const normalized = normalizeReference(reference);
    setReceiptJourneys((prev) => {
      if (prev[normalized] === journeyId) {
        return prev;
      }
      return { ...prev, [normalized]: journeyId };
    });
  }, [normalizeReference]);

  useEffect(() => {
    return () => {
      Object.values(pendingTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  const pollInterval = useMemo(() => {
    const raw = Number.parseInt(import.meta.env.VITE_VERIFIER_POLL_INTERVAL ?? "5000", 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 5000;
  }, []);

  const maxAttempts = useMemo(() => Math.max(1, Math.floor(30000 / pollInterval)), [pollInterval]);

  const scheduleAttempt = useCallback((reference: string, fn: () => void) => {
    const timeoutId = window.setTimeout(() => {
      delete pendingTimeoutsRef.current[reference];
      fn();
    }, pollInterval);
    pendingTimeoutsRef.current[reference] = timeoutId;
  }, [pollInterval]);

  const startVerification = useCallback((reference: string, journeyId: string) => {
    const normalized = normalizeReference(reference);
    if (!aptosAddress) return;

    const attempt = async (remaining: number) => {
      try {
        const params = new URLSearchParams({
          user: aptosAddress,
          journey_id: journeyId,
        });
        const response = await fetch(`/api/verify/${normalized}?${params.toString()}`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = (await response.json()) as { verified: boolean; explorerUrl?: string };
          if (data.verified) {
            setVerificationResults((prev) => {
              return {
                ...prev,
                [normalized]: { status: "verified", explorerUrl: data.explorerUrl },
              };
            });
            delete activeVerificationsRef.current[normalized];
            return;
          }

          if (remaining > 1) {
            setVerificationResults((prev) => ({
              ...prev,
              [normalized]: {
                status: "pending",
                explorerUrl: data.explorerUrl ?? prev[normalized]?.explorerUrl,
              },
            }));
            scheduleAttempt(normalized, () => {
              void attempt(remaining - 1);
            });
            return;
          }

          setVerificationResults((prev) => ({
            ...prev,
            [normalized]: {
              status: "failed",
              explorerUrl: data.explorerUrl ?? prev[normalized]?.explorerUrl,
            },
          }));
          delete activeVerificationsRef.current[normalized];
          return;
        }
      } catch (error) {
        console.warn("Verification request failed", error);
      }

      if (remaining > 1) {
        scheduleAttempt(normalized, () => {
          void attempt(remaining - 1);
        });
        return;
      }

      setVerificationResults((prev) => ({
        ...prev,
        [normalized]: {
          status: "failed",
          explorerUrl: prev[normalized]?.explorerUrl,
        },
      }));
      delete activeVerificationsRef.current[normalized];
    };

    setVerificationResults((prev) => ({
      ...prev,
      [normalized]: {
        status: "pending",
        explorerUrl: prev[normalized]?.explorerUrl,
      },
    }));
    activeVerificationsRef.current[normalized] = true;
    void attempt(maxAttempts);
  }, [aptosAddress, maxAttempts, normalizeReference, scheduleAttempt]);

  useEffect(() => {
    if (!aptosAddress) return;

    const txHashRegex = /^0x[0-9a-f]+$/i;

    receipts.forEach((receipt) => {
      const normalizedReference = normalizeReference(receipt.reference);
      if (!txHashRegex.test(normalizedReference)) return;

      const journeyId = receiptJourneys[normalizedReference]
        ?? (receipt.type === "Donation" ? "lend-and-donate@v1" : undefined);
      if (!journeyId) return;

      const existing = verificationResults[normalizedReference];
      if (existing?.status === "verified" || existing?.status === "failed") {
        return;
      }
      if (activeVerificationsRef.current[normalizedReference]) {
        return;
      }

      startVerification(normalizedReference, journeyId);
    });
  }, [aptosAddress, receipts, receiptJourneys, startVerification, normalizeReference, verificationResults]);

  const setEffectAData = (data: Partial<EffectAData>) => {
    setEffectADataState(prev => ({ ...prev, ...data }));
  };

  const resetEffectAData = () => {
    setEffectADataState(initialEffectAData);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      resetEffectAData();
      queryClient.clear();
    }
  }, [isAuthenticated, queryClient]);

  const value: PortfolioContextType = {
    portfolio: portfolio || null,
    receipts,
    nonprofits,
    effectAData,
    isLoading: portfolioLoading,
    verificationResults,
    updatePortfolio,
    createReceipt,
    registerReceiptJourney,
    setEffectAData,
    resetEffectAData,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
