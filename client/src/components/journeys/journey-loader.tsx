import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useKeyless } from "@/contexts/keyless-context";
import { usePortfolio } from "@/contexts/portfolio-context";
import type { JourneyManifestEntry } from "@/types/journeys";
import type { Portfolio } from "@shared/schema";
import { useJourneyRuns } from "@/hooks/use-journey-runs";
import type { Aptos } from "@aptos-labs/ts-sdk";

export type JourneyComponentProps = {
  isOpen: boolean;
  onClose: () => void;
  journeyId: string;
  auth: { userId: string; tenantId: string };
  keyless: {
    address: string;
    signMessage: (message: string | Uint8Array) => Promise<string>;
    signTransaction: (...args: any[]) => Promise<string>;
    signAndSubmitTransaction: (...args: any[]) => Promise<string>;
  };
  aptos: { client: Aptos };
  aptosClient: Aptos;
  availableLiquidity: number;
  capabilities: {
    portfolio: { merge: (updates: Partial<Portfolio>) => Promise<void> };
    receipts: { create: (receipt: { type: string; amount: number; cause?: string; reference: string }) => Promise<void> };
    donate?: { execute?: (...args: unknown[]) => Promise<void> };
  };
  telemetry: {
    onStart: (slug: string) => Promise<void>;
    onComplete: (slug: string) => Promise<void>;
    onAbort: (slug: string, reason?: string) => Promise<void>;
  };
};

type JourneyModule = { default: ComponentType<JourneyComponentProps> };

const SAME_ORIGIN_PATH_PREFIXES = ["@/", "./", "../"] as const;

type ModuleLoader = () => Promise<JourneyModule>;

const rawJourneyModuleLoaders = import.meta.glob<JourneyModule>("../../journeys/**/*.{tsx,ts,jsx,js}");

const EXTENSION_VARIANTS = ["", ".tsx", ".ts", ".jsx", ".js"] as const;

const journeyModuleLoaders: Record<string, ModuleLoader> = {};

Object.entries(rawJourneyModuleLoaders).forEach(([originalPath, loader]) => {
  const moduleLoader = loader as ModuleLoader;
  const normalized = originalPath.replace(/\\/g, "/");
  const withoutExt = normalized.replace(/\.(tsx|ts|jsx|js)$/i, "");
  const aliasPath = normalized.replace(/^\.\.\/\.\.\//, "@/");
  const aliasWithoutExt = aliasPath.replace(/\.(tsx|ts|jsx|js)$/i, "");

  const bases = new Set<string>([
    normalized,
    withoutExt,
    aliasPath,
    aliasWithoutExt,
  ]);

  bases.forEach((base) => {
    EXTENSION_VARIANTS.forEach((ext) => {
      const key = base.endsWith(ext) ? base : `${base}${ext}`;
      journeyModuleLoaders[key] = moduleLoader;
    });
  });
});

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.debug("[JourneyLoader] module registry", Object.keys(journeyModuleLoaders));
}

function resolveJourneyModule(importPath: string): ModuleLoader | undefined {
  const normalized = importPath.replace(/\\/g, "/");
  const candidateBases = new Set<string>([normalized]);

  candidateBases.add(normalized.replace(/\.(tsx|ts|jsx|js)$/i, ""));

  if (normalized.startsWith("@/")) {
    const rel = `../../${normalized.slice(2)}`;
    candidateBases.add(rel);
    candidateBases.add(rel.replace(/\.(tsx|ts|jsx|js)$/i, ""));
  }

  if (normalized.startsWith("./")) {
    const trimmed = normalized.replace(/^\.\//, "");
    const rel = `../../journeys/${trimmed}`;
    candidateBases.add(rel);
    candidateBases.add(rel.replace(/\.(tsx|ts|jsx|js)$/i, ""));
  }

  const candidates: string[] = [];
  candidateBases.forEach((base) => {
    EXTENSION_VARIANTS.forEach((ext) => {
      const key = base.endsWith(ext) ? base : `${base}${ext}`;
      candidates.push(key);
    });
  });

  for (const key of candidates) {
    const loader = journeyModuleLoaders[key];
    if (loader) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[JourneyLoader] resolved module", { importPath, key });
      }
      return loader;
    }
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[JourneyLoader] available module keys", Object.keys(journeyModuleLoaders));
    // eslint-disable-next-line no-console
    console.debug("[JourneyLoader] attempted candidates", candidates);
  }

  return undefined;
}

function isImportPathSameOrigin(importPath: string) {
  if (!importPath) return false;
  const lowered = importPath.toLowerCase();
  if (lowered.startsWith("http://") || lowered.startsWith("https://") || lowered.startsWith("data:")) {
    return false;
  }
  if (importPath.startsWith("//")) {
    return false;
  }
  return SAME_ORIGIN_PATH_PREFIXES.some((prefix) => importPath.startsWith(prefix));
}

type JourneyLoaderProps = {
  journey: JourneyManifestEntry | null;
  isOpen: boolean;
  onClose: () => void;
};

type JourneyErrorBoundaryProps = {
  fallback: ReactNode;
  onError: (error: Error) => void;
  children: ReactNode;
};

type JourneyErrorBoundaryState = {
  hasError: boolean;
};

