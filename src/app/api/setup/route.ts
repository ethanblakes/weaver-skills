import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { count } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/db";
import { user, account } from "@/db/schema";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Setup failed";
}

export async function POST(req: Request) {
  try {
    const row = db.select({ count: count() }).from(user).get();
    if (row && row.count > 0) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 403 }
      );
    }

    const { email, password, name } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const hashedPw = await hashPassword(password);

    db.insert(user)
      .values({
        id,
        email: email.toLowerCase(),
        name,
        role: "admin",
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        banned: false,
      })
      .run();

    db.insert(account)
      .values({
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        password: hashedPw,
        userId: id,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const row = db.select({ count: count() }).from(user).get();
    return NextResponse.json({ hasUsers: row ? row.count > 0 : false });
  } catch {
    return NextResponse.json({ hasUsers: false });
  }
}
