import type {
  PendingClassroomSubmission,
  PendingClassroomSubmissionStore,
} from "./PendingClassroomSubmissionStore";

const STORE_NAME = "pending-submissions";
const SCOPE_INDEX = "activity-participant";

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

export class IndexedDbPendingSubmissionStore
  implements PendingClassroomSubmissionStore
{
  private readonly database: Promise<IDBDatabase>;

  constructor({
    databaseName = "english-hero-island-classroom",
  }: { databaseName?: string } = {}) {
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          const store = request.result.createObjectStore(STORE_NAME, {
            keyPath: "deviceEventId",
          });
          store.createIndex(SCOPE_INDEX, ["activityId", "participantId"]);
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  async list(
    activityId: string,
    participantId: string,
  ): Promise<ReadonlyArray<PendingClassroomSubmission>> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readonly");
    const stored = await requestResult<PendingClassroomSubmission[]>(
      transaction
        .objectStore(STORE_NAME)
        .index(SCOPE_INDEX)
        .getAll(IDBKeyRange.only([activityId, participantId])),
    );
    await transactionDone(transaction);
    return stored
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
      .map((submission) => structuredClone(submission));
  }

  async put(submission: PendingClassroomSubmission): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(structuredClone(submission));
    await transactionDone(transaction);
  }

  async remove(deviceEventId: string): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(deviceEventId);
    await transactionDone(transaction);
  }
}
