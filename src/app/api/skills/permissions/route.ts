import { NextRequest } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth-server";
import {
  grantSkillPermissions,
  listSkillPermissions,
  revokeSkillPermissions,
} from "@/lib/skill-permissions";

export const dynamic = "force-dynamic";

type PermissionBody = {
  userIds?: string[];
  skillNames?: string[];
};

function parseBody(body: unknown): PermissionBody | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const userIds = Array.isArray(raw.userIds)
    ? raw.userIds.filter((v): v is string => typeof v === "string")
    : undefined;
  const skillNames = Array.isArray(raw.skillNames)
    ? raw.skillNames.filter((v): v is string => typeof v === "string")
    : undefined;
  return { userIds, skillNames };
}

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(req.headers);
  if (!isAdminSession(session)) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ grants: listSkillPermissions() });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = parseBody(await req.json());
  if (!body?.userIds?.length || !body?.skillNames?.length) {
    return Response.json(
      { error: "userIds and skillNames are required" },
      { status: 400 }
    );
  }

  grantSkillPermissions(
    { userIds: body.userIds, skillNames: body.skillNames },
    session.user.id
  );

  return Response.json({ grants: listSkillPermissions() });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = parseBody(await req.json());
  if (!body?.userIds?.length || !body?.skillNames?.length) {
    return Response.json(
      { error: "userIds and skillNames are required" },
      { status: 400 }
    );
  }

  revokeSkillPermissions({
    userIds: body.userIds,
    skillNames: body.skillNames,
  });

  return Response.json({ grants: listSkillPermissions() });
}
