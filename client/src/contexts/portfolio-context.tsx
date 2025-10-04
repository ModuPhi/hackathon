import { createContext, useContext, useEffect, useState } from "react";
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
  
  updatePortfolio: (updates: Partial<Portfolio>) => Promise<void>;
  createReceipt: (receipt: { type: string; amount: number; cause?: string; reference: string }) => Promise<void>;
  setEffectAData: (data: Partial<EffectAData>) => void;
  resetEffectAData: () => void;
}

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
  const { isAuthenticated } = useKeyless();

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
    updatePortfolio,
    createReceipt,
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
