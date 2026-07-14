import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionReviewWorkspace } from "@/features/governance/QuestionReviewWorkspace";

export default function QuestionGovernancePage() {
  return (
    <AppShell pageClassName="governance-page">
      <main className="page-main governance-main" id="main-content">
        <Link className="back-link" href="/">
          <ArrowLeft aria-hidden="true" />回首頁
        </Link>
        <QuestionReviewWorkspace />
      </main>
    </AppShell>
  );
}
