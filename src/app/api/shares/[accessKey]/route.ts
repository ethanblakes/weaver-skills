import { NextRequest } from "next/server";
import { accessSharedSkill } from "@/lib/skill-shares";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ accessKey: string }> }
) {
  const { accessKey } = await params;

  if (!accessKey) {
    return Response.json({ error: "Missing access key" }, { status: 400 });
  }

  const result = accessSharedSkill(accessKey);

  if (!result) {
    return Response.json(
      { error: "Share link is invalid, expired, or has been revoked" },
      { status: 404 }
    );
  }

  if (!result.skill) {
    return Response.json({
      link: { accessKey: result.link.accessKey },
      skill: null,
      message: "This skill is no longer available.",
    });
  }

  const { cloneUrl: _, ...safeSkill } = result.skill as Record<string, unknown> & { cloneUrl: string };
  return Response.json({
    link: {
      accessKey: result.link.accessKey,
      expiresAt: result.link.expiresAt,
      maxAccesses: result.link.maxAccesses,
      accessCount: result.link.accessCount,
    },
    skill: safeSkill,
  });
}
