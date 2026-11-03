import { defineConfig } from "drizzle-kit";

const host = process.env.DB_HOST || "127.0.0.1";
const port = process.env.DB_PORT || "3306";
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const database = process.env.DB_NAME || "belajar_vibe";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || `mysql://${user}:${password}@${host}:${port}/${database}`,
  },
});
