import type { LearningEvent } from "@/domain/learning/types";
import type { ProgressSnapshot } from "./progress-types";

export interface ProgressStore {
  load(): Promise<ProgressSnapshot>;
  save(progress: ProgressSnapshot): Promise<void>;
  appendLearningEvent(event: LearningEvent): Promise<boolean>;
  reset(): Promise<void>;
}
