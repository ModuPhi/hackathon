import { Card, CardContent } from "@/components/ui/card";
import { usePortfolio } from "@/hooks/use-portfolio";
import { getHealthFactorDisplay, formatNumber } from "@/lib/portfolio-calculations";

export function BalanceCards() {
  const { portfolio } = usePortfolio();

  if (!portfolio) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-5">
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const healthDisplay = getHealthFactorDisplay(portfolio.healthFactor);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* Credits Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div 
            className="text-2xl sm:text-3xl font-bold text-foreground transition-all duration-200"
            data-testid="credits-balance"
          >
            {formatNumber(portfolio.credits)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">Credits</div>
        </CardContent>
      </Card>

      {/* USDC Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div 
            className="text-2xl sm:text-3xl font-bold text-foreground transition-all duration-200"
            data-testid="usdc-balance"
          >
            {formatNumber(portfolio.usdc)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">USDC</div>
        </CardContent>
      </Card>

      {/* APT Value Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div 
            className="text-2xl sm:text-3xl font-bold text-foreground transition-all duration-200"
            data-testid="apt-balance"
          >
            {formatNumber(portfolio.apt)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">APT value</div>
        </CardContent>
      </Card>

      {/* Debt Card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div 
            className="text-2xl sm:text-3xl font-bold text-foreground transition-all duration-200"
            data-testid="debt-balance"
          >
            {formatNumber(portfolio.debt)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">Debt</div>
        </CardContent>
      </Card>

      {/* Health Factor Card */}
      <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
        <CardContent className="p-4 sm:p-5">
          <div 
            className="text-2xl sm:text-3xl font-bold transition-all duration-200"
            style={{ color: healthDisplay.color }}
            data-testid="health-factor"
          >
            {healthDisplay.display}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">Health factor</div>
          
          {healthDisplay.showMeter && (
            <div className="mt-3" data-testid="health-meter-container">
              <div className="health-meter">
                <div 
                  className="health-indicator"
                  style={{ 
                    left: `${healthDisplay.position}%`,
                    color: healthDisplay.color 
                  }}
                  data-testid="health-indicator"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
