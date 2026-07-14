import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StudentJoinWorkspace } from "@/features/classroom/StudentJoinWorkspace";

export default function JoinClassroomPage() {
  return (
    <AppShell pageClassName="classroom-page">
      <main className="page-main classroom-main" id="main-content" tabIndex={-1}>
        <Link className="back-link" href="/">
          <ArrowLeft aria-hidden="true" />回首頁
        </Link>
        <StudentJoinWorkspace />
      </main>
    </AppShell>
  );
}