class JourneyErrorBoundary extends Component<JourneyErrorBoundaryProps, JourneyErrorBoundaryState> {
  state: JourneyErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): JourneyErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  componentDidUpdate(prevProps: JourneyErrorBoundaryProps) {
    if (prevProps.fallback !== this.props.fallback && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function JourneyLoader({ journey, isOpen, onClose }: JourneyLoaderProps) {
  const {
    isAuthenticated,
    user,
    tenant,
    aptosAddress,
    signMessage,
    signTransaction,
    signAndSubmitTransaction,
    aptosClient,
  } = useKeyless();
  const { updatePortfolio, createReceipt, portfolio, registerReceiptJourney } = usePortfolio();
  const { refetch: refetchRuns } = useJourneyRuns();
  const [component, setComponent] = useState<ComponentType<JourneyComponentProps> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const startRecordedRef = useRef(false);
  const activeSlugRef = useRef<string | null>(null);

  const canProvideSession = Boolean(isAuthenticated && user?.sub && tenant?.id);

  const auth = useMemo(
    () => ({
      userId: user?.sub ?? "",
      tenantId: tenant?.id ?? "",
    }),
    [tenant?.id, user?.sub],
  );

  const resetState = useCallback(() => {
    setComponent(null);
    setLoadError(null);
    setIsLoading(false);
    startRecordedRef.current = false;
    activeSlugRef.current = null;
  }, []);

  const postRun = useCallback(
    async (path: "/api/journey-runs/start" | "/api/journey-runs/complete", slug: string) => {
      if (!canProvideSession) {
        throw new Error("Unauthorized");
      }
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": auth.userId,
          "x-tenant-id": auth.tenantId,
        },
        body: JSON.stringify({ slug }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed request to ${path}`);
      }
    },
    [auth.tenantId, auth.userId, canProvideSession],
  );

  const handleTelemetryStart = useCallback(
    async (slug: string) => {
      if (startRecordedRef.current) return;
      startRecordedRef.current = true;
      activeSlugRef.current = slug;
      try {
        await postRun("/api/journey-runs/start", slug);
      } catch (error) {
        console.error("Failed to record journey start", error);
      }
    },
    [postRun],
  );

  const handleTelemetryComplete = useCallback(
    async (slug: string) => {
      try {
        await postRun("/api/journey-runs/complete", slug);
        await refetchRuns();
      } catch (error) {
        console.error("Failed to record journey completion", error);
      }
    },
    [postRun, refetchRuns],
  );

  const handleTelemetryAbort = useCallback(
    async (slug: string, reason?: string) => {
      console.warn(`Journey ${slug} aborted`, reason);
      await refetchRuns();
    },
    [refetchRuns],
  );

  const journeyId = useMemo(() => (journey ? `${journey.slug}@v1` : ""), [journey]);
  const availableLiquidity = useMemo(() => portfolio?.credits ?? 0, [portfolio]);

  const createReceiptWithJourney = useCallback(async (
    receipt: { type: string; amount: number; cause?: string; reference: string },
  ) => {
    await createReceipt(receipt);
    if (journeyId) {
      registerReceiptJourney(receipt.reference, journeyId);
    }
  }, [createReceipt, journeyId, registerReceiptJourney]);

  useEffect(() => {
    if (!isOpen || !journey) {
      resetState();
      return;
    }

    if (!canProvideSession) {
      setLoadError("Sign in to begin a Journey.");
      return;
    }

    if (!isImportPathSameOrigin(journey.importPath)) {
      setLoadError("Journey manifest importPath must use a same-origin path (./, ../, or @/).");
      handleTelemetryAbort(journey.slug, "invalid-import-path");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setComponent(null);

    const load = async () => {
      try {
        await handleTelemetryStart(journey.slug);
        const loader = resolveJourneyModule(journey.importPath);
        if (!loader) {
          throw new Error(`No journey module registered for importPath: ${journey.importPath}`);
        }
        const mod: JourneyModule = await loader();
        const LoadedComponent = mod?.default;
        if (!LoadedComponent) {
          throw new Error("Journey module is missing a default export");
        }
        if (!cancelled) {
          setComponent(() => LoadedComponent);
        }
      } catch (error) {
        console.error("Failed to load journey module", error);
        if (!cancelled) {
          setLoadError("We couldn’t load this journey. Please return to your portfolio and try again.");
          handleTelemetryAbort(journey.slug, (error as Error)?.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [canProvideSession, handleTelemetryAbort, handleTelemetryStart, isOpen, journey, resetState]);

  useEffect(() => {
    if (!isOpen) {
      startRecordedRef.current = false;
      activeSlugRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen || !journey) {
    return null;
  }

  const telemetry = {
    onStart: handleTelemetryStart,
    onComplete: handleTelemetryComplete,
    onAbort: handleTelemetryAbort,
  };

  const keylessProps = {
    address: aptosAddress ?? "",
    signMessage,
    signTransaction,
    signAndSubmitTransaction,
  };

  const capabilities = {
    portfolio: {
      merge: updatePortfolio,
    },
    receipts: {
      create: createReceiptWithJourney,
    },
    donate: {},
  };

  const fallback = (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We couldn’t load this journey. Please return to your portfolio and try again.
          </p>
          <Button onClick={onClose}>Return to Portfolio</Button>
        </CardContent>
      </Card>
    </div>
  );

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Unable to start journey</h2>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button onClick={onClose}>Return to Portfolio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !component) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading journey…</div>
      </div>
    );
  }

  const LoadedComponent = component;

  return (
    <JourneyErrorBoundary
      fallback={fallback}
      onError={(error) => {
        console.error("Journey component error", error);
        if (activeSlugRef.current) {
          handleTelemetryAbort(activeSlugRef.current, error.message);
        }
      }}
    >
      <LoadedComponent
        isOpen={isOpen}
        onClose={onClose}
        journeyId={journeyId}
        auth={auth}
        keyless={keylessProps}
        aptos={{ client: aptosClient }}
        aptosClient={aptosClient}
        availableLiquidity={availableLiquidity}
        capabilities={capabilities}
        telemetry={telemetry}
      />
    </JourneyErrorBoundary>
  );
}
