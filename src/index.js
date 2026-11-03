import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { checkDatabaseConnection } from "./db/index.js";
import { usersRoute } from "./route/users-route.js";

const app = new Elysia();

const PORT = Number(process.env.PORT) || 3000;

// Registrasi Swagger plugin untuk dokumentasi interaktif OpenAPI
app.use(
  swagger({
    path: "/swagger",
    documentation: {
      info: {
        title: "Belajar Vibe Code API",
        version: "1.0.0",
        description:
          "Dokumentasi RESTful API untuk autentikasi pengguna dan manajemen sesi dengan ElysiaJS, Drizzle ORM, dan MySQL.",
      },
      tags: [
        {
          name: "System",
          description: "Endpoint pemeriksaan server dan konektivitas database",
        },
        {
          name: "Users",
          description: "Endpoint terkait pengguna (registrasi, login, profil, logout)",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "UUID",
            description: "Masukkan token sesi UUID dari endpoint POST /api/users/login",
          },
        },
      },
    },
  })
);

app.get(
  "/",
  () => ({
    message: "ElysiaJS + Drizzle ORM + MySQL server running with Bun!",
    version: "1.0.0",
  }),
  {
    detail: {
      tags: ["System"],
      summary: "Informasi Server",
      description: "Menampilkan informasi dasar status server dan versi aplikasi",
    },
  }
);

app.get(
  "/health",
  async () => {
    const dbStatus = await checkDatabaseConnection();
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  },
  {
    detail: {
      tags: ["System"],
      summary: "Healthcheck Server & Database",
      description: "Healthcheck status server & koneksi database MySQL",
    },
  }
);

// Registrasi modul routes
app.use(usersRoute);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📖 Swagger documentation available at http://localhost:${PORT}/swagger`);
  });
}

export default app;
