import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DentalOS", template: "%s · DentalOS" },
  description: "Dental center management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
