import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ChevronRight, Check } from "lucide-react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { CancelConfirmDialog } from "@/components/shared/cancel-confirm-dialog";
import { calculateEffectASteps, calculateBorrowMetrics, formatNumber } from "@/lib/portfolio-calculations";
import { useToast } from "@/hooks/use-toast";

interface EffectAOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'amount-selection' | 'overview' | 'step1' | 'step2' | 'step3' | 'step4' | 'success';

export function EffectAOverlay({ isOpen, onClose }: EffectAOverlayProps) {
  const [currentStep, setCurrentStep] = useState<Step>('amount-selection');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [allocatedAmount, setAllocatedAmount] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [borrowPercent, setBorrowPercent] = useState(80);
  const [donationAmount, setDonationAmount] = useState(0);
  
  const { portfolio, updatePortfolio, createReceipt, effectAData, setEffectAData } = usePortfolio();
  const { toast } = useToast();

  // Calculate all steps when component mounts or amount changes
  const calculatedData = calculateEffectASteps(allocatedAmount);

  const borrowMetrics = calculateBorrowMetrics(calculatedData.step2.aptReceived, borrowPercent);

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    setShowCancelDialog(false);
    setCurrentStep('amount-selection');
    setAmountInput("");
    setAllocatedAmount(0);
    onClose();
  };

  const handleQuickChip = (chipAmount: string) => {
    if (chipAmount === "max") {
      setAmountInput(portfolio?.credits.toString() || "0");
    } else {
      setAmountInput(chipAmount);
    }
  };

  const handleAmountContinue = () => {
    const amount = parseFloat(amountInput) || 0;
    setAllocatedAmount(amount);
    setCurrentStep('overview');
  };

  const handleBegin = () => {
    setEffectAData(calculatedData);
    setCurrentStep('step1');
  };

  const handleStep1Confirm = async () => {
    if (!portfolio) return;
    
    await updatePortfolio({
      credits: portfolio.credits - allocatedAmount,
      usdc: calculatedData.step1.usdcReceived
    });
    
    toast({
      title: "Converted to USDC. Fee applied.",
      duration: 3000
    });

    setTimeout(() => setCurrentStep('step2'), 500);
  };

  const handleStep2Confirm = async () => {
    if (!portfolio) return;
    
    await updatePortfolio({
      usdc: 0,
      apt: calculatedData.step2.aptReceived
    });
    
    toast({
      title: "Swapped to APT.",
      duration: 3000
    });

    setTimeout(() => setCurrentStep('step3'), 500);
  };

  const handleStep3Confirm = async () => {
    if (!portfolio) return;
    
    await updatePortfolio({
      debt: borrowMetrics.borrowed,
      usdc: borrowMetrics.borrowed,
      healthFactor: borrowMetrics.healthFactor
    });
    
    toast({
      title: "Loan opened.",
      duration: 3000
    });

    setDonationAmount(borrowMetrics.borrowed);
    setTimeout(() => setCurrentStep('step4'), 500);
  };

  const handleStep4Confirm = async () => {
    if (!portfolio) return;
    
    await updatePortfolio({
      usdc: portfolio.usdc - donationAmount,
      effectsCompleted: portfolio.effectsCompleted + 1
    });
    
    await createReceipt({
      type: "Donation",
      amount: donationAmount,
      cause: portfolio.selectedCause || undefined,
      reference: "MOCK-TX-001"
    });
    
    toast({
      title: "Donation sent.",
      duration: 3000
    });

    setTimeout(() => setCurrentStep('success'), 500);
  };

  const handleReturn = () => {
    setCurrentStep('amount-selection');
    setAmountInput("");
    setAllocatedAmount(0);
    onClose();
  };

  const renderProgressBar = () => {
    const steps = ['Convert', 'Swap', 'Supply', 'Donate'];
    const currentStepIndex = currentStep === 'overview' ? 0 : 
      currentStep === 'step1' ? 1 :
      currentStep === 'step2' ? 2 :
      currentStep === 'step3' ? 3 :
      currentStep === 'step4' ? 4 : 4;

    return (
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index + 1 < currentStepIndex ? 'bg-success text-success-foreground' :
                      index + 1 === currentStepIndex ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1 < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <div className={`hidden sm:block ml-2 text-xs font-medium ${
                      index + 1 === currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 bg-muted mx-2 min-w-8"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto" data-testid="effect-a-overlay">
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Portfolio</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">Effect A</span>
              </div>
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="cancel-effect-a"
              >
                Cancel and return
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {currentStep !== 'amount-selection' && currentStep !== 'overview' && currentStep !== 'success' && renderProgressBar()}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Amount Selection */}
          {currentStep === 'amount-selection' && (
            <Card data-testid="effect-a-amount-selection">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  How much do you want to allocate?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Choose the amount of credits you want to use for Effect A. This will be converted to USDC, then swapped to APT for the donation strategy.
                </p>
                
                <div className="mb-6">
                  <Label htmlFor="effect-a-amount-input" className="text-sm font-medium text-foreground mb-2">
                    Amount to allocate
                  </Label>
                  <Input
                    id="effect-a-amount-input"
                    type="number"
                    placeholder="Enter amount"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="mb-2"
                    data-testid="effect-a-amount"
                  />
                  
                  <div className="flex items-center space-x-2 mb-2">
                    {["100", "250", "500", "max"].map((chipAmount) => (
                      <Button
                        key={chipAmount}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickChip(chipAmount)}
                        className="px-3 py-1 text-xs"
                        data-testid={`quick-chip-${chipAmount}`}
                      >
                        {chipAmount === "max" ? "Max" : chipAmount}
                      </Button>
                    ))}
                  </div>
                  
                  <p className="text-xs text-muted-foreground" data-testid="credits-available">
                    You have <span data-testid="credits-helper">
                      {formatNumber(portfolio?.credits || 0)}
                    </span> credits available.
                  </p>
                </div>
                
                <Button
                  onClick={handleAmountContinue}
                  disabled={!amountInput || parseFloat(amountInput) <= 0 || parseFloat(amountInput) > (portfolio?.credits || 0)}
                  className="w-full"
                  data-testid="amount-continue"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Overview */}
          {currentStep === 'overview' && (
            <Card data-testid="effect-a-overview">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Donate now. Let your asset grow.
                </h2>
                <p className="text-muted-foreground mb-6">
                  You will convert credits to USDC, swap to APT, supply APT as collateral, borrow USDC, then donate the borrowed amount to your chosen nonprofit. You keep the APT position. You can act on it later as markets move.
                </p>
                
                <div className="bg-muted rounded-lg p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Starting credits:</span>
                    <span className="font-medium text-foreground" data-testid="overview-credits">
                      {formatNumber(allocatedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target borrow:</span>
                    <span className="font-medium text-foreground">80%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target health buffer:</span>
                    <span className="font-medium text-foreground">At least 1.5</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleBegin}
                  className="w-full"
                  data-testid="begin-effect-a"
                >
                  Begin
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Convert */}
          {currentStep === 'step1' && (
            <div data-testid="effect-a-step-1">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-3">Convert credits to USDC</h3>
                    <p className="text-muted-foreground mb-4">
                      Onramps cost money. We model a simple 1.5 percent fee so you see the tradeoff.
                    </p>
                    <Button
                      variant="link"
                      className="text-sm text-primary hover:underline p-0 mb-2"
                      data-testid="fee-info-btn"
                    >
                      What is a fee?
                    </Button>
                    <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                      Fees pay payment networks and providers. In this lesson it is fixed for clarity.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2">Credits to convert</Label>
                        <div className="text-2xl font-bold text-foreground" data-testid="step1-credits">
                          {formatNumber(calculatedData.allocatedAmount)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-2">Fee (1.5%)</Label>
                        <div className="text-lg font-semibold text-muted-foreground" data-testid="step1-fee">
                          {formatNumber(calculatedData.step1.fee)}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <Label className="text-sm font-medium text-foreground mb-2">You receive in USDC</Label>
                        <div className="text-2xl font-bold text-primary" data-testid="step1-usdc">
                          {formatNumber(calculatedData.step1.usdcReceived)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleStep1Confirm}
                  data-testid="step1-confirm"
                >
                  Convert to USDC
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Swap */}
          {currentStep === 'step2' && (
            <div data-testid="effect-a-step-2">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-3">Swap USDC to APT</h3>
                    <p className="text-muted-foreground mb-4">
                      A decentralized exchange quotes a price and executes a swap. Quotes move with supply and demand.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We will include a small slippage so you see the concept.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2">You provide</Label>
                        <div className="text-2xl font-bold text-foreground">
                          <span data-testid="step2-usdc-provide">
                            {formatNumber(calculatedData.step1.usdcReceived)}
                          </span> USDC
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-2">Quote</Label>
                        <div className="text-sm text-muted-foreground">1 APT = 10.00 USD</div>
                        <div className="text-xs text-muted-foreground mt-1">0.30% slippage assumed</div>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <Label className="text-sm font-medium text-foreground mb-2">You receive</Label>
                        <div className="text-2xl font-bold text-primary">
                          <span data-testid="step2-apt-receive">
                            {formatNumber(calculatedData.step2.aptReceived)}
                          </span> USD in APT
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleStep2Confirm}
                  data-testid="step2-confirm"
                >
                  Swap to APT
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Supply and Borrow */}
          {currentStep === 'step3' && (
            <div data-testid="effect-a-step-3">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-3">Supply and borrow</h3>
                    <p className="text-muted-foreground mb-4">
                      Supplying APT makes it collateral. You can borrow USDC against it while keeping APT exposure. Health factor describes your safety buffer.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2">Target borrow percent</Label>
                        <div className="flex items-center space-x-2 mb-2">
                          {[60, 80, 90].map((percent) => (
                            <Button
                              key={percent}
                              variant={borrowPercent === percent ? "default" : "secondary"}
                              size="sm"
                              onClick={() => setBorrowPercent(percent)}
                              className="px-3 py-1 text-sm"
                              data-testid={`borrow-chip-${percent}`}
                            >
                              {percent}%
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2">Health factor</Label>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="text-2xl font-bold" 
                            style={{ color: borrowMetrics.safetyColor }}
                            data-testid="step3-health-value"
                          >
                            {formatNumber(borrowMetrics.healthFactor)}
                          </div>
                          <div className="flex-1">
                            <div className="health-meter">
                              <div 
                                className="health-indicator"
                                style={{ 
                                  left: `${borrowMetrics.healthFactor >= 1.5 ? 70 : borrowMetrics.healthFactor >= 1.25 ? 30 : 20}%`,
                                  color: borrowMetrics.safetyColor 
                                }}
                                data-testid="step3-health-indicator"
                              />
                            </div>
                          </div>
                        </div>
                        <p 
                          className={`text-xs mt-2 ${
                            borrowMetrics.safetyLevel === 'safe' ? 'text-success' :
                            borrowMetrics.safetyLevel === 'moderate' ? 'text-warning' :
                            'text-destructive'
                          }`}
                          data-testid="step3-health-message"
                        >
                          {borrowMetrics.safetyMessage}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <Label className="text-sm font-medium text-foreground mb-2">Borrowed USDC</Label>
                        <div className="text-2xl font-bold text-primary" data-testid="step3-borrowed">
                          {formatNumber(borrowMetrics.borrowed)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleStep3Confirm}
                  data-testid="step3-confirm"
                >
                  Supply and borrow
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Donate */}
          {currentStep === 'step4' && (
            <div data-testid="effect-a-step-4">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-3">Donate to your nonprofit</h3>
                    <p className="text-muted-foreground mb-4">
                      Send the borrowed USDC now. Your APT position remains. You can manage it later if markets move.
                    </p>
                    <div className="flex items-center space-x-2 mt-4">
                      <span className="text-sm font-medium text-foreground" data-testid="step4-cause-name">
                        {portfolio?.selectedCause}
                      </span>
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="donation-amount" className="text-sm font-medium text-foreground mb-2">
                          Donation amount
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="donation-amount"
                            type="number"
                            value={donationAmount}
                            onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0)}
                            className="flex-1"
                            data-testid="step4-donation-amount"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDonationAmount(borrowMetrics.borrowed)}
                            data-testid="step4-max-btn"
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-2">Reference</Label>
                        <div className="text-sm font-mono text-muted-foreground">MOCK-TX-001</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleStep4Confirm}
                  data-testid="step4-confirm"
                >
                  Donate now
                </Button>
              </div>
            </div>
          )}

          {/* Success Screen */}
          {currentStep === 'success' && (
            <Card data-testid="effect-a-success">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-success-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Donation sent</h2>
                <p className="text-muted-foreground mb-6">
                  You have an active APT position and a donation receipt. You can return to your portfolio now.
                </p>
                <Button
                  onClick={handleReturn}
                  data-testid="return-to-portfolio"
                >
                  Return to portfolio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CancelConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
