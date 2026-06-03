import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession, isAdminSession } from "@/lib/auth-server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login?redirect=/admin");
  }

  if (!isAdminSession(session)) {
    redirect("/");
  }

  return children;
}
