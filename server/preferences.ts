export type UserPreferences = {
  selectedNonprofit?: string | null;
  completedEffects: string[];
  effectsCompleted: number;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  selectedNonprofit: null,
  completedEffects: [],
  effectsCompleted: 0,
};

class PreferencesStore {
  private store = new Map<string, UserPreferences>();

  get(address: string): UserPreferences {
    const normalized = address.toLowerCase();
    const existing = this.store.get(normalized);
    if (existing) {
      return { ...existing };
    }
    return { ...DEFAULT_PREFERENCES };
  }

  update(address: string, updates: Partial<UserPreferences>): UserPreferences {
    const normalized = address.toLowerCase();
    const current = this.get(normalized);
    const next: UserPreferences = {
      ...current,
      ...updates,
      completedEffects: updates.completedEffects ?? current.completedEffects,
      effectsCompleted: updates.effectsCompleted ?? current.effectsCompleted,
    };
    this.store.set(normalized, next);
    return { ...next };
  }

  reset(): void {
    this.store.clear();
  }
}

export const preferencesStore = new PreferencesStore();
