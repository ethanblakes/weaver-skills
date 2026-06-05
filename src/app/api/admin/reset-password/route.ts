import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { eq, and } from "drizzle-orm";
import { getServerSession, isAdminSession } from "@/lib/auth-server";
import { db } from "@/db";
import { account } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const hashedPw = await hashPassword("12345678");

    const result = db
      .update(account)
      .set({ password: hashedPw, updatedAt: new Date() })
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, "credential")
        )
      )
      .run();

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
