module dg_tenant::journey_audit {
    use std::signer;
    use std::string;
    use std::string::String;
    use std::vector;

    use aptos_framework::account;
    use aptos_framework::event;

    const E_NOT_TENANT: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_INITIALIZED: u64 = 3;
    const E_ENTRY_VECTOR_MISMATCH: u64 = 4;

    friend dg_tenant::user_vault;

    public struct Entry has copy, drop, store {
        kind: String,
        asset_metadata: address,
        amount: u64,
        direction: bool,
    }

    public struct JourneyOutput has copy, drop, store {
        tenant: address,
        user: address,
        journey_id: String,
        entries: vector<Entry>,
        tx_meta: String,
        schema_version: u16,
    }

    struct JourneyOutputEvents has key {
        handle: event::EventHandle<JourneyOutput>,
    }

    public entry fun init(tenant: &signer) {
        let tenant_addr = signer::address_of(tenant);
        assert!(tenant_addr == @dg_tenant, E_NOT_TENANT);
        assert!(!exists<JourneyOutputEvents>(tenant_addr), E_ALREADY_INITIALIZED);

        let handle = account::new_event_handle<JourneyOutput>(tenant);
        move_to(tenant, JourneyOutputEvents { handle });
    }

    public entry fun emit_output(
        tenant: &signer,
        user: address,
        journey_id: String,
        kinds: vector<vector<u8>>,
        asset_metadata: vector<address>,
        amounts: vector<u64>,
        directions: vector<bool>,
    ) acquires JourneyOutputEvents {
        let tenant_addr = signer::address_of(tenant);
        assert!(tenant_addr == @dg_tenant, E_NOT_TENANT);

        let len = vector::length(&asset_metadata);
        assert!(
            len == vector::length(&kinds)
                && len == vector::length(&amounts)
                && len == vector::length(&directions),
            E_ENTRY_VECTOR_MISMATCH,
        );

        let entries = vector::empty<Entry>();
        let i = 0;
        while (i < len) {
            let kind_bytes = vector::borrow(&kinds, i);
            let kind = bytes_to_string(kind_bytes);
            let metadata_addr = *vector::borrow(&asset_metadata, i);
            let amount = *vector::borrow(&amounts, i);
            let direction = *vector::borrow(&directions, i);
            let entry = Entry {
                kind,
                asset_metadata: metadata_addr,
                amount,
                direction,
            };
            vector::push_back(&mut entries, entry);
            i = i + 1;
        };

        emit_output_internal(tenant_addr, user, journey_id, entries);
    }

    public(friend) fun emit_output_internal(
        tenant: address,
        user: address,
        journey_id: String,
        entries: vector<Entry>,
    ) acquires JourneyOutputEvents {
        assert!(exists<JourneyOutputEvents>(tenant), E_NOT_INITIALIZED);
        let events = borrow_global_mut<JourneyOutputEvents>(tenant);
        let output = JourneyOutput {
            tenant,
            user,
            journey_id,
            entries,
            tx_meta: string::utf8(b""),
            schema_version: 1,
        };
        event::emit_event(&mut events.handle, output);
    }

    fun bytes_to_string(bytes_ref: &vector<u8>): String {
        let buffer = vector::empty<u8>();
        let len = vector::length(bytes_ref);
        let i = 0;
        while (i < len) {
            let byte = *vector::borrow(bytes_ref, i);
            vector::push_back(&mut buffer, byte);
            i = i + 1;
        };
        string::utf8(buffer)
    }

    public(friend) fun new_entry(
        kind: String,
        asset_metadata: address,
        amount: u64,
        direction: bool,
    ): Entry {
        Entry { kind, asset_metadata, amount, direction }
    }

    #[test_only]
    public fun test_emitted(tenant: address): vector<JourneyOutput> acquires JourneyOutputEvents {
        let events = borrow_global<JourneyOutputEvents>(tenant);
        event::emitted_events_by_handle(&events.handle)
    }

    #[test_only]
    public fun journey_output_snapshot(output: &JourneyOutput): (address, address, String, String, u16) {
        (output.tenant, output.user, output.journey_id, output.tx_meta, output.schema_version)
    }

    #[test_only]
    public fun journey_output_entries(output: &JourneyOutput): vector<Entry> {
        output.entries
    }

    #[test_only]
    public fun entry_snapshot(entry: &Entry): (String, address, u64, bool) {
        (entry.kind, entry.asset_metadata, entry.amount, entry.direction)
    }

    #[view]
    public fun is_initialized(): bool {
        exists<JourneyOutputEvents>(@dg_tenant)
    }
}
