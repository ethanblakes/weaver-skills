import crypto from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { skillCache, skillCacheMeta, skillRefreshAttempt } from "@/db/schema";
import type { GiteaRepo, Skill, SkillMeta } from "@/app/types";

const ORG = process.env.GITEA_ORG || process.env.NEXT_PUBLIC_GITEA_ORG || "weaver";
const DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;
const ADMIN_REFRESH_COOLDOWN_MS = 15 * 1000;
const USER_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const REFRESHED_AT_KEY = "skills_refreshed_at";
const KNOWN_RESOURCE_DIRS = new Set(["references", "scripts", "templates", "assets"]);

type RefreshUser = {
  id: string;
  role?: string | null;
};

export type SkillCachePayload = {
  skills: Skill[];
  refreshedAt: string | null;
  stale: boolean;
};

export type RefreshResult = SkillCachePayload & {
  nextRefreshAt: string | null;
};

function getGiteaBase() {
  const base = process.env.GITEA_BASE;
  if (!base) {
    throw new Error("GITEA_BASE 环境变量未设置。请在 .env 中配置 Gitea 服务地址。");
  }
  return base.replace(/\/$/, "");
}

function parseFrontmatter(text: string): SkillMeta | null {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return {
    name: result.name || "",
    description: result.description || "",
    version: result.version,
    category: result.category,
  };
}

async function fetchGitea(path: string, responseType: "json"): Promise<unknown>;
async function fetchGitea(path: string, responseType: "text"): Promise<string>;
async function fetchGitea(path: string, responseType: "json" | "text") {
  const resp = await fetch(`${getGiteaBase()}/api/v1/${path}`, {
    headers: { Accept: responseType === "text" ? "text/plain" : "application/json" },
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`Gitea API ${path}: ${resp.status}`);
  }

  return responseType === "text" ? resp.text() : resp.json();
}

function repoPath(repoName: string, suffix: string) {
  return `repos/${encodeURIComponent(ORG)}/${encodeURIComponent(repoName)}/${suffix}`;
}

async function fetchSkillsFromGitea(): Promise<Skill[]> {
  const repos = (await fetchGitea(
    `orgs/${encodeURIComponent(ORG)}/repos`,
    "json"
  )) as GiteaRepo[];

  return Promise.all(
    repos.map(async (repo) => {
      let meta: SkillMeta | null = null;
      let author: string | undefined;
      const subdirs: string[] = [];

      const [rawResult, contentsResult, commitsResult] = await Promise.allSettled([
        fetchGitea(repoPath(repo.name, "raw/SKILL.md"), "text"),
        fetchGitea(repoPath(repo.name, "contents"), "json"),
        fetchGitea(repoPath(repo.name, "commits?limit=1"), "json"),
      ]);

      if (rawResult.status === "fulfilled") {
        meta = parseFrontmatter(rawResult.value);
      }

      if (contentsResult.status === "fulfilled") {
        const contents = contentsResult.value as { type: string; name: string }[];
        subdirs.push(
          ...contents
            .filter((item) => item.type === "dir" && KNOWN_RESOURCE_DIRS.has(item.name))
            .map((item) => item.name)
        );
      }

      if (commitsResult.status === "fulfilled") {
        const commits = commitsResult.value as {
          commit: { author: { name: string } };
        }[];
        author = commits[0]?.commit?.author?.name;
      }

      return { ...repo, meta, subdirs, author };
    })
  );
}

function serializeSkill(skill: Skill, cachedAt: Date) {
  return {
    id: skill.id,
    name: skill.name,
    fullName: skill.full_name,
    description: skill.description || "",
    htmlUrl: skill.html_url,
    cloneUrl: skill.clone_url,
    sshUrl: skill.ssh_url,
    starsCount: skill.stars_count || 0,
    updatedAt: new Date(skill.updated_at),
    topics: skill.topics || [],
    meta: skill.meta,
    subdirs: skill.subdirs || [],
    author: skill.author ?? null,
    cachedAt,
  };
}

function deserializeSkill(row: typeof skillCache.$inferSelect): Skill {
  return {
    id: row.id,
    name: row.name,
    full_name: row.fullName,
    description: row.description,
    html_url: row.htmlUrl,
    clone_url: row.cloneUrl,
    ssh_url: row.sshUrl,
    stars_count: row.starsCount,
    updated_at: row.updatedAt.toISOString(),
    topics: row.topics,
    meta: row.meta,
    subdirs: row.subdirs,
    author: row.author ?? undefined,
  };
}

export function readSkillsCache(): SkillCachePayload {
  const rows = db.select().from(skillCache).orderBy(desc(skillCache.updatedAt)).all();
  const meta = db
    .select()
    .from(skillCacheMeta)
    .where(eq(skillCacheMeta.key, REFRESHED_AT_KEY))
    .get();
  const refreshedAt = meta?.value ?? null;
  const stale = refreshedAt
    ? Date.now() - new Date(refreshedAt).getTime() > DAILY_REFRESH_MS
    : true;

  return {
    skills: rows.map(deserializeSkill),
    refreshedAt,
    stale,
  };
}

export async function refreshSkillsCache(): Promise<SkillCachePayload> {
  const skills = await fetchSkillsFromGitea();
  const refreshedAt = new Date();

  db.transaction((tx) => {
    tx.delete(skillCache).run();

    for (const skill of skills) {
      tx.insert(skillCache).values(serializeSkill(skill, refreshedAt)).run();
    }

    tx.insert(skillCacheMeta)
      .values({
        key: REFRESHED_AT_KEY,
        value: refreshedAt.toISOString(),
        updatedAt: refreshedAt,
      })
      .onConflictDoUpdate({
        target: skillCacheMeta.key,
        set: {
          value: refreshedAt.toISOString(),
          updatedAt: refreshedAt,
        },
      })
      .run();
  });

  return readSkillsCache();
}

export async function readOrRefreshStaleSkills(): Promise<SkillCachePayload> {
  const cached = readSkillsCache();
  if (cached.skills.length > 0 && !cached.stale) return cached;
  return refreshSkillsCache();
}

export function getRefreshCooldown(user: RefreshUser) {
  return user.role === "admin" ? ADMIN_REFRESH_COOLDOWN_MS : USER_REFRESH_COOLDOWN_MS;
}

export function getLatestRefreshAttempt(userId: string) {
  return db
    .select()
    .from(skillRefreshAttempt)
    .where(eq(skillRefreshAttempt.userId, userId))
    .orderBy(desc(skillRefreshAttempt.refreshedAt))
    .limit(1)
    .get();
}

export function assertRefreshAllowed(user: RefreshUser) {
  const latest = getLatestRefreshAttempt(user.id);
  if (!latest) return null;

  const cooldown = getRefreshCooldown(user);
  const nextRefreshAt = latest.refreshedAt.getTime() + cooldown;
  if (Date.now() < nextRefreshAt) {
    return new Date(nextRefreshAt);
  }

  return null;
}

export function recordRefreshAttempt(user: RefreshUser, ipAddress?: string | null) {
  db.insert(skillRefreshAttempt)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      role: user.role ?? null,
      ipAddress: ipAddress ?? null,
      refreshedAt: new Date(),
    })
    .run();
}
