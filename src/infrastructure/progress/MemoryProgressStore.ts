import type { LearningEvent } from "@/domain/learning/types";
import type { ProgressStore } from "./ProgressStore";
import { createEmptyProgress, type ProgressSnapshot } from "./progress-types";

function clone(progress: ProgressSnapshot): ProgressSnapshot {
  return structuredClone(progress);
}

export class MemoryProgressStore implements ProgressStore {
  private progress: ProgressSnapshot = createEmptyProgress();

  async load(): Promise<ProgressSnapshot> {
    return clone(this.progress);
  }

  async save(progress: ProgressSnapshot): Promise<void> {
    this.progress = clone(progress);
  }

  async appendLearningEvent(event: LearningEvent): Promise<boolean> {
    if (this.progress.events.some((existing) => existing.id === event.id)) {
      return false;
    }

    this.progress = {
      ...this.progress,
      events: [...this.progress.events, event],
    };
    return true;
  }

  async reset(): Promise<void> {
    this.progress = createEmptyProgress();
  }
}
