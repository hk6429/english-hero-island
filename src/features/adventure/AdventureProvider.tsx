"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IndexedDbProgressStore } from "@/infrastructure/progress/IndexedDbProgressStore";
import type { ProgressStore } from "@/infrastructure/progress/ProgressStore";
import {
  createEmptyProgress,
  type ProgressSnapshot,
} from "@/infrastructure/progress/progress-types";
import { reduceAdventure, type AdventureAction } from "./adventure-machine";

type AdventureContextValue = Readonly<{
  ready: boolean;
  progress: ProgressSnapshot;
  persistenceError: string | null;
  dispatch: (action: AdventureAction) => void;
  reset: () => Promise<void>;
}>;

const AdventureContext = createContext<AdventureContextValue | null>(null);

export function AdventureProvider({
  children,
  store,
}: {
  children: ReactNode;
  store?: ProgressStore;
}) {
  const storeRef = useRef<ProgressStore | null>(null);
  const [progress, setProgress] = useState<ProgressSnapshot>(createEmptyProgress);
  const [ready, setReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const progressStore = store ?? new IndexedDbProgressStore();
    storeRef.current = progressStore;

    void progressStore
      .load()
      .then((loaded) => {
        if (active) setProgress(loaded);
      })
      .catch(() => {
        if (active) setPersistenceError("無法讀取先前進度，已改用新的本機進度。");
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [store]);

  const dispatch = useCallback((action: AdventureAction) => {
    setProgress((current) => {
      const next = reduceAdventure(current, action);
      if (next !== current) {
        void storeRef.current?.save(next).catch(() => {
          setPersistenceError("進度暫時無法儲存，請保持此頁開啟後再試一次。");
        });
      }
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    await storeRef.current?.reset();
    setProgress(createEmptyProgress());
    setPersistenceError(null);
  }, []);

  const value = useMemo(
    () => ({ ready, progress, persistenceError, dispatch, reset }),
    [dispatch, persistenceError, progress, ready, reset],
  );

  return <AdventureContext.Provider value={value}>{children}</AdventureContext.Provider>;
}

export function useAdventure(): AdventureContextValue {
  const value = useContext(AdventureContext);
  if (!value) {
    throw new Error("useAdventure must be used inside AdventureProvider");
  }
  return value;
}
