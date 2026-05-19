import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Prezenco",
  description: "Sign in to your Prezenco account",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
