import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useChainAddresses } from "@/hooks/use-chain-addresses";
import { formatNumber } from "@/lib/portfolio-calculations";

export function ReceiptsTimeline() {
  const { receipts } = usePortfolio();
  const { data: chainAddresses } = useChainAddresses(false);

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
                    key={receipt.hash || index} 
                    className="hover:bg-muted/50 transition-smooth"
                    data-testid={`receipt-row-${index}`}
                  >
                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                      Donation
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatNumber(receipt.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {receipt.causeName || receipt.causeSlug || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {(() => {
                        if (!receipt.hash) return "-";
                        const explorerUrl =
                          receipt.explorerUrl ??
                          (chainAddresses?.explorerBase
                            ? `${chainAddresses.explorerBase}/txn/${receipt.hash}?network=${chainAddresses.network}`
                            : null);
                        if (!explorerUrl) {
                          return receipt.hash;
                        }
                        return (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {receipt.hash.slice(0, 10)}…
                          </a>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(() => {
                        if (!receipt.hash) {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }

                        const explorerUrl =
                          receipt.explorerUrl ??
                          (chainAddresses?.explorerBase
                            ? `${chainAddresses.explorerBase}/txn/${receipt.hash}?network=${chainAddresses.network}`
                            : null);

                        if (receipt.verified) {
                          return <Badge className="bg-success text-success-foreground">Verified on-chain</Badge>;
                        }

                        if (receipt.verificationStatus === "failed") {
                          return (
                            <span className="text-xs text-destructive">
                              {receipt.verificationMessage ?? "Verification unavailable"}
                              {explorerUrl ? (
                                <>
                                  {" — "}
                                  <a className="underline" href={explorerUrl} target="_blank" rel="noreferrer">
                                    view on Explorer
                                  </a>
                                </>
                              ) : null}
                            </span>
                          );
                        }

                        return (
                          <span className="text-xs text-muted-foreground">
                            Awaiting confirmation — {explorerUrl ? (
                              <a className="underline" href={explorerUrl} target="_blank" rel="noreferrer">
                                view on Explorer
                              </a>
                            ) : (
                              "view on Explorer"
                            )}
                          </span>
                        );
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
