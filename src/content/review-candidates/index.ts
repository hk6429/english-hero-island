import { pilotQuestionBank } from "../pilot";
import { grade3ReviewCandidates } from "./grade-3";
import { grade4ReviewCandidates } from "./grade-4";
import { grade5ReviewCandidates } from "./grade-5";
import { grade6ReviewCandidates } from "./grade-6";

export const newReviewCandidates = [
  ...grade3ReviewCandidates,
  ...grade4ReviewCandidates,
  ...grade5ReviewCandidates,
  ...grade6ReviewCandidates,
];

/**
 * Full content-review set. Student journeys continue to import only `pilotQuestionBank`
 * until every additional draft passes the independent two-teacher governance flow.
 */
export const reviewCandidateQuestionBank = [
  ...pilotQuestionBank,
  ...newReviewCandidates,
];
