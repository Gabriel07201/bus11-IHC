import { StudyResults } from "@/components/study-results";

export default async function StudyResultsPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId } = await params;
  return <StudyResults key={studyId} studyId={studyId} />;
}
