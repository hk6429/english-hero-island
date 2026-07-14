import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherClassroomWorkspace } from "@/features/classroom/TeacherClassroomWorkspace";

export default function TeacherClassroomPage() {
  return (
    <AppShell pageClassName="classroom-page teacher-page">
      <main className="page-main classroom-main" id="main-content" tabIndex={-1}>
        <Link className="back-link" href="/">
          <ArrowLeft aria-hidden="true" />回首頁
        </Link>
        <TeacherClassroomWorkspace />
      </main>
    </AppShell>
  );
}
