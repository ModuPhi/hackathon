import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortfolio } from "@/hooks/use-portfolio";
import { formatNumber } from "@/lib/portfolio-calculations";

export function ReceiptsTimeline() {
  const { receipts, verificationResults } = usePortfolio();
  const txHashRegex = /^0x[0-9a-f]+$/i;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="receipts-table">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cause
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {receipts.length === 0 ? (
                <tr data-testid="empty-receipts">
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No receipts yet. Run an effect to create your first on chain style receipt.
                  </td>
                </tr>
              ) : (
                receipts.map((receipt, index) => (
                  <tr 
                    key={receipt.id} 
                    className="hover:bg-muted/50 transition-smooth"
                    data-testid={`receipt-row-${index}`}
                  >
                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                      {receipt.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatNumber(receipt.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {receipt.cause || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {receipt.reference}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {receipt.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(() => {
                        const normalizedRef = receipt.reference.trim().toLowerCase();
                        const verification = verificationResults[normalizedRef];
                        const isTxHash = txHashRegex.test(normalizedRef);

                        if (verification?.status === "verified") {
                          return (
                            <Badge className="bg-success text-success-foreground">
                              Verified on-chain
                            </Badge>
                          );
                        }

                        if (isTxHash) {
                          const explorerUrl = verification?.explorerUrl;
                          return (
                            <span className="text-xs text-muted-foreground">
                              Awaiting confirmation — {explorerUrl ? (
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  view on Explorer
                                </a>
                              ) : (
                                "view on Explorer"
                              )}
                            </span>
                          );
                        }

                        return <span className="text-xs text-muted-foreground">—</span>;
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
