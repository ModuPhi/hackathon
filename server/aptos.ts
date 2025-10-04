import { Aptos, AptosConfig, Account, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type ChainAddresses = {
  network: string;
  restUrl?: string;
  tenantAddress: string;
  usdcMetadataAddress: string;
  explorerBase?: string;
};

export type BootstrapResult = {
  funded: boolean;
  reason?: "vault_missing" | "threshold_met" | "error";
  previousBalance: string;
  newBalance: string;
  transactions: { mint?: string; fund?: string };
};

const TARGET_VAULT_BALANCE = BigInt(1_000_000_000); // 1000 * 1e6 (micro USDC)

function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw Object.assign(new Error(`${name} environment variable is required`), { status: 503 });
  }
  return value;
}

function normalizeHex(input: string): string {
  return input.startsWith("0x") ? input : `0x${input}`;
}

function buildAptosClient(addresses: ChainAddresses) {
  const network = addresses.network?.toLowerCase();
  const tenantAddress = normalizeHex(addresses.tenantAddress);
  const privateKeyHex = normalizeHex(assertEnv(process.env.TENANT_PRIVATE_KEY, "TENANT_PRIVATE_KEY"));

  const config = new AptosConfig({
    network: (network as Network) ?? Network.TESTNET,
    fullnode: addresses.restUrl,
  });

  const aptos = new Aptos(config);
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
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
  functionId: string;
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

async function getVaultAddress(aptos: Aptos, tenantAddress: string, userAddress: string): Promise<string> {
  const [address] = await aptos.view({
    payload: {
      function: `${tenantAddress}::user_vault::user_vault_address`,
      functionArguments: [normalizeHex(userAddress)],
    },
  });

  if (typeof address !== "string") {
    throw new Error("Unexpected response from user_vault_address view");
  }

  return normalizeHex(address);
}

export async function bootstrapUserVault(userAddressRaw: string): Promise<BootstrapResult> {
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
    const rawBalance = (resource.data as any)?.balance;
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
  const latestBalance = BigInt((resource.data as any)?.balance ?? 0);

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

