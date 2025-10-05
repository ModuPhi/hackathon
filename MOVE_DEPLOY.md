# Move Deployment Guide

This project now has a one-command deployment workflow that builds, publishes, and seeds the on-chain contracts used by SPEC 3.0.0. Follow the steps below whenever you spin up a fresh environment.

> **Before you start**
> - Install the [Aptos CLI](https://aptos.dev/en/build/install-cli)
> - Run `aptos init --profile tenant --network testnet` inside the repo to configure the tenant account (or choose a different profile/network in the config file described below)
> - Make sure the account has enough APT for publishing transactions
>
> The commands below assume `testnet`, but the script works against any network the CLI supports.

## 1. Create a deployment config

Copy the sample config and tailor it to your environment:

```bash
cp scripts/deploy.config.sample.json deploy.config.json
```

Edit `deploy.config.json` with:
- `network`: `testnet`, `devnet`, or `local`
- `profile`: the Aptos CLI profile (default `tenant`)
- `tenantAddress`: your tenant account address (if omitted, the script resolves it from the profile)
- `tenantFaucetAmount`: how much dev USDC to mint into the tenant’s primary store (micro USDC)
- `nonprofits`: list of `{ slug, payout }` mappings to publish on-chain
- `setLiveFlags`: `true` if you want the script to flip `DONATION_LIVE`/`VITE_DONATION_LIVE` to `true`

Optional: add `users` if you want the script to attempt an initial top-up, but the normal login bootstrap now handles funding automatically.

## 2. Run the deployment script

You can either reference a config file:

```bash
npm run deploy -- --config deploy.config.json
```

or skip the file entirely and supply flags inline, for example:

```bash
npm run deploy -- \
  --tenant-address 0xYOUR_TENANT \
  --nonprofit education-for-all:0xPAYOUT1 \
  --nonprofit clean-water-initiative:0xPAYOUT2
```

The script will:
1. Run Move unit tests (including the JourneyOutput emission test)
2. Publish the `usdc_demo`, `nonprofit_registry`, `receipts`, `journey_audit`, and `user_vault` modules
3. Initialize the dev USDC metadata, registry, receipt event handle, and `journey_audit` event handle (skipped automatically if already initialized)
4. Register nonprofits from your config; if you omit them, profiles in `~/.aptos/config.yaml` (e.g. `education-for-all`) are added automatically
5. Mint dev USDC into the tenant account (demo faucet)
6. Update `server/data/addresses.json` and `.env` with the tenant and metadata addresses (and flip the live flags if you told it to)
7. Persist the explorer base so the `/api/verify/:txHash` endpoint can generate deep links

Common flags:
- `--tenant-address 0x...` — supply the tenant address directly (script will resolve from the CLI profile otherwise)
- `--profile tenant` / `--network testnet` — override defaults when necessary
- `--nonprofit slug:address` — repeatable; registers nonprofits without editing the config file
- `--tenant-faucet 1000000000` — set how much dev USDC (in micro units) to mint to the tenant
- `--set-live-flags` — flip `DONATION_LIVE`/`VITE_DONATION_LIVE` to `true` after deployment

The summary printed at the end shows the on-chain addresses and transactions executed.

## 3. Expose the tenant signer to the server (demo only)

For the automatic vault bootstrap to work, the server needs the tenant’s signer key. **Never do this in production**, but for this demo set:

```env
TENANT_ADDRESS=0x...
USDC_METADATA_ADDRESS=0x...
TENANT_PRIVATE_KEY=0x<tenant_private_key_hex>
```

These values are written automatically by the deployment script; just fill in the private key. The private key is only used to mint dev USDC and top up user vaults on demand.

## 4. Launch the app

```bash
npm run dev
```

When a user signs in via Keyless:
1. The client calls `<tenant>::user_vault::ensure_user_vault` (user-signed) to create their vault object if it doesn’t exist
2. The server endpoint `/api/chain/bootstrap-vault` (tenant-signed) mints and transfers enough dev USDC to ensure the vault holds 1000 dUSDC

From that point onward, the Journey donate step will submit real transactions (`ensure_user_vault` is idempotent and called again just before donation for safety). Donation receipts include the transaction hash and are linked to the Aptos explorer in the UI.

## Manual commands (optional reference)

If you prefer to run everything manually instead of using the script, these are the key commands; replace `TENANT_ADDRESS` as needed:

```bash
aptos move publish --named-addresses dg_tenant=<TENANT_ADDRESS> --assume-yes
aptos move run --function <TENANT_ADDRESS>::usdc_demo::init --assume-yes
aptos move run --function <TENANT_ADDRESS>::nonprofit_registry::init --assume-yes
aptos move run --function <TENANT_ADDRESS>::receipts::init --assume-yes
aptos move run --function <TENANT_ADDRESS>::journey_audit::init --assume-yes
aptos move run --function <TENANT_ADDRESS>::nonprofit_registry::set_cause --assume-yes --args vector<u8>:"education-for-all" address:<PAYOUT_ADDRESS>
aptos move run --function <TENANT_ADDRESS>::usdc_demo::faucet_mint --assume-yes --args address:<TENANT_ADDRESS> u64:1000000000
aptos move run --function <TENANT_ADDRESS>::user_vault::fund_user_vault --assume-yes --args address:<USER_ADDRESS> u64:1000000000
```

You can always check the dev USDC metadata address with:

```bash
aptos move view --function <TENANT_ADDRESS>::usdc_demo::metadata_address --json
```

Save the result into `server/data/addresses.json` and `.env` if you maintain the files manually.

---

That’s it. Deploy with the script, set your env secrets, and every login will automatically provision and fund the user’s vault.
