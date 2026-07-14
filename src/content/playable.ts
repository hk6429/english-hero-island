import { pilotQuestionBank } from "./pilot";
import { newReviewCandidates } from "./review-candidates";

/**
 * 學生實際遊玩的完整題庫：固定 60 題 pilot ＋ 140 題原創草稿，共 200 題。
 *
 * 這 200 題全部維持 `status: "draft"`／`reviewers: []`，是「試營運內容池」，
 * 並非宣稱已通過兩位英文教師的獨立治理複核——治理流程仍在 /governance 獨立進行。
 * 之所以能上場，是因為現行 pilot 的 60 題本身也是未經治理的 draft，兩者風險一致；
 * 這裡只是把同等狀態的原創草稿一併提供給學生流程，不偽造任何教師身分或票數。
 */
export const playableQuestionBank = [...pilotQuestionBank, ...newReviewCandidates];
