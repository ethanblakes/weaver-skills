import { NextRequest } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth-server";
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  updateShareLink,
  clearInvalidLinks,
} from "@/lib/skill-shares";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(req.headers);
  if (!isAdminSession(session)) {
    return null;
  }
  return session;
}

function parseBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  return body as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = parseBody(await req.json());
  if (!body || typeof body.skillName !== "string" || !body.skillName.trim()) {
    return Response.json({ error: "skillName is required" }, { status: 400 });
  }

  const share = createShareLink({
    skillName: body.skillName.trim(),
    createdBy: session.user.id,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
    maxAccesses:
      typeof body.maxAccesses === "number" ? body.maxAccesses : null,
  });

  return Response.json(share);
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(listShareLinks());
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = parseBody(await req.json());
  if (typeof body?.id !== "string") {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const updated = updateShareLink(body.id, {
    expiresAt:
      typeof body.expiresAt === "string" || body.expiresAt === null
        ? body.expiresAt
        : undefined,
    maxAccesses:
      typeof body.maxAccesses === "number" || body.maxAccesses === null
        ? body.maxAccesses
        : undefined,
  });

  if (!updated) {
    return Response.json({ error: "Share link not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = parseBody(await req.json());

  if (body?.clearInvalid === true) {
    const count = clearInvalidLinks();
    return Response.json({ success: true, deleted: count });
  }

  if (typeof body?.id !== "string") {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const revoked = revokeShareLink(body.id);
  if (!revoked) {
    return Response.json({ error: "Share link not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
