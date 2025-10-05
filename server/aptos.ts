import { Aptos, AptosConfig, Account, AccountAddress, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha3_256 } from "@noble/hashes/sha3";

export type ChainAddresses = {
  network: string;
  restUrl?: string;
  tenantAddress: string;
  usdcMetadataAddress: string;
  explorerBase?: string;
};

export type BootstrapResult = {
  funded: boolean;
  reason?: "vault_missing" | "threshold_met" | "error" | "tenant_not_configured";
  previousBalance: string;
  newBalance: string;
  transactions: { mint?: string; fund?: string };
};

const TARGET_VAULT_BALANCE = BigInt(1_000_000_000); // 1000 * 1e6 (micro USDC)

function isTenantConfigured(): boolean {
  return Boolean(process.env.TENANT_PRIVATE_KEY);
}

function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw Object.assign(new Error(`${name} environment variable is required`), { status: 503 });
  }
  return value;
}

function normalizeHex(input: string): string {
  return input.startsWith("0x") ? input : `0x${input}`;
}

function trimTrailingSlash(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/\/+$/, "");
}

function buildAptosClient(addresses: ChainAddresses) {
  const network = addresses.network?.toLowerCase();
  const tenantAddress = normalizeHex(addresses.tenantAddress);
  const privateKeyValue = assertEnv(process.env.TENANT_PRIVATE_KEY, "TENANT_PRIVATE_KEY");

  const config = new AptosConfig({
    network: (network as Network) ?? Network.TESTNET,
    fullnode: addresses.restUrl,
  });

  const aptos = new Aptos(config);
  const privateKey = new Ed25519PrivateKey(privateKeyValue);
  const account = Account.fromPrivateKey({ privateKey, address: tenantAddress });

  return { aptos, account, tenantAddress };
}

function isResourceNotFound(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return (error as any).status === 404;
  }
  const message = (error as Error | undefined)?.message ?? "";
  return message.includes("404") || message.includes("not found");
}

async function submitEntryFunction(args: {
  aptos: Aptos;
  account: Account;
  functionId: `${string}::${string}::${string}`;
  functionArguments: (string | number | boolean | string[])[];
}) {
  const transaction = await args.aptos.transaction.build.simple({
    sender: args.account.accountAddress,
    data: {
      function: args.functionId,
      functionArguments: args.functionArguments,
    },
  });

  const senderAuthenticator = args.aptos.transaction.sign({
    signer: args.account,
    transaction,
  });

  const response = await args.aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator,
  });

  await args.aptos.waitForTransaction({ transactionHash: response.hash });
  return response.hash;
}

