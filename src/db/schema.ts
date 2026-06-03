import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

type CachedSkillMeta = {
  name: string;
  description: string;
  version?: string;
  category?: string;
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonatedBy"),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const skillCache = sqliteTable("skill_cache", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description").notNull(),
  htmlUrl: text("html_url").notNull(),
  cloneUrl: text("clone_url").notNull(),
  sshUrl: text("ssh_url").notNull(),
  starsCount: integer("stars_count").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  topics: text("topics", { mode: "json" }).$type<string[]>().notNull(),
  meta: text("meta", { mode: "json" }).$type<CachedSkillMeta | null>(),
  subdirs: text("subdirs", { mode: "json" }).$type<string[]>().notNull(),
  author: text("author"),
  cachedAt: timestamp("cached_at").notNull(),
});

export const skillCacheMeta = sqliteTable("skill_cache_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const skillRefreshAttempt = sqliteTable(
  "skill_refresh_attempt",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role"),
    ipAddress: text("ip_address"),
    refreshedAt: timestamp("refreshed_at").notNull(),
  },
  (table) => [
    index("skill_refresh_attempt_user_id_idx").on(table.userId),
    index("skill_refresh_attempt_refreshed_at_idx").on(table.refreshedAt),
  ]
);

export const skillPermission = sqliteTable(
  "skill_permission",
  {
    id: text("id").primaryKey(),
    skillName: text("skill_name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    grantedBy: text("granted_by"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("skill_permission_skill_name_idx").on(table.skillName),
    index("skill_permission_user_id_idx").on(table.userId),
    uniqueIndex("skill_permission_skill_name_user_id_idx").on(
      table.skillName,
      table.userId
    ),
  ]
);

export const sharedLink = sqliteTable(
  "shared_link",
  {
    id: text("id").primaryKey(),
    skillName: text("skill_name").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessKey: text("access_key").notNull(),
    expiresAt: timestamp("expires_at"),
    maxAccesses: integer("max_accesses"),
    accessCount: integer("access_count").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("shared_link_skill_name_idx").on(table.skillName),
    index("shared_link_created_by_idx").on(table.createdBy),
    uniqueIndex("shared_link_access_key_idx").on(table.accessKey),
  ]
);
