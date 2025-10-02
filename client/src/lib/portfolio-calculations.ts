import type { EffectAData } from "@shared/schema";

export function calculateEffectASteps(allocatedAmount: number): EffectAData {
  // Step 1: Convert with 1.5% fee
  const fee = allocatedAmount * 0.015;
  const usdcReceived = allocatedAmount - fee;

  // Step 2: Swap with 0.3% slippage  
  const slippage = usdcReceived * 0.003;
  const aptReceived = usdcReceived - slippage;

  // Step 3: Supply and borrow (default 80%)
  const borrowPercent = 80;
  const borrowed = aptReceived * (borrowPercent / 100);
  const healthFactor = 1.7; // For 80% borrow

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
  
  // Health factor calculation
  let healthFactor;
  if (borrowPercent === 60) {
    healthFactor = 2.0;
  } else if (borrowPercent === 80) {
    healthFactor = 1.7;
  } else if (borrowPercent === 90) {
    healthFactor = 1.25;
  } else {
    healthFactor = 2.5 - (borrowPercent / 100) * 1.25;
  }

  // Determine safety level
  let safetyLevel: 'safe' | 'moderate' | 'danger';
  let safetyMessage: string;
  let safetyColor: string;

  if (healthFactor >= 1.5) {
    safetyLevel = 'safe';
    safetyMessage = 'Safe buffer';
    safetyColor = 'hsl(142, 71%, 45%)';
  } else if (healthFactor >= 1.25) {
    safetyLevel = 'moderate';
    safetyMessage = 'Moderate buffer';
    safetyColor = 'hsl(38, 92%, 50%)';
  } else {
    safetyLevel = 'danger';
    safetyMessage = 'Choose a lower borrow to stay safe.';
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
  return parseFloat(num.toFixed(2)).toFixed(2);
}

export function generateReceiptReference(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `MOCK-TX-${timestamp}`;
}
