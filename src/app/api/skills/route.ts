import { readOrRefreshStaleSkills, readSkillsCache } from "@/lib/skills-cache";
import { filterSkillsBySession } from "@/lib/skill-permissions";
import { getServerSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await readOrRefreshStaleSkills();
    return Response.json({
      ...payload,
      skills: filterSkillsBySession(payload.skills, session),
    });
  } catch (error) {
    const cached = readSkillsCache();
    if (cached.skills.length > 0) {
      return Response.json({
        ...cached,
        skills: filterSkillsBySession(cached.skills, session),
        stale: true,
        warning: error instanceof Error ? error.message : "刷新技能缓存失败",
      });
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "获取技能列表失败" },
      { status: 502 }
    );
  }
}
