import { notFound } from "next/navigation";
import { ParticipantFlow } from "@/components/participant-flow";
import { isStudyLocale } from "@/lib/i18n";

export default async function ParticipantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStudyLocale(locale)) notFound();
  return <ParticipantFlow locale={locale} />;
}
