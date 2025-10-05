import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Aptos,
  AptosConfig,
  EphemeralKeyPair,
  KeylessAccount,
  Network,
  type AnyRawTransaction,
  type ProofFetchStatus,
} from "@aptos-labs/ts-sdk";
import { queryClient } from "../lib/queryClient";

type SessionUser = {
  sub: string;
  name?: string;
  email?: string;
};

type SessionTenant = {
  id: string;
};

type SessionState = {
  account: KeylessAccount;
  ephemeralKeyPair: EphemeralKeyPair;
  user: SessionUser;
  aptosAddress: string;
};

type KeylessContextValue = {
  isAuthenticated: boolean;
  loading: boolean;
  user: SessionUser | null;
  tenant: SessionTenant | null;
  aptosAddress: string | null;
  aptosClient: Aptos;
  signMessage: (message: string | Uint8Array) => Promise<string>;
  signTransaction: (transaction: AnyRawTransaction) => Promise<string>;
  signAndSubmitTransaction: (transaction: AnyRawTransaction) => Promise<string>;
  login: () => Promise<void>;
  logout: () => void;
};

const DEFAULT_TENANT: SessionTenant = { id: "default-tenant" };
const STORAGE_KEY = "keyless_state_v1";

interface StoredKeylessState {
  account?: string;
  ephemeralKeyPair?: string;
  oauthState?: string;
  user?: SessionUser;
}

const KeylessContext = createContext<KeylessContextValue | undefined>(undefined);

const textEncoder = new TextEncoder();

const isBrowser = typeof window !== "undefined";

function normalizeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = normalized.length % 4;
  if (paddingNeeded === 0) return normalized;
  return normalized.concat("=".repeat(4 - paddingNeeded));
}

