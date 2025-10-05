module dg_tenant::donation_tests {
    use std::signer;
    use std::string;
    use std::string::String;
    use std::vector;

    use aptos_framework::primary_fungible_store;

    use dg_tenant::journey_audit;
    use dg_tenant::nonprofit_registry;
    use dg_tenant::receipts;
    use dg_tenant::user_vault;
    use dg_tenant::usdc_demo;

    const FUND_AMOUNT: u64 = 1_000_000;
    const DONATION_AMOUNT: u64 = 250_000;

    fun default_cause(): String {
        string::utf8(b"education-for-all")
    }

    fun setup_environment(tenant: &signer, user: &signer, payout: &signer) {
        if (!usdc_demo::is_initialized()) {
            usdc_demo::init(tenant);
        };
        if (!nonprofit_registry::is_initialized()) {
            nonprofit_registry::init(tenant);
        };
        if (!receipts::is_initialized()) {
            receipts::init(tenant);
        };
        if (!journey_audit::is_initialized()) {
            journey_audit::init(tenant);
        };

        nonprofit_registry::set_cause(
            tenant,
            default_cause(),
            signer::address_of(payout),
        );

        user_vault::ensure_user_vault(user);

        usdc_demo::faucet_mint(tenant, signer::address_of(tenant), FUND_AMOUNT);
        user_vault::fund_user_vault(tenant, signer::address_of(user), FUND_AMOUNT);
    }

    #[test(tenant = @dg_tenant, user = @0x2, payout = @0x3)]
    fun donate_happy_path(tenant: &signer, user: &signer, payout: &signer) {
        setup_environment(tenant, user, payout);

        let payout_addr = signer::address_of(payout);
        let metadata = usdc_demo::metadata_object();

        user_vault::donate(user, DONATION_AMOUNT, default_cause());

        let payout_balance = primary_fungible_store::balance(payout_addr, metadata);
        assert!(payout_balance == DONATION_AMOUNT, 0);

        let receipts_vec = receipts::test_emitted(@dg_tenant);
        assert!(vector::length(&receipts_vec) == 1, 1);

        let outputs = journey_audit::test_emitted(@dg_tenant);
        assert!(vector::length(&outputs) == 1, 2);
        let output = vector::borrow(&outputs, 0);
        let (tenant_addr, user_addr, journey_id, tx_meta, schema_version) =
            journey_audit::journey_output_snapshot(output);
        assert!(tenant_addr == @dg_tenant, 3);
        assert!(user_addr == signer::address_of(user), 4);
        assert!(journey_id == string::utf8(b"lend-and-donate@v1"), 5);
        assert!(schema_version == 1, 6);
        assert!(tx_meta == string::utf8(b""), 7);

        let entries = journey_audit::journey_output_entries(output);
        assert!(vector::length(&entries) == 1, 8);
        let entry = vector::borrow(&entries, 0);
        let (kind, asset_metadata, entry_amount, direction) = journey_audit::entry_snapshot(entry);
        assert!(kind == string::utf8(b"donation"), 9);
        assert!(asset_metadata == usdc_demo::metadata_address(), 10);
        assert!(entry_amount == DONATION_AMOUNT, 11);
        assert!(!direction, 12);
    }

    #[test(tenant = @dg_tenant, user = @0x2, payout = @0x3)]
    #[expected_failure(location = dg_tenant::user_vault, abort_code = 2)]
    fun donate_zero_amount_fails(tenant: &signer, user: &signer, payout: &signer) {
        setup_environment(tenant, user, payout);
        user_vault::donate(user, 0, default_cause());
    }

    #[test(tenant = @dg_tenant, user = @0x2, payout = @0x3)]
    #[expected_failure(location = dg_tenant::user_vault, abort_code = 3)]
    fun donate_without_vault_fails(tenant: &signer, user: &signer, payout: &signer) {
        if (!usdc_demo::is_initialized()) {
            usdc_demo::init(tenant);
        };
        if (!nonprofit_registry::is_initialized()) {
            nonprofit_registry::init(tenant);
        };
        nonprofit_registry::set_cause(tenant, default_cause(), signer::address_of(payout));
        usdc_demo::faucet_mint(tenant, signer::address_of(tenant), FUND_AMOUNT);
        // user_vault::ensure_user_vault intentionally skipped
        user_vault::donate(user, DONATION_AMOUNT, default_cause());
    }
}
