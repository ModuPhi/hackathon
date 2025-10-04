module dg_tenant::usdc_demo {
    use std::option;
    use std::signer;
    use std::string;

    use aptos_framework::fungible_asset::{Metadata, MintRef};
    use aptos_framework::object;
    use aptos_framework::primary_fungible_store;

    const E_NOT_TENANT: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_INITIALIZED: u64 = 3;

    const ASSET_NAME: vector<u8> = b"Dev USDC";
    const ASSET_SYMBOL: vector<u8> = b"dUSDC";
    const METADATA_SEED: vector<u8> = b"dg_usdc_metadata";

    struct ManagedAsset has key {
        metadata_address: address,
        mint_ref: MintRef,
    }

    public entry fun init(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @dg_tenant, E_NOT_TENANT);
        assert!(!exists<ManagedAsset>(admin_addr), E_ALREADY_INITIALIZED);

        let constructor_ref = object::create_named_object(admin, METADATA_SEED);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none(),
            string::utf8(ASSET_NAME),
            string::utf8(ASSET_SYMBOL),
            6,
            string::utf8(b"https://example.com/icon.png"),
            string::utf8(b"https://example.com"),
        );

        let metadata = object::object_from_constructor_ref<Metadata>(&constructor_ref);
        let metadata_address = object::object_address(&metadata);
        let mint_ref = aptos_framework::fungible_asset::generate_mint_ref(&constructor_ref);

        move_to(admin, ManagedAsset { metadata_address, mint_ref });
    }

    public entry fun faucet_mint(_caller: &signer, recipient: address, amount: u64) acquires ManagedAsset {
        assert!(exists<ManagedAsset>(@dg_tenant), E_NOT_INITIALIZED);
        let asset = borrow_global<ManagedAsset>(@dg_tenant);
        primary_fungible_store::mint(&asset.mint_ref, recipient, amount);
    }

    #[view]
    public fun metadata_address(): address acquires ManagedAsset {
        borrow_global<ManagedAsset>(@dg_tenant).metadata_address
    }
    public fun metadata_object(): object::Object<Metadata> acquires ManagedAsset {
        object::address_to_object<Metadata>(metadata_address())
    }

    #[view]
    public fun is_initialized(): bool {
        exists<ManagedAsset>(@dg_tenant)
    }

}