function decodeIdToken(idToken: string): SessionUser {
  const [, payload] = idToken.split(".");
  if (!payload) {
    throw new Error("Invalid ID token – missing payload");
  }
  const decoded = normalizeBase64Url(payload);
  const binary = isBrowser ? atob(decoded) : Buffer.from(decoded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const json = JSON.parse(new TextDecoder().decode(bytes));
  return {
    sub: json.sub,
    name: json.name ?? undefined,
    email: json.email ?? undefined,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  if (!isBrowser) {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (!isBrowser) {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function loadStoredState(): StoredKeylessState | null {
  if (!isBrowser) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredKeylessState;
  } catch (error) {
    console.warn("Failed to parse stored keyless state", error);
    return null;
  }
}

function resolveNetwork(value?: string): Network {
  switch ((value ?? "testnet").toLowerCase()) {
    case "mainnet":
      return Network.MAINNET;
    case "devnet":
      return Network.DEVNET;
    case "testnet":
    default:
      return Network.TESTNET;
  }
}

function useAptosClient(): Aptos {
  const network = resolveNetwork(import.meta.env.VITE_APTOS_NETWORK as string | undefined);
  const restUrl = import.meta.env.VITE_APTOS_REST_URL as string | undefined;

  return useMemo(() => {
    return new Aptos(
      new AptosConfig({
        network,
        fullnode: restUrl,
      }),
    );
  }, [network, restUrl]);
}

function createSessionFromStored(state: StoredKeylessState | null): SessionState | null {
  if (!state?.account || !state.ephemeralKeyPair) {
    return null;
  }
  try {
    const accountBytes = base64ToBytes(state.account);
    const keyPairBytes = base64ToBytes(state.ephemeralKeyPair);
    const account = KeylessAccount.fromBytes(accountBytes);
    const ephemeralKeyPair = EphemeralKeyPair.fromBytes(keyPairBytes);
    if (account.isExpired() || ephemeralKeyPair.isExpired()) {
      return null;
    }
    const aptosAddress = account.accountAddress.toString();
    const user = state.user ?? { sub: account.uidVal };
    return { account, ephemeralKeyPair, user, aptosAddress };
  } catch (error) {
    console.warn("Failed to reconstruct keyless session", error);
    return null;
  }
}

export function createEphemeralKeyPair(): EphemeralKeyPair {
  return EphemeralKeyPair.generate();
}

export function KeylessProvider({ children }: { children: React.ReactNode }) {
  const aptosClient = useAptosClient();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const storageRef = useRef<StoredKeylessState>({});

  const setStoredState = useCallback(
    (updates: Partial<StoredKeylessState>, options?: { replace?: boolean }) => {
      if (!isBrowser) return;
      const base = options?.replace ? {} : { ...storageRef.current };
      const next: StoredKeylessState = { ...base };
      (Object.keys(updates) as (keyof StoredKeylessState)[]).forEach((key) => {
        const value = updates[key];
        if (value === undefined || value === null) {
          delete next[key];
        } else {
          (next as Record<string, unknown>)[key as string] = value;
        }
      });
      storageRef.current = next;
      if (Object.keys(next).length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    },
    [],
  );

  const persistSession = useCallback(
    (data: SessionState) => {
      setStoredState(
        {
          account: bytesToBase64(data.account.bcsToBytes()),
          ephemeralKeyPair: bytesToBase64(data.ephemeralKeyPair.bcsToBytes()),
          user: data.user,
          oauthState: undefined,
        },
        { replace: false },
      );
      setSession(data);
    },
    [setStoredState],
  );

  const clearSession = useCallback(() => {
    setSession(null);
    setStoredState({}, { replace: true });
  }, [setStoredState]);

  const processIdToken = useCallback(
    async (idToken: string, returnedState: string | null) => {
      if (!storageRef.current.ephemeralKeyPair) {
        console.error("Missing stored ephemeral key pair; please try logging in again.");
        clearSession();
        return;
      }

      if (storageRef.current.oauthState && storageRef.current.oauthState !== returnedState) {
        console.error("Login state mismatch; discarding response.");
        clearSession();
        return;
      }

      const ephemeralBytes = base64ToBytes(storageRef.current.ephemeralKeyPair);
      const ephemeralKeyPair = EphemeralKeyPair.fromBytes(ephemeralBytes);
      if (ephemeralKeyPair.isExpired()) {
        console.error("Stored ephemeral key pair expired; please login again.");
        clearSession();
        return;
      }

      try {
        const user = decodeIdToken(idToken);
        const proofFetchCallback = async (status: ProofFetchStatus) => {
          if (status.status === "Failed") {
            console.error("Proof fetch failed", status.error);
            clearSession();
          }
        };

        const derived = await aptosClient.keyless.deriveKeylessAccount({
          jwt: idToken,
          ephemeralKeyPair,
          proofFetchCallback,
        });

        if (!(derived instanceof KeylessAccount)) {
          throw new Error("Unexpected keyless account type");
        }

        await derived.checkKeylessAccountValidity(aptosClient.config);

        const aptosAddress = derived.accountAddress.toString();
        // Debug: confirm keyless derivation
        // eslint-disable-next-line no-console
        console.log(`[Keyless] Derived Aptos address: ${aptosAddress}`);

        persistSession({
          account: derived,
          ephemeralKeyPair,
          user,
          aptosAddress,
        });
      } catch (error) {
        console.error("Failed to derive keyless account", error);
        clearSession();
      }
    },
    [aptosClient, clearSession, persistSession],
  );

  useEffect(() => {
    if (!isBrowser) return;

    // First, check for an OAuth response so we don't accidentally clear the
    // ephemeral key pair before we process the returned id_token.
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (hash) {
      const params = new URLSearchParams(hash);
      const error = params.get("error");
      if (error) {
        console.error("Google login error", error);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        clearSession();
        setLoading(false);
        return;
      }

      const idToken = params.get("id_token");
      const returnedState = params.get("state");
      if (idToken) {
        // Ensure local storage is loaded so we can access the ephemeral key pair
        const stored = loadStoredState();
        if (stored) {
          storageRef.current = stored;
        }
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        processIdToken(idToken, returnedState).finally(() => {
          setLoading(false);
        });
        return;
      }
    }

    // No OAuth response; attempt to restore a full session from storage.
    const stored = loadStoredState();
    if (stored) {
      storageRef.current = stored;
      const restored = createSessionFromStored(stored);
      if (restored) {
        setSession(restored);
      } else {
        // If we only have an ephemeral key pair saved (no account yet), keep it so a
        // subsequent OAuth response can use it. Otherwise, clear invalid state.
        if (!stored.ephemeralKeyPair) {
          clearSession();
        }
      }
    }

    setLoading(false);
  }, [clearSession, processIdToken]);

  const login = useCallback(async () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    const appBaseUrl = import.meta.env.VITE_APP_BASE_URL as string | undefined;

    if (!googleClientId) {
      console.error("Missing VITE_GOOGLE_CLIENT_ID environment variable");
      return;
    }

    if (!isBrowser) return;

    const ephemeralKeyPair = createEphemeralKeyPair();
    const oauthState = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

    setStoredState(
      {
        ephemeralKeyPair: bytesToBase64(ephemeralKeyPair.bcsToBytes()),
        oauthState,
        account: undefined,
        user: undefined,
      },
      { replace: true },
    );

    const redirectUri = appBaseUrl || window.location.origin;
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.search = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce: ephemeralKeyPair.nonce,
      state: oauthState,
    }).toString();

    window.location.assign(authUrl.toString());
  }, [setStoredState]);

  const resetDemoState = useCallback(async () => {
    if (!isBrowser) return;
    try {
      await fetch("/api/demo/reset", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to reset demo state", error);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isBrowser) return;
    await resetDemoState();
    clearSession();
    queryClient.clear();
  }, [clearSession, resetDemoState]);

  const signMessage = useCallback(
    async (message: string | Uint8Array) => {
      if (!session) {
        throw new Error("Signer unavailable. Please sign in.");
      }

      await session.account.checkKeylessAccountValidity(aptosClient.config);
      const payload = typeof message === "string" ? textEncoder.encode(message) : message;
      return session.account.sign(payload).toString();
    },
    [aptosClient.config, session],
  );

  const signTransaction = useCallback(
    async (transaction: AnyRawTransaction) => {
      if (!session) {
        throw new Error("Signer unavailable. Please sign in.");
      }

      await session.account.checkKeylessAccountValidity(aptosClient.config);
      return session.account.signTransaction(transaction).toString();
    },
    [aptosClient.config, session],
  );

  const signAndSubmitTransaction = useCallback(
    async (transaction: AnyRawTransaction) => {
      if (!session) {
        throw new Error("Signer unavailable. Please sign in.");
      }

      await session.account.checkKeylessAccountValidity(aptosClient.config);
      const pending = await aptosClient.transaction.signAndSubmitTransaction({
        signer: session.account,
        transaction,
      });
      return pending.hash;
    },
    [aptosClient, session],
  );

  const value: KeylessContextValue = {
    isAuthenticated: !!session,
    loading,
    user: session?.user ?? null,
    tenant: session ? DEFAULT_TENANT : null,
    aptosAddress: session?.aptosAddress ?? null,
    aptosClient,
    signMessage,
    signTransaction,
    signAndSubmitTransaction,
    login,
    logout,
  };

  useEffect(() => {
    if (session?.aptosAddress) {
      // eslint-disable-next-line no-console
      console.info(`[keyless] logged in as ${session.aptosAddress}`);
    }
  }, [session?.aptosAddress]);

  const ensuredVaultForAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const address = session?.aptosAddress;
    if (!address) {
      ensuredVaultForAddressRef.current = null;
      return;
    }

    if (ensuredVaultForAddressRef.current === address) {
      return;
    }

    ensuredVaultForAddressRef.current = address;

    (async () => {
      try {
        const response = await fetch("/api/chain/bootstrap-vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });

        if (!response.ok) {
          const message = await response.text();
          console.warn("Failed to bootstrap user vault", response.status, message);
        }
      } catch (error) {
        console.warn("Error bootstrapping user vault", error);
      }
    })();
  }, [session?.aptosAddress]);

  return <KeylessContext.Provider value={value}>{children}</KeylessContext.Provider>;
}

export function useKeyless(): KeylessContextValue {
  const context = useContext(KeylessContext);
  if (!context) {
    throw new Error("useKeyless must be used within a KeylessProvider");
  }
  return context;
}
