import { NextResponse } from "next/server";
// @ts-expect-error — verifyPassword is exported at runtime but TS can't resolve it
import { verifyPassword } from "better-auth/crypto";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user, account } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { newEmail, password } = await req.json();
    if (!newEmail || !password) {
      return NextResponse.json(
        { error: "新邮箱和当前密码不能为空" },
        { status: 400 }
      );
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const existing = db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, normalizedNewEmail))
      .get();
    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已被其他用户使用" },
        { status: 409 }
      );
    }

    // Look up the stored password hash
    const acct = db
      .select({ password: account.password })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, "credential")
        )
      )
      .get();

    if (!acct?.password) {
      return NextResponse.json(
        { error: "未找到账户信息" },
        { status: 404 }
      );
    }

    const valid = await verifyPassword({ hash: acct.password, password });
    if (!valid) {
      return NextResponse.json(
        { error: "当前密码不正确" },
        { status: 401 }
      );
    }

    const now = new Date();
    db.update(user)
      .set({ email: normalizedNewEmail, updatedAt: now })
      .where(eq(user.id, userId))
      .run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "修改邮箱失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
