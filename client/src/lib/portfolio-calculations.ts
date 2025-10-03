import type { EffectAData } from "@shared/schema";

export function calculateEffectASteps(allocatedAmount: number): EffectAData {
  // Step 1: Convert with 1.5% fee
  const fee = allocatedAmount * 0.015;
  const usdcReceived = allocatedAmount - fee;

  // Step 2: Swap with 0.3% slippage  
  const slippage = usdcReceived * 0.003;
  const aptReceived = usdcReceived - slippage;

  // Step 3: Supply and borrow (default 40% - conservative start)
  const borrowPercent = 40;
  const borrowed = aptReceived * (borrowPercent / 100);
  const healthFactor = 1.75; // For 40% borrow (safe buffer)

  return {
    allocatedAmount,
    step1: { fee, usdcReceived },
    step2: { slippage, aptReceived },
    step3: { borrowPercent, borrowed, healthFactor },
    step4: { donationAmount: borrowed, reference: 'MOCK-TX-001' }
  };
}

export function calculateBorrowMetrics(aptValue: number, borrowPercent: number) {
  const borrowed = aptValue * (borrowPercent / 100);
  
  // Health factor calculation (max LTV is 80%)
  // Formula: healthFactor = 2.5 - (borrowPercent / 100) * 1.875
  // At 0%: healthFactor = 2.5
  // At 40%: healthFactor = 1.75 (safe)
  // At 60%: healthFactor = 1.375 (moderate)
  // At 80%: healthFactor = 1.0 (at liquidation threshold)
  const healthFactor = 2.5 - (borrowPercent / 100) * 1.875;

  // Determine safety level
  let safetyLevel: 'safe' | 'moderate' | 'danger';
  let safetyMessage: string;
  let safetyColor: string;

  if (healthFactor >= 1.5) {
    safetyLevel = 'safe';
    safetyMessage = 'Safe buffer - well protected from liquidation';
    safetyColor = 'hsl(142, 71%, 45%)';
  } else if (healthFactor >= 1.2) {
    safetyLevel = 'moderate';
    safetyMessage = 'Moderate buffer - consider lowering LTV for safety';
    safetyColor = 'hsl(38, 92%, 50%)';
  } else {
    safetyLevel = 'danger';
    safetyMessage = 'High risk - very close to liquidation threshold';
    safetyColor = 'hsl(0, 72%, 51%)';
  }

  return {
    borrowed,
    healthFactor,
    safetyLevel,
    safetyMessage,
    safetyColor
  };
}

export function getHealthFactorDisplay(healthFactor: number | null) {
  if (healthFactor === null || healthFactor === 0) {
    return {
      display: 'N/A',
      color: 'hsl(215, 16%, 47%)',
      showMeter: false,
      position: 50
    };
  }

  let color: string;
  let position: number;

  if (healthFactor < 1.25) {
    color = 'hsl(0, 72%, 51%)'; // red
    position = 20;
  } else if (healthFactor < 1.5) {
    color = 'hsl(38, 92%, 50%)'; // yellow
    position = 30;
  } else if (healthFactor < 2.0) {
    color = 'hsl(142, 71%, 45%)'; // green
    position = 50 + ((healthFactor - 1.5) / 0.5) * 20;
  } else {
    color = 'hsl(142, 71%, 45%)'; // green
    position = 80;
  }

  return {
    display: healthFactor.toFixed(1),
    color,
    showMeter: true,
    position
  };
}

export function formatNumber(num: number): string {
  return `$${parseFloat(num.toFixed(2)).toFixed(2)}`;
}

export function generateReceiptReference(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `MOCK-TX-${timestamp}`;
}
