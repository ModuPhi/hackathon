export function logAptosTransaction(functionId: string, transactionHash: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!functionId || !transactionHash) {
    return;
  }

  const message = `[aptos] ${functionId} → ${transactionHash}`;
  // eslint-disable-next-line no-console
  console.log(message);
}
