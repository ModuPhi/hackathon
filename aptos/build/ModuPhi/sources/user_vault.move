module dg_tenant::user_vault {
    use std::signer;
    use std::string;
    use std::string::String;
    use std::vector;

    use aptos_framework::fungible_asset::{Self as fungible_asset, FungibleStore, Metadata};
    use aptos_framework::object;
    use aptos_framework::primary_fungible_store;

    use dg_tenant::journey_audit;
    use dg_tenant::nonprofit_registry;
    use dg_tenant::receipts;
    use dg_tenant::usdc_demo;

    const E_NOT_TENANT: u64 = 1;
    const E_ZERO_AMOUNT: u64 = 2;
    const E_VAULT_MISSING: u64 = 3;

    const VAULT_SEED: vector<u8> = b"dg_user_vault";

    public entry fun ensure_user_vault(user: &signer) {
        let user_addr = signer::address_of(user);
        let vault_addr = user_vault_address(user_addr);
        if (object::is_object(vault_addr)) {
            return;
        };
        let constructor_ref = object::create_named_object(user, VAULT_SEED);
        let metadata = usdc_demo::metadata_object();
        fungible_asset::create_store(&constructor_ref, metadata);
    }

    public entry fun fund_user_vault(tenant: &signer, user_addr: address, amount: u64) {
        assert!(signer::address_of(tenant) == @dg_tenant, E_NOT_TENANT);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let vault_addr = user_vault_address(user_addr);
        assert!(object::is_object(vault_addr), E_VAULT_MISSING);

        let store = object::address_to_object<FungibleStore>(vault_addr);

        let asset = primary_fungible_store::withdraw(tenant, usdc_demo::metadata_object(), amount);
        fungible_asset::deposit(store, asset);
    }

    public entry fun donate(
        user: &signer,
        amount: u64,
        cause_id: String,
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);

        let user_addr = signer::address_of(user);
        let vault_addr = user_vault_address(user_addr);
        assert!(object::is_object(vault_addr), E_VAULT_MISSING);

        let store = object::address_to_object<FungibleStore>(vault_addr);
        let payout_addr = nonprofit_registry::get_payout_or_abort(&cause_id);

        let asset = fungible_asset::withdraw(user, store, amount);
        primary_fungible_store::deposit(payout_addr, asset);

        receipts::emit_donation_receipt(
            @dg_tenant,
            user_addr,
            cause_id,
            amount,
            vector::empty<u8>(),
        );

        let entry = journey_audit::new_entry(
            string::utf8(b"donation"),
            usdc_demo::metadata_address(),
            amount,
            false,
        );
        let entries = vector::singleton(entry);
        journey_audit::emit_output_internal(
            @dg_tenant,
            user_addr,
            string::utf8(b"lend-and-donate@v1"),
            entries,
        );
    }

    public fun user_vault_address(user_addr: address): address {
        object::create_object_address(&user_addr, VAULT_SEED)
    }

    public fun metadata_object(): object::Object<Metadata> {
        usdc_demo::metadata_object()
    }
}
