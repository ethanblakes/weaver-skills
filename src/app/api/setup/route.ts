import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Setup failed";
}

export async function POST(req: Request) {
  const db = new Database("./sqlite.db");
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM user").get() as {
      count: number;
    };
    if (row.count > 0) {
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
    const now = new Date().toISOString();
    const hashedPw = await hashPassword(password);

    db.prepare(
      `INSERT INTO user (id, email, name, role, emailVerified, createdAt, updatedAt, banned)
       VALUES (?, ?, ?, 'admin', 0, ?, ?, 0)`
    ).run(id, email.toLowerCase(), name, now, now);

    db.prepare(
      `INSERT INTO account (id, accountId, providerId, password, userId, createdAt, updatedAt)
       VALUES (?, ?, 'credential', ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), id, hashedPw, id, now, now);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = new Database("./sqlite.db");
    const row = db.prepare("SELECT COUNT(*) as count FROM user").get() as {
      count: number;
    };
    return NextResponse.json({ hasUsers: row.count > 0 });
  } catch {
    return NextResponse.json({ hasUsers: false });
  }
}
