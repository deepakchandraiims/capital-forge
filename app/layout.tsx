import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capital Forge",
  description: "Institutional finance practice platform for IB, PE, VC, private credit, modeling and capital markets."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
