import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession, isAdminSession } from "@/lib/auth-server";

export default async function SharesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login?redirect=/shares");
  }

  if (!isAdminSession(session)) {
    redirect("/");
  }

  return children;
}
