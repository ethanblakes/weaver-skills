import crypto from "crypto";
import { and, desc, eq, gt, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sharedLink, skillCache } from "@/db/schema";

export type SharedSkillLink = {
  id: string;
  skillName: string;
  createdBy: string;
  accessKey: string;
  expiresAt: Date | null;
  maxAccesses: number | null;
  accessCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateShareInput = {
  skillName: string;
  createdBy: string;
  expiresAt?: string | null;
  maxAccesses?: number | null;
};

function generateAccessKey(): string {
  return crypto.randomUUID();
}

export function createShareLink(input: CreateShareInput): SharedSkillLink {
  const now = new Date();
  const record = {
    id: crypto.randomUUID(),
    skillName: input.skillName,
    createdBy: input.createdBy,
    accessKey: generateAccessKey(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    maxAccesses: input.maxAccesses ?? null,
    accessCount: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(sharedLink).values(record).run();
  return record;
}

export function listShareLinks() {
  return db
    .select()
    .from(sharedLink)
    .orderBy(desc(sharedLink.createdAt))
    .all();
}

export function revokeShareLink(id: string): boolean {
  const result = db
    .update(sharedLink)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(sharedLink.id, id))
    .run();
  return result.changes > 0;
}

export function updateShareLink(
  id: string,
  updates: { expiresAt?: string | null; maxAccesses?: number | null }
): boolean {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.expiresAt !== undefined) {
    set.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
  }
  if (updates.maxAccesses !== undefined) {
    set.maxAccesses = updates.maxAccesses;
  }
  const result = db
    .update(sharedLink)
    .set(set)
    .where(eq(sharedLink.id, id))
    .run();
  return result.changes > 0;
}

export function clearInvalidLinks(): number {
  const now = new Date();
  const result = db
    .delete(sharedLink)
    .where(
      or(
        eq(sharedLink.active, false),
        and(
          isNotNull(sharedLink.expiresAt),
          lt(sharedLink.expiresAt, now)
        ),
        and(
          isNotNull(sharedLink.maxAccesses),
          sql`${sharedLink.accessCount} >= ${sharedLink.maxAccesses}`
        )
      )
    )
    .run();
  return result.changes;
}

export function accessSharedSkill(accessKey: string) {
  const link = db
    .select()
    .from(sharedLink)
    .where(eq(sharedLink.accessKey, accessKey))
    .get();

  if (!link) return null;
  if (!link.active) return null;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;
  if (link.maxAccesses !== null && link.accessCount >= link.maxAccesses) return null;

  const skill = db
    .select()
    .from(skillCache)
    .where(eq(skillCache.name, link.skillName))
    .get();

  return {
    link,
    skill: skill
      ? {
          name: skill.name,
          fullName: skill.fullName,
          description: skill.description,
          cloneUrl: skill.cloneUrl,
          meta: skill.meta as {
            name: string;
            description: string;
            version?: string;
            category?: string;
          } | null,
        }
      : null,
  };
}

export function getShareCloneUrl(
  accessKey: string,
  opts?: { checkLimit?: boolean }
): string | null {
  const link = db
    .select()
    .from(sharedLink)
    .where(eq(sharedLink.accessKey, accessKey))
    .get();

  if (!link || !link.active) return null;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;
  if (
    opts?.checkLimit !== false &&
    link.maxAccesses !== null &&
    link.accessCount >= link.maxAccesses
  )
    return null;

  const skill = db
    .select({ cloneUrl: skillCache.cloneUrl })
    .from(skillCache)
    .where(eq(skillCache.name, link.skillName))
    .get();

  return skill?.cloneUrl ?? null;
}

export function tryDeductCloneAccess(accessKey: string): boolean {
  const now = new Date();
  const result = db
    .update(sharedLink)
    .set({
      accessCount: sql`${sharedLink.accessCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(sharedLink.accessKey, accessKey),
        eq(sharedLink.active, true),
        or(
          sql`${sharedLink.expiresAt} IS NULL`,
          gt(sharedLink.expiresAt, now)
        ),
        or(
          sql`${sharedLink.maxAccesses} IS NULL`,
          lt(sharedLink.accessCount, sharedLink.maxAccesses)
        )
      )
    )
    .run();
  return result.changes > 0;
}
