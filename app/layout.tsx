import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mini Twitter",
  description: "A modern full-stack mini social platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
