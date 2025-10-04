import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const chainAddressesSchema = z.object({
  network: z.string().min(1),
  restUrl: z.string().url().optional(),
  tenantAddress: z.string().min(1),
  usdcMetadataAddress: z.string().min(1),
  explorerBase: z.string().url().optional(),
});

export type ChainAddresses = z.infer<typeof chainAddressesSchema>;

async function fetchChainAddresses(): Promise<ChainAddresses> {
  const res = await fetch("/api/chain/addresses", { credentials: "include" });
  if (!res.ok) {
    const message = (await res.text()) || res.statusText;
    throw new Error(message);
  }

  const data = await res.json();
  return chainAddressesSchema.parse(data);
}

export function useChainAddresses(enabled = true) {
  return useQuery({
    queryKey: ["/api/chain/addresses"],
    queryFn: fetchChainAddresses,
    staleTime: Infinity,
    enabled,
  });
}
