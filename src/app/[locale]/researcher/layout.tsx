import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isStudyLocale } from "@/lib/i18n";
import { ResearcherAccess } from "@/components/researcher-access";

export default async function ResearcherLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isStudyLocale(locale)) notFound();
  return <ResearcherAccess locale={locale}>{children}</ResearcherAccess>;
}
