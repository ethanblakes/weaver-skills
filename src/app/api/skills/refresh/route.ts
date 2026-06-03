import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  assertRefreshAllowed,
  recordRefreshAttempt,
  refreshSkillsCache,
} from "@/lib/skills-cache";
import { filterSkillsBySession } from "@/lib/skill-permissions";

export const dynamic = "force-dynamic";

function getIpAddress(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(req.headers);
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = {
    id: userId,
    role: session.user?.role ?? null,
  };
  const blockedUntil = assertRefreshAllowed(user);

  if (blockedUntil) {
    return Response.json(
      {
        error: "刷新过于频繁",
        nextRefreshAt: blockedUntil.toISOString(),
      },
      { status: 429 }
    );
  }

  recordRefreshAttempt(user, getIpAddress(req));

  try {
    const payload = await refreshSkillsCache();
    return Response.json({
      ...payload,
      skills: filterSkillsBySession(payload.skills, session),
      nextRefreshAt: new Date(
        Date.now() + (user.role === "admin" ? 15 * 1000 : 5 * 60 * 1000)
      ).toISOString(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "刷新技能列表失败" },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.SKILLS_REFRESH_SECRET || process.env.CRON_SECRET;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return Response.json(await refreshSkillsCache());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "刷新技能列表失败" },
      { status: 502 }
    );
  }
}
