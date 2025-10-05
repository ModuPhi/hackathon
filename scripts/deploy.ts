#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const aptosDir = path.join(repoRoot, "aptos");
const addressesJsonPath = path.join(repoRoot, "server", "data", "addresses.json");
const envPath = path.join(repoRoot, ".env");
const aptosConfigPath = path.join(repoRoot, ".aptos", "config.yaml");
const FALLBACK_TENANT_ADDRESS = "0x78f69925986ee54e33b935ffff1e3ce5a6410d1a6627647b5cfd411b7161df73";
const DEFAULT_MAX_GAS = "200000";
const DEFAULT_GAS_UNIT_PRICE = "100";
const DEFAULT_FAUCET_AMOUNT = "1000000000";

interface DeployConfig {
  network: string;
  profile?: string;
  tenantAddress?: string;
  tenantFaucetAmount?: number;
  nonprofits?: { slug: string; payout: string }[];
  setLiveFlags?: boolean;
  restUrl?: string;
  faucetUrl?: string;
  users?: { address: string; fund?: number }[];
}

interface ChainAddressesPayload {
  network: string;
  restUrl?: string;
  tenantAddress: string;
  usdcMetadataAddress: string;
  explorerBase?: string;
}

interface CliArgs {
  configPath: string;
  tenantAddress?: string;
  network?: string;
  restUrl?: string;
  faucetUrl?: string;
  tenantFaucetAmount?: number;
  nonprofits?: { slug: string; payout: string }[];
  setLiveFlags?: boolean;
}

type CliProfile = {
  account?: string;
  rest_url?: string;
  faucet_url?: string;
};

type CliProfiles = Record<string, CliProfile>;

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    configPath: path.resolve(repoRoot, "deploy.config.json"),
  };
  const nonprofits: { slug: string; payout: string }[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--config":
      case "-c":
        if (!args[i + 1]) {
          throw new Error("--config requires a path");
        }
        result.configPath = path.resolve(args[i + 1]);
        i += 1;
        break;
      case "--tenant-address":
        if (!args[i + 1]) throw new Error("--tenant-address requires a value");
        result.tenantAddress = args[++i];
        break;
      case "--network":
        if (!args[i + 1]) throw new Error("--network requires a value");
        result.network = args[++i];
        break;
      case "--rest-url":
        if (!args[i + 1]) throw new Error("--rest-url requires a value");
        result.restUrl = args[++i];
        break;
      case "--faucet-url":
        if (!args[i + 1]) throw new Error("--faucet-url requires a value");
        result.faucetUrl = args[++i];
        break;
      case "--tenant-faucet":
        if (!args[i + 1]) throw new Error("--tenant-faucet requires a value");
        result.tenantFaucetAmount = Number(args[++i]);
        break;
      case "--nonprofit":
        if (!args[i + 1]) throw new Error("--nonprofit requires slug:payout");
        {
          const value = args[++i];
          const [slug, payout] = value.split(":");
          if (!slug || !payout) {
            throw new Error(`Invalid --nonprofit value: ${value}`);
          }
          nonprofits.push({ slug, payout });
        }
        break;
      case "--set-live-flags":
        result.setLiveFlags = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (nonprofits.length > 0) {
    result.nonprofits = nonprofits;
  }

  return result;
}

function normalizeNodeUrls(rawUrl: string): { base: string; api: string } {
  const trimmed = rawUrl?.trim() ?? "";
  if (!trimmed) {
    return { base: trimmed, api: trimmed };
  }
  const withoutTrailingSlashes = trimmed.replace(/\/+$/, "");
  const base = withoutTrailingSlashes.endsWith("/v1")
    ? withoutTrailingSlashes.slice(0, -3)
    : withoutTrailingSlashes;
  const normalizedBase = base.replace(/\/+$/, "");
  const api = `${normalizedBase}/v1`;
  return { base: normalizedBase, api };
}

function defaultsForNetwork(network?: string): { fullnodeBase: string; faucetUrl: string } {
  const n = (network || "devnet").toLowerCase();
  if (n === "devnet") {
    return {
      fullnodeBase: "https://fullnode.devnet.aptoslabs.com",
      faucetUrl: "https://faucet.devnet.aptoslabs.com",
    };
  }
  if (n === "testnet") {
    return {
      fullnodeBase: "https://fullnode.testnet.aptoslabs.com",
      faucetUrl: "https://faucet.testnet.aptoslabs.com",
    };
  }
  // local or any other
  return {
    fullnodeBase: "http://127.0.0.1:8080",
    faucetUrl: "http://127.0.0.1:8081",
  };
}

