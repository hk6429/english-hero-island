import type { LearningEvent } from "@/domain/learning/types";
import type { ProgressStore } from "./ProgressStore";
import { createEmptyProgress, type ProgressSnapshot } from "./progress-types";

const STORE_NAME = "progress";
const SNAPSHOT_KEY = "student-progress";

function normalizeProgress(stored: ProgressSnapshot): ProgressSnapshot {
  const empty = createEmptyProgress();
  return {
    ...empty,
    ...stored,
    events: stored.events ?? [],
    abilityCards: stored.abilityCards ?? [],
    repairedZones: stored.repairedZones ?? [],
    dexEntries: stored.dexEntries ?? [],
    discoveries: stored.discoveries ?? [],
    partnerEncouragements: stored.partnerEncouragements ?? [],
    activeSession: stored.activeSession
      ? {
          ...stored.activeSession,
          selectedRoute: stored.activeSession.selectedRoute ?? null,
        }
      : null,
    streak: {
      ...empty.streak,
      ...(stored.streak ?? {}),
      completedDates: stored.streak?.completedDates ?? [],
    },
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => reject(transaction.error));
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

export class IndexedDbProgressStore implements ProgressStore {
  private readonly database: Promise<IDBDatabase>;

  constructor({ databaseName = "english-hero-island" }: { databaseName?: string } = {}) {
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  async load(): Promise<ProgressSnapshot> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readonly");
    const stored = await requestResult<ProgressSnapshot | undefined>(
      transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY),
    );
    await transactionDone(transaction);
    return stored ? normalizeProgress(structuredClone(stored)) : createEmptyProgress();
  }

  async save(progress: ProgressSnapshot): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(structuredClone(progress), SNAPSHOT_KEY);
    await transactionDone(transaction);
  }

  async appendLearningEvent(event: LearningEvent): Promise<boolean> {
    const progress = await this.load();
    if (progress.events.some((existing) => existing.id === event.id)) {
      return false;
    }

    await this.save({
      ...progress,
      events: [...progress.events, event],
    });
    return true;
  }

  async reset(): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(SNAPSHOT_KEY);
    await transactionDone(transaction);
  }
}