async function readChainAddresses(): Promise<ChainAddresses> {
  const filePath = path.resolve(process.cwd(), "server", "data", "addresses.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as ChainAddresses;
}

function deriveVaultAddress(userAddress: string): string {
  const userBytes = AccountAddress.from(userAddress).data;
  const seedBytes = new TextEncoder().encode("dg_user_vault");
  const combined = new Uint8Array(userBytes.length + seedBytes.length + 1);
  combined.set(userBytes, 0);
  combined.set(seedBytes, userBytes.length);
  combined[combined.length - 1] = 0xfe; // OBJECT_FROM_SEED_ADDRESS_SCHEME
  const hash = sha3_256(combined);
  return normalizeHex(Buffer.from(hash).toString("hex"));
}

async function getVaultAddress(_aptos: Aptos, _tenantAddress: string, userAddress: string): Promise<string> {
  return deriveVaultAddress(normalizeHex(userAddress));
}

export async function bootstrapUserVault(userAddressRaw: string): Promise<BootstrapResult> {
  if (!isTenantConfigured()) {
    return {
      funded: false,
      reason: "tenant_not_configured",
      previousBalance: "0",
      newBalance: TARGET_VAULT_BALANCE.toString(),
      transactions: {},
    };
  }
  const userAddress = normalizeHex(userAddressRaw);
  const addresses = await readChainAddresses();
  const { aptos, account, tenantAddress } = buildAptosClient(addresses);

  const vaultAddress = await getVaultAddress(aptos, tenantAddress, userAddress);

  let previousBalance = BigInt(0);
  let vaultExists = true;

  try {
    const resource = await aptos.getAccountResource({
      accountAddress: vaultAddress,
      resourceType: "0x1::fungible_asset::FungibleStore",
    });
    const rawBalance = (resource as any)?.balance ?? (resource as any)?.data?.balance;
    previousBalance = rawBalance ? BigInt(rawBalance) : BigInt(0);
  } catch (error) {
    if (isResourceNotFound(error)) {
      vaultExists = false;
    } else {
      throw error;
    }
  }

  if (!vaultExists) {
    return {
      funded: false,
      reason: "vault_missing",
      previousBalance: previousBalance.toString(),
      newBalance: previousBalance.toString(),
      transactions: {},
    };
  }

  if (previousBalance >= TARGET_VAULT_BALANCE) {
    return {
      funded: false,
      reason: "threshold_met",
      previousBalance: previousBalance.toString(),
      newBalance: previousBalance.toString(),
      transactions: {},
    };
  }

  const topUp = TARGET_VAULT_BALANCE - previousBalance;
  const topUpString = topUp.toString();

  const transactions: { mint?: string; fund?: string } = {};

  transactions.mint = await submitEntryFunction({
    aptos,
    account,
    functionId: `${tenantAddress}::usdc_demo::faucet_mint`,
    functionArguments: [tenantAddress, topUpString],
  });

  transactions.fund = await submitEntryFunction({
    aptos,
    account,
    functionId: `${tenantAddress}::user_vault::fund_user_vault`,
    functionArguments: [userAddress, topUpString],
  });

  const resource = await aptos.getAccountResource({
    accountAddress: vaultAddress,
    resourceType: "0x1::fungible_asset::FungibleStore",
  });
  const latestBalanceRaw = (resource as any)?.balance ?? (resource as any)?.data?.balance ?? 0;
  const latestBalance = BigInt(latestBalanceRaw);

  return {
    funded: true,
    previousBalance: previousBalance.toString(),
    newBalance: latestBalance.toString(),
    transactions,
  };
}

export async function ensureChainAddresses(): Promise<ChainAddresses> {
  return readChainAddresses();
}

export type VaultInfo = {
  vaultAddress: string;
  balance: bigint;
};

export async function getUserVaultInfo(userAddressRaw: string): Promise<VaultInfo> {
  if (!isTenantConfigured()) {
    const userAddress = normalizeHex(userAddressRaw);
    return { vaultAddress: userAddress, balance: TARGET_VAULT_BALANCE };
  }
  const userAddress = normalizeHex(userAddressRaw);
  const addresses = await readChainAddresses();
  const { aptos, tenantAddress } = buildAptosClient(addresses);
  const vaultAddress = await getVaultAddress(aptos, tenantAddress, userAddress);

  try {
    const resource = await aptos.getAccountResource({
      accountAddress: vaultAddress,
      resourceType: "0x1::fungible_asset::FungibleStore",
    });
    const rawBalance = (resource as any)?.balance ?? (resource as any)?.data?.balance;
    const balance = rawBalance ? BigInt(rawBalance) : BigInt(0);
    return { vaultAddress, balance };
  } catch (error) {
    if (isResourceNotFound(error)) {
      return { vaultAddress, balance: BigInt(0) };
    }
    throw error;
  }
}

export type JourneyOutputEntry = {
  kind: string;
  asset_metadata: string;
  amount: string;
  direction: boolean;
};

export type JourneyOutputOnChain = {
  hash: string;
  version: string;
  sequenceNumber: string;
  blockHeight?: string;
  timestamp?: string;
  journey_id: string;
  tenant: string;
  user: string;
  entries: JourneyOutputEntry[];
};

export async function getJourneyOutputsForUser(userAddressRaw: string, limit = 100): Promise<JourneyOutputOnChain[]> {
  if (!isTenantConfigured()) {
    return [];
  }
  const userAddress = normalizeHex(userAddressRaw);
  const addresses = await readChainAddresses();
  const { aptos, tenantAddress } = buildAptosClient(addresses);
  const restBase = trimTrailingSlash(addresses.restUrl) ?? trimTrailingSlash(aptos.config.fullnode);
  if (!restBase) {
    throw new Error("REST URL is not configured");
  }

  const handleStruct = `${tenantAddress}::journey_audit::JourneyOutputEvents`;
  const url = new URL(`${restBase}/accounts/${tenantAddress}/events/${handleStruct}/handle`);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString());
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to fetch journey events: ${message || response.statusText}`);
  }
  const events = (await response.json()) as any[];

  const filtered = events.filter((event) => {
    const dataUser = typeof event?.data?.user === "string" ? event.data.user.toLowerCase() : "";
    return dataUser === userAddress.toLowerCase();
  });

  const results: JourneyOutputOnChain[] = [];

  for (const event of filtered) {
    const version = typeof event?.version === "string" ? event.version : String(event?.transaction_version ?? "0");
    let hash: string | undefined;
    let timestamp: string | undefined;
    try {
      const txn = await aptos.getTransactionByVersion({ ledgerVersion: BigInt(version) });
      if ((txn as any)?.hash) hash = String((txn as any).hash);
      const rawTs = (txn as any)?.timestamp;
      if (rawTs !== undefined) {
        const ms = Number(BigInt(rawTs) / BigInt(1000));
        timestamp = new Date(ms).toISOString();
      }
    } catch (error) {
      console.warn("Failed to fetch transaction for journey output", error);
    }

    results.push({
      hash: hash ?? "",
      version,
      sequenceNumber: String(event.sequence_number ?? event.guid?.id?.seq ?? "0"),
      blockHeight: event.block_height ? String(event.block_height) : undefined,
      timestamp,
      journey_id: event.data?.journey_id ?? "",
      tenant: event.data?.tenant ?? tenantAddress,
      user: event.data?.user ?? userAddress,
      entries: Array.isArray(event.data?.entries) ? event.data.entries : [],
    });
  }

  return results;
}

export async function getNonprofitRegistry(): Promise<Record<string, string>> {
  if (!isTenantConfigured()) {
    return {};
  }
  const addresses = await readChainAddresses();
  const { aptos, tenantAddress } = buildAptosClient(addresses);

  try {
    const resource = await aptos.getAccountResource({
      accountAddress: tenantAddress,
      resourceType: `${tenantAddress}::nonprofit_registry::Registry`,
    });
    const payouts = (resource.data as any)?.payouts?.data;
    if (!Array.isArray(payouts)) {
      return {};
    }
    const map: Record<string, string> = {};
    for (const entry of payouts) {
      if (entry?.key && entry?.value) {
        map[String(entry.key)] = String(entry.value);
      }
    }
    return map;
  } catch (error) {
    if (isResourceNotFound(error)) {
      return {};
    }
    throw error;
  }
}
