import { StudyForm } from "@/components/study-form";

export default async function EditStudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId } = await params;
  return <StudyForm key={studyId} studyId={studyId} />;
}