async function loadCliProfiles(): Promise<CliProfiles> {
  try {
    const raw = await readFile(aptosConfigPath, "utf-8");
    const parsed = parseYaml(raw) as { profiles?: CliProfiles };
    return parsed?.profiles ?? {};
  } catch (error) {
    console.warn("Warning: unable to load Aptos CLI config", (error as Error)?.message ?? error);
    return {};
  }
}

function ensureHex(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a hex string (got ${value})`);
  }
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("0x") ? trimmed.toLowerCase() : `0x${trimmed.toLowerCase()}`;
  if (!/^0x[0-9a-f]+$/.test(normalized)) {
    throw new Error(`${label} must be a hex string (got ${value})`);
  }
  return normalized;
}

function runCommand(command: string, args: string[], options: { cwd?: string } = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`$ ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      cwd: options.cwd ?? aptosDir,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let combined = "";
    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      combined += text;
      process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      combined += text;
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
        return;
      }
      const trimmed = combined.trim();
      if (!trimmed) {
        resolve(undefined);
        return;
      }
      const lines = trimmed.split(/\r?\n/).reverse();
      for (const line of lines) {
        const trimmedLine = line.trim();
        const braceIndex = trimmedLine.indexOf("{");
        if (braceIndex === -1) {
          continue;
        }
        const candidate = trimmedLine.slice(braceIndex);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object") {
            if ("Error" in parsed && parsed.Error) {
              reject(new Error(String(parsed.Error)));
              return;
            }
            resolve(parsed);
            return;
          }
        } catch (error) {
          // ignore and continue scanning previous lines
        }
      }
      resolve(undefined);
    });
  });
}

function runCommandCapture(command: string, args: string[], options: { cwd?: string } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: options.cwd ?? aptosDir }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr?.toString() || error.message;
        reject(new Error(message));
      } else {
        resolve(stdout.toString());
      }
    });
  });
}

interface AptosCommandOpts {
  profile?: string;
  url?: string;
}

async function aptosView(
  functionId: string,
  functionArgs: string[] = [],
  opts: AptosCommandOpts = {},
): Promise<any[]> {
  const args = ["move", "view", "--function-id", functionId];
  if (opts.profile) {
    args.splice(2, 0, "--profile", opts.profile);
  }
  if (opts.url) {
    args.push("--url", opts.url);
  }
  functionArgs.forEach((arg) => {
    args.push("--args", arg);
  });

  const output = await runCommandCapture("aptos", args);
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    const target = parsed && typeof parsed === "object" && "Result" in parsed
      ? (parsed as { Result: unknown }).Result
      : parsed;
    return Array.isArray(target) ? target : [target];
  } catch (error) {
    throw new Error(`Failed to parse view output '${trimmed}': ${(error as Error).message}`);
  }
}

async function aptosRun(
  functionId: string,
  functionArgs: string[] = [],
  opts: AptosCommandOpts = {},
): Promise<void> {
  const args = ["move", "run", "--function-id", functionId];
  if (opts.profile) {
    args.splice(2, 0, "--profile", opts.profile);
  }
  args.push("--assume-yes");
  if (opts.url) {
    args.push("--url", opts.url);
  }
  args.push("--max-gas", DEFAULT_MAX_GAS, "--gas-unit-price", DEFAULT_GAS_UNIT_PRICE);
  functionArgs.forEach((arg) => {
    args.push("--args", arg);
  });
  await runCommand("aptos", args);
}

