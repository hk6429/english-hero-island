import {
  classroomSupportScopeKey,
  type ClassroomSupportEvidenceStore,
  type ClassroomSupportScope,
} from "./ClassroomSupportEvidenceStore";

const STORE_NAME = "support-markers";

type StoredSupportMarker = Readonly<{
  scopeKey: string;
  hintsUsed: 1;
  revealedAt: string;
}>;

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

export class IndexedDbClassroomSupportEvidenceStore
  implements ClassroomSupportEvidenceStore
{
  private readonly database: Promise<IDBDatabase>;

  constructor({
    databaseName = "english-hero-island-classroom-support",
  }: { databaseName?: string } = {}) {
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: "scopeKey" });
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  async get(scope: ClassroomSupportScope): Promise<0 | 1> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readonly");
    const stored = await requestResult<StoredSupportMarker | undefined>(
      transaction.objectStore(STORE_NAME).get(classroomSupportScopeKey(scope)),
    );
    await transactionDone(transaction);
    return stored?.hintsUsed === 1 ? 1 : 0;
  }

  async markTranscriptRevealed(scope: ClassroomSupportScope): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({
      scopeKey: classroomSupportScopeKey(scope),
      hintsUsed: 1,
      revealedAt: new Date().toISOString(),
    } satisfies StoredSupportMarker);
    await transactionDone(transaction);
  }

  async clear(scope: ClassroomSupportScope): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(classroomSupportScopeKey(scope));
    await transactionDone(transaction);
  }
}
