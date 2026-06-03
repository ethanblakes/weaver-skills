import crypto from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { skillPermission } from "@/db/schema";
import type { Skill } from "@/app/types";
import type { ServerSession } from "@/lib/auth-server";

type AccessTarget = {
  userIds: string[];
  skillNames: string[];
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function filterSkillsBySession(
  skills: Skill[],
  session: ServerSession
): Skill[] {
  if (session?.user?.role === "admin") return skills;
  const userId = session?.user?.id;
  if (!userId) return [];

  const granted = db
    .select({ skillName: skillPermission.skillName })
    .from(skillPermission)
    .where(eq(skillPermission.userId, userId))
    .all();

  const allowed = new Set(granted.map((row) => row.skillName));
  return skills.filter((skill) => allowed.has(skill.name));
}

export function listSkillPermissions() {
  return db
    .select()
    .from(skillPermission)
    .orderBy(desc(skillPermission.createdAt))
    .all();
}

export function grantSkillPermissions(
  target: AccessTarget,
  grantedBy: string
) {
  const userIds = unique(target.userIds);
  const skillNames = unique(target.skillNames);
  const now = new Date();

  if (userIds.length === 0 || skillNames.length === 0) return;

  db.transaction((tx) => {
    for (const userId of userIds) {
      for (const skillName of skillNames) {
        tx.insert(skillPermission)
          .values({
            id: crypto.randomUUID(),
            skillName,
            userId,
            grantedBy,
            createdAt: now,
          })
          .onConflictDoNothing()
          .run();
      }
    }
  });
}

export function revokeSkillPermissions(target: AccessTarget) {
  const userIds = unique(target.userIds);
  const skillNames = unique(target.skillNames);

  if (userIds.length === 0 || skillNames.length === 0) return;

  db.delete(skillPermission)
    .where(and(inArray(skillPermission.userId, userIds), inArray(skillPermission.skillName, skillNames)))
    .run();
}

export function getSkillPermissionSummary() {
  return listSkillPermissions().reduce<Record<string, string[]>>((acc, row) => {
    acc[row.skillName] = acc[row.skillName] || [];
    acc[row.skillName].push(row.userId);
    return acc;
  }, {});
}
