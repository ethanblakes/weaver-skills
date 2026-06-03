import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import Database from "better-sqlite3";

const db = new Database("./sqlite.db");
db.pragma("journal_mode = WAL");

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [admin()],
});
