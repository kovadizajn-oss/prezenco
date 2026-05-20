import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Zummo",
  description: "Sign in to your Zummo account",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
