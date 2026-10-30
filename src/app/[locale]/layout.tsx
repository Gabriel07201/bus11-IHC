import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { SUPPORTED_LOCALES, isStudyLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isStudyLocale(locale)) notFound();
  return <div lang={locale}>{children}</div>;
}
