import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePortfolio } from "@/hooks/use-portfolio";
import { formatNumber } from "@/lib/portfolio-calculations";
import { Info } from "lucide-react";

interface InfoCardProps {
  label: string;
  caption: string;
  value: number;
  popoverText: string;
  highlight?: boolean;
  muted?: boolean;
  testId: string;
}

function InfoCard({ label, caption, value, popoverText, highlight, muted, testId }: InfoCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card 
      className={`transition-all duration-200 ${
        highlight ? 'border-primary/30 bg-primary/5' : ''
      }`}
      data-testid={testId}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className={`text-sm font-medium mb-1 ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>
              {label}
            </div>
            <div className="text-xs text-muted-foreground">{caption}</div>
          </div>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                className="ml-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={`Information about ${label}`}
                data-testid={`${testId}-info`}
              >
                <Info className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="text-sm"
              onEscapeKeyDown={() => setIsOpen(false)}
              onPointerDownOutside={() => setIsOpen(false)}
            >
              {popoverText}
            </PopoverContent>
          </Popover>
        </div>
        <div 
          key={value}
          className={`text-2xl sm:text-3xl font-bold animate-in fade-in-0 zoom-in-95 duration-200 ${
            muted ? 'text-muted-foreground' : 'text-foreground'
          }`}
          data-testid={`${testId}-value`}
        >
          {formatNumber(value)}
        </div>
      </CardContent>
    </Card>
  );
}

export function BalanceCards() {
  const { portfolio, receipts } = usePortfolio();

  if (!portfolio) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-5">
              <div className="h-4 bg-muted rounded mb-2 w-24"></div>
              <div className="h-3 bg-muted rounded w-16 mb-4"></div>
              <div className="h-8 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate cumulative donations from receipts
  const totalDonated = receipts
    .filter(receipt => receipt.type === "Donation")
    .reduce((sum, receipt) => sum + receipt.amount, 0);

  // Calculate invested assets (APT value)
  const investedAssets = portfolio.apt;

  // Cash available (credits)
  const cashAvailable = portfolio.credits;

  // Commitments (debt)
  const commitments = portfolio.debt;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <InfoCard
        label="Cash Available"
        caption="Ready to allocate"
        value={cashAvailable}
        popoverText="This is the portion of your credits you have not used yet. You can start a new Effect or donate directly from here."
        testId="cash-available"
      />
      
      <InfoCard
        label="Invested Assets"
        caption="Still growing"
        value={investedAssets}
        popoverText="This is the value of the crypto you hold here. It may rise or fall with the market. You keep exposure while you learn."
        testId="invested-assets"
      />
      
      <InfoCard
        label="Commitments"
        caption="To be repaid later"
        value={commitments}
        popoverText="When you borrow to power a donation, this shows the amount to repay later. Your assets back it, so you still keep exposure."
        muted={commitments === 0}
        testId="commitments"
      />
      
      <InfoCard
        label="Donated to Causes"
        caption="Your impact"
        value={totalDonated}
        popoverText="This is the total you have sent to nonprofits. Each donation appears in your receipts with a reference."
        highlight={true}
        testId="donated-to-causes"
      />
    </div>
  );
}
