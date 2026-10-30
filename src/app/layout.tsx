import type { Metadata } from "next";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BUS-11 | Avaliação de chatbots",
  description: "Ferramenta local para conduzir estudos de avaliação com a escala BUS-11.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
