import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hush Token Faucet",
  description: "Claim HUSH tokens for your wallet on the Hush chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
