import { Elysia } from "elysia";
import { checkDatabaseConnection } from "./db/index.js";

const app = new Elysia();

const PORT = Number(process.env.PORT) || 3000;

app.get("/", () => ({
  message: "ElysiaJS + Drizzle ORM + MySQL server running with Bun!",
  version: "1.0.0",
}));

app.get("/health", async () => {
  const dbStatus = await checkDatabaseConnection();
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

export default app;

