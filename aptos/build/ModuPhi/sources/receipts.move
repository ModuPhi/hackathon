module dg_tenant::receipts {
    use std::signer;
    use std::string::String;

    use aptos_framework::account;
    use aptos_framework::event;

    const E_NOT_TENANT: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_INITIALIZED: u64 = 3;

    public struct DonationReceipt has copy, drop, store {
        tenant: address,
        user: address,
        cause_id: String,
        amount: u64,
        tx_meta: vector<u8>,
    }

    struct DonationReceipts has key {
        handle: event::EventHandle<DonationReceipt>,
    }

    public entry fun init(account: &signer) {
        let addr = signer::address_of(account);
        assert!(addr == @dg_tenant, E_NOT_TENANT);
        assert!(!exists<DonationReceipts>(addr), E_ALREADY_INITIALIZED);

        let handle = account::new_event_handle<DonationReceipt>(account);
        move_to(account, DonationReceipts { handle });
    }

    public fun emit_donation_receipt(
        tenant: address,
        user: address,
        cause_id: String,
        amount: u64,
        tx_meta: vector<u8>
    ) acquires DonationReceipts {
        assert!(exists<DonationReceipts>(tenant), E_NOT_INITIALIZED);
        let receipts = borrow_global_mut<DonationReceipts>(tenant);
        let receipt = DonationReceipt {
            tenant,
            user,
            cause_id,
            amount,
            tx_meta,
        };
        event::emit_event(&mut receipts.handle, receipt);
    }

    #[test_only]
    public fun test_emitted(tenant: address): vector<DonationReceipt> acquires DonationReceipts {
        let receipts = borrow_global<DonationReceipts>(tenant);
        event::emitted_events_by_handle(&receipts.handle)
    }

    #[view]
    public fun is_initialized(): bool {
        exists<DonationReceipts>(@dg_tenant)
    }
}
