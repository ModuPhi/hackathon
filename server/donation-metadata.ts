type DonationMetadata = {
  aptosAddress: string;
  causeName?: string | null;
  causeSlug?: string | null;
};

class DonationMetadataStore {
  private store = new Map<string, DonationMetadata>();

  set(hash: string, metadata: DonationMetadata): void {
    this.store.set(hash.toLowerCase(), {
      aptosAddress: metadata.aptosAddress.toLowerCase(),
      causeName: metadata.causeName ?? null,
      causeSlug: metadata.causeSlug ?? null,
    });
  }

  get(hash: string): DonationMetadata | undefined {
    return this.store.get(hash.toLowerCase());
  }

  reset(): void {
    this.store.clear();
  }
}

export const donationMetadataStore = new DonationMetadataStore();