async function updateEnvFile(filePath: string, updates: Record<string, string>) {
  let existing = "";
  try {
    existing = await readFile(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const lines = existing ? existing.split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  const nextLines = lines.map((line) => {
    const match = line.match(/^([^=#]+)=/);
    if (!match) {
      return line;
    }
    const key = match[1];
    if (keys.has(key)) {
      const value = updates[key];
      keys.delete(key);
      return `${key}=${value}`;
    }
    return line;
  });

  keys.forEach((key) => {
    nextLines.push(`${key}=${updates[key]}`);
  });

  await writeFile(filePath, nextLines.join(os.EOL));
}

async function main() {
  const args = parseArgs();
  let config: DeployConfig;
  let configExists = true;

  try {
    const configRaw = await readFile(args.configPath, "utf-8");
    config = JSON.parse(configRaw) as DeployConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    configExists = false;
    config = {
      network: args.network ?? "devnet",
      profile: undefined,
      tenantAddress: args.tenantAddress,
      tenantFaucetAmount: args.tenantFaucetAmount ?? 0,
      nonprofits: args.nonprofits ?? [],
      setLiveFlags: args.setLiveFlags,
      restUrl: args.restUrl,
      faucetUrl: args.faucetUrl,
    };
  }

  if (args.network) {
    config.network = args.network;
  } else {
    // Force devnet as the default target if not explicitly overridden
    config.network = (config.network || "devnet").toLowerCase() === "devnet" ? "devnet" : "devnet";
  }
  if (args.restUrl) config.restUrl = args.restUrl;
  if (args.faucetUrl) config.faucetUrl = args.faucetUrl;
  if (args.tenantAddress) config.tenantAddress = args.tenantAddress;
  if (args.tenantFaucetAmount !== undefined) config.tenantFaucetAmount = args.tenantFaucetAmount;
  if (args.nonprofits && args.nonprofits.length > 0) config.nonprofits = args.nonprofits;
  if (args.setLiveFlags !== undefined) config.setLiveFlags = args.setLiveFlags;

  config.nonprofits = config.nonprofits ?? [];
  config.tenantFaucetAmount = config.tenantFaucetAmount ?? 0;

  const cliProfiles = await loadCliProfiles();
  const defaultCliProfile = cliProfiles["default"];
  const profile = config.profile;
  const network = (config.network || "devnet").toLowerCase();

  let tenantAddress = config.tenantAddress;
  if (!tenantAddress) {
    tenantAddress = defaultCliProfile?.account || (profile ? cliProfiles[profile]?.account : undefined);
    if (!tenantAddress) {
      try {
        const args = ["config", "show", "--json"];
        if (profile) {
          args.splice(2, 0, "--profile", profile);
        }
        const output = await runCommandCapture("aptos", args, {
          cwd: repoRoot,
        });
        const parsed = JSON.parse(output);
        tenantAddress = parsed?.Result?.Account || parsed?.Result?.DefaultAccountAddress;
      } catch (error) {
        // ignore; we'll throw below if still missing
      }
    }
  }

  if (!tenantAddress) {
    tenantAddress = FALLBACK_TENANT_ADDRESS;
    console.warn(`Warning: falling back to default tenant address ${FALLBACK_TENANT_ADDRESS}`);
  }

  tenantAddress = ensureHex(tenantAddress, "tenantAddress");
  config.tenantAddress = tenantAddress;

  console.log(`Using tenant address: ${tenantAddress}`);

  const defaults = defaultsForNetwork(network);
  const profileRestUrl = profile ? cliProfiles[profile]?.rest_url : undefined;
  const defaultRestUrl = defaultCliProfile?.rest_url;
  const envRestUrl = process.env.APTOS_REST_URL;
  // Force devnet defaults if targeting devnet, regardless of any old config file values
  const restUrlSource = network === "devnet"
    ? defaults.fullnodeBase
    : (config.restUrl || profileRestUrl || defaultRestUrl || envRestUrl || defaults.fullnodeBase);
  const { base: cliRestUrl, api: apiRestUrl } = normalizeNodeUrls(restUrlSource);
  config.restUrl = cliRestUrl;

  console.log(`Using Aptos REST URL: ${cliRestUrl}`);

  const profileFaucetUrl = profile ? cliProfiles[profile]?.faucet_url : undefined;
  const defaultFaucetUrl = defaultCliProfile?.faucet_url;
  const envFaucetUrl = process.env.APTOS_FAUCET_URL;
  const faucetUrl = network === "devnet"
    ? defaults.faucetUrl
    : (config.faucetUrl || profileFaucetUrl || defaultFaucetUrl || envFaucetUrl || defaults.faucetUrl);
  config.faucetUrl = faucetUrl;

  console.log(`Using Aptos faucet URL: ${faucetUrl}`);

  await runCommand("aptos", [
    "account",
    "fund-with-faucet",
    "--account",
    tenantAddress,
    "--amount",
    DEFAULT_FAUCET_AMOUNT,
    "--url",
    cliRestUrl,
    "--faucet-url",
    faucetUrl,
  ]);

  await runCommand("aptos", [
    "move",
    "test",
    "--skip-fetch-latest-git-deps",
    "--named-addresses",
    `dg_tenant=${tenantAddress}`,
  ]);
  const publishArgs = [
    "move",
    "publish",
    "--skip-fetch-latest-git-deps",
    "--named-addresses",
    `dg_tenant=${tenantAddress}`,
    "--assume-yes",
    "--url",
    cliRestUrl,
    "--max-gas",
    DEFAULT_MAX_GAS,
    "--gas-unit-price",
    DEFAULT_GAS_UNIT_PRICE,
  ];
  if (profile) {
    publishArgs.splice(2, 0, "--profile", profile);
  }
  await runCommand("aptos", publishArgs);

  const aptosOpts: AptosCommandOpts = { profile, url: cliRestUrl };

  const usdcInitialized = await aptosView(`${tenantAddress}::usdc_demo::is_initialized`, [], aptosOpts);
  if (!usdcInitialized?.[0]) {
    await aptosRun(`${tenantAddress}::usdc_demo::init`, [], aptosOpts);
  }

  const registryInitialized = await aptosView(`${tenantAddress}::nonprofit_registry::is_initialized`, [], aptosOpts);
  if (!registryInitialized?.[0]) {
    await aptosRun(`${tenantAddress}::nonprofit_registry::init`, [], aptosOpts);
  }

  const receiptsInitialized = await aptosView(`${tenantAddress}::receipts::is_initialized`, [], aptosOpts);
  if (!receiptsInitialized?.[0]) {
    await aptosRun(`${tenantAddress}::receipts::init`, [], aptosOpts);
  }

  const journeyAuditInitialized = await aptosView(`${tenantAddress}::journey_audit::is_initialized`, [], aptosOpts);
  if (!journeyAuditInitialized?.[0]) {
    await aptosRun(`${tenantAddress}::journey_audit::init`, [], aptosOpts);
  }

  if (!config.nonprofits || config.nonprofits.length === 0) {
    const inferred: { slug: string; payout: string }[] = [];
    for (const [name, profileEntry] of Object.entries(cliProfiles)) {
      if (!profileEntry?.account) continue;
      if (name === "default") continue;
      if (name === profile) continue;
      inferred.push({ slug: name, payout: ensureHex(profileEntry.account, `profile ${name}`) });
    }
    config.nonprofits = inferred;
  } else {
    const existingSlugs = new Set(config.nonprofits.map((n) => n.slug));
    for (const [name, profileEntry] of Object.entries(cliProfiles)) {
      if (!profileEntry?.account) continue;
      if (existingSlugs.has(name)) continue;
      if (name === "default" || name === profile) continue;
      config.nonprofits.push({ slug: name, payout: ensureHex(profileEntry.account, `profile ${name}`) });
    }
  }

  const stringArg = (value: string) => `string:${value}`;

  for (const entry of config.nonprofits ?? []) {
    await aptosRun(`${tenantAddress}::nonprofit_registry::set_cause`, [
      stringArg(entry.slug),
      `address:${ensureHex(entry.payout, "payout")}`,
    ], aptosOpts);
  }

  if (config.tenantFaucetAmount && config.tenantFaucetAmount > 0) {
    await aptosRun(`${tenantAddress}::usdc_demo::faucet_mint`, [
      `address:${tenantAddress}`,
      `u64:${config.tenantFaucetAmount}`,
    ], aptosOpts);
  }

  const metadataAddressView = await aptosView(`${tenantAddress}::usdc_demo::metadata_address`, [], aptosOpts);
  const usdcMetadataAddress = ensureHex(metadataAddressView?.[0], "usdcMetadataAddress");

  const addressesPayload = {
    network,
    restUrl: apiRestUrl,
    tenantAddress,
    usdcMetadataAddress,
    explorerBase: "https://explorer.aptoslabs.com",
  } satisfies ChainAddressesPayload;

  await writeFile(addressesJsonPath, `${JSON.stringify(addressesPayload, null, 2)}\n`);

  const envUpdates: Record<string, string> = {
    TENANT_ADDRESS: tenantAddress,
    USDC_METADATA_ADDRESS: usdcMetadataAddress,
    APTOS_NETWORK: network,
    APTOS_REST_URL: apiRestUrl,
  };

  const setLive = args.setLiveFlags ?? config.setLiveFlags ?? false;
  config.setLiveFlags = setLive;
  if (setLive) {
    envUpdates.DONATION_LIVE = "true";
  }

  await updateEnvFile(envPath, envUpdates);

  const clientEnvUpdates: Record<string, string> = {
    VITE_APTOS_NETWORK: network,
    VITE_APTOS_REST_URL: apiRestUrl,
  };
  if (setLive) clientEnvUpdates.VITE_DONATION_LIVE = "true";
  await updateEnvFile(envPath, clientEnvUpdates);

  if (!config.profile) {
    delete config.profile;
  }
  await writeFile(args.configPath, `${JSON.stringify(config, null, 2)}\n`);
  if (!configExists) {
    console.log(`Created config file at ${args.configPath}`);
  }

  console.log("\nDeployment summary:");
  console.log(`  Network:           ${network}`);
  console.log(`  Tenant address:    ${tenantAddress}`);
  console.log(`  Metadata address:  ${usdcMetadataAddress}`);
  console.log(`  Nonprofits set:    ${(config.nonprofits ?? []).length}`);
  console.log(`  Faucet minted:     ${config.tenantFaucetAmount ?? 0}`);
  console.log(`  Live flags set:    ${setLive ? "yes" : "no"}`);
  console.log(`  Updated files:     server/data/addresses.json, .env`);
}

main().catch((error) => {
  console.error("\nDeployment failed:", error.message ?? error);
  process.exit(1);
});
