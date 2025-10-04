module dg_tenant::nonprofit_registry {
    use std::option::{Self as option, Option};
    use std::signer;
    use std::string::{Self as string, String};

    use aptos_std::simple_map::{Self as simple_map, SimpleMap};

    const E_NOT_TENANT: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNKNOWN_CAUSE: u64 = 3;

    friend dg_tenant::user_vault;

    struct Registry has key {
        payouts: SimpleMap<String, address>,
    }

    public entry fun init(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @dg_tenant, E_NOT_TENANT);
        assert!(!exists<Registry>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, Registry { payouts: simple_map::new() });
    }

    public entry fun set_cause(admin: &signer, cause_id: String, payout: address) acquires Registry {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @dg_tenant, E_NOT_TENANT);

        let registry = borrow_global_mut<Registry>(admin_addr);
        if (simple_map::contains_key(&registry.payouts, &cause_id)) {
            *simple_map::borrow_mut(&mut registry.payouts, &cause_id) = payout;
        } else {
            simple_map::add(&mut registry.payouts, cause_id, payout);
        }
    }

    public entry fun unset_cause(admin: &signer, cause_id: String) acquires Registry {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @dg_tenant, E_NOT_TENANT);

        let registry = borrow_global_mut<Registry>(admin_addr);
        assert!(simple_map::contains_key(&registry.payouts, &cause_id), E_UNKNOWN_CAUSE);
        simple_map::remove(&mut registry.payouts, &cause_id);
    }

    #[view]
    public fun get_payout(cause_id_bytes: vector<u8>): Option<address> acquires Registry {
        if (!exists<Registry>(@dg_tenant)) {
            return option::none();
        };
        let registry = borrow_global<Registry>(@dg_tenant);
        let cause_id = string::utf8(cause_id_bytes);
        if (simple_map::contains_key(&registry.payouts, &cause_id)) {
            option::some(*simple_map::borrow(&registry.payouts, &cause_id))
        } else {
            option::none()
        }
    }

    public(friend) fun get_payout_or_abort(cause_id: &String): address acquires Registry {
        assert!(exists<Registry>(@dg_tenant), E_UNKNOWN_CAUSE);
        let registry = borrow_global<Registry>(@dg_tenant);
        assert!(simple_map::contains_key(&registry.payouts, cause_id), E_UNKNOWN_CAUSE);
        *simple_map::borrow(&registry.payouts, cause_id)
    }

    #[view]
    public fun is_initialized(): bool {
        exists<Registry>(@dg_tenant)
    }
}
