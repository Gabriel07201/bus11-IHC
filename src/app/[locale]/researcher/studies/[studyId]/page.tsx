import { StudyManagement } from "@/components/study-management";

export default async function StudyManagementPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId } = await params;
  return <StudyManagement key={studyId} studyId={studyId} />;
}
