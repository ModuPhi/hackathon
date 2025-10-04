module dg_tenant::donation_tests {
    use std::signer;
    use std::string;
    use std::string::String;
    use std::vector;

    use aptos_framework::primary_fungible_store;

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
