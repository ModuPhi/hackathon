import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePortfolio } from "@/hooks/use-portfolio";

export function CurrentPositions() {
  const { portfolio } = usePortfolio();

  if (!portfolio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const positions = [
    {
      asset: "USD Credit",
      balance: portfolio.credits,
      obligations: 0,
      testId: "position-usd-credit"
    },
    {
      asset: "USDC",
      balance: portfolio.usdc,
      obligations: 0,
      testId: "position-usdc"
    },
    {
      asset: "APT",
      balance: portfolio.apt,
      obligations: portfolio.debt,
      testId: "position-apt"
    }
  ];

  return (
    <Card data-testid="current-positions-table">
      <CardHeader>
        <CardTitle>Current Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Obligations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.asset} data-testid={position.testId}>
                <TableCell className="font-medium">{position.asset}</TableCell>
                <TableCell className="text-right" data-testid={`${position.testId}-balance`}>
                  ${position.balance.toFixed(2)}
                </TableCell>
                <TableCell 
                  className={`text-right ${position.obligations > 0 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}
                  data-testid={`${position.testId}-obligations`}
                >
                  {position.obligations > 0 ? `$${position.obligations.toFixed(2)}` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
