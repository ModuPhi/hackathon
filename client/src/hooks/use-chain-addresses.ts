import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import fallbackAddresses from "@/data/default-chain-addresses.json";

const chainAddressesSchema = z.object({
  network: z.string().min(1),
  restUrl: z.string().url().optional(),
  tenantAddress: z.string().min(1),
  usdcMetadataAddress: z.string().min(1),
  explorerBase: z.string().url().optional(),
});

export type ChainAddresses = z.infer<typeof chainAddressesSchema>;

async function fetchChainAddresses(): Promise<ChainAddresses> {
  try {
    const res = await fetch("/api/chain/addresses", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        return chainAddressesSchema.parse(data);
      }
    }
  } catch (error) {
    console.warn("Failed to fetch chain addresses", error);
  }

  return chainAddressesSchema.parse(fallbackAddresses);
}

export function useChainAddresses(enabled = true) {
  return useQuery({
    queryKey: ["/api/chain/addresses"],
    queryFn: fetchChainAddresses,
    staleTime: Infinity,
    enabled,
  });
}
