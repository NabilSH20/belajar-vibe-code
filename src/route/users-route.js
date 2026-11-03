import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from "../services/users-services.js";

/**
 * Helper untuk mengekstrak Bearer token dari HTTP headers
 * @param {Record<string, string | undefined>} headers
 * @returns {string | null}
 */
function extractBearerToken(headers) {
  const authHeader = headers?.authorization || headers?.Authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  return token || null;
}

// Skema TypeBox untuk Swagger / OpenAPI Documentation
const registerBodySchema = t.Object({
  name: t.String({ maxLength: 255, description: "Nama lengkap pengguna" }),
  email: t.String({ maxLength: 255, description: "Email pengguna" }),
  password: t.String({ maxLength: 255, description: "Kata sandi pengguna" }),
});

const loginBodySchema = t.Object({
  email: t.String({ description: "Email akun terdaftar" }),
  password: t.String({ description: "Kata sandi akun" }),
});

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .post(
    "",
    async ({ body, set }) => {
      try {
        const result = await registerUser(body);
        set.status = 200;
        return {
          data: result.data,
        };
      } catch (error) {
        set.status = error.statusCode || 400;
        return {
          error: error.message || "Terjadi kesalahan pada server",
        };
      }
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Registrasi Pengguna Baru",
        description:
          "Mendaftarkan pengguna baru ke sistem dan meng-hash password dengan bcrypt",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: registerBodySchema,
            },
          },
        },
        responses: {
          200: {
            description: "Pengguna berhasil didaftarkan",
            content: {
              "application/json": {
                schema: t.Object({
                  data: t.String({ example: "OK" }),
                }),
              },
            },
          },
          400: {
            description: "Validasi gagal atau email sudah terdaftar",
            content: {
              "application/json": {
                schema: t.Object({
                  error: t.String({ example: "name, email, dan password wajib diisi" }),
                }),
              },
            },
          },
        },
      },
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        set.status = 200;
        return {
          data: result.data,
        };
      } catch (error) {
        set.status = error.statusCode || 400;
        return {
          error: error.message || "Terjadi kesalahan pada server",
        };
      }
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Autentikasi Login Pengguna",
        description:
          "Memverifikasi email & password, serta menghasilkan token sesi UUID",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: loginBodySchema,
            },
          },
        },
        responses: {
          200: {
            description: "Login berhasil dan token sesi dibuat",
            content: {
              "application/json": {
                schema: t.Object({
                  data: t.String({
                    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                    description: "Token sesi UUID untuk Authorization header",
                  }),
                }),
              },
            },
          },
          400: {
            description: "Email atau password salah / input tidak valid",
            content: {
              "application/json": {
                schema: t.Object({
                  error: t.String({ example: "email atau password salah" }),
                }),
              },
            },
          },
        },
      },
    }
  )
  .post(
    "/current",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers);
        if (!token) {
          set.status = 401;
          return {
            error: "Unauthorized",
          };
        }

        const result = await getCurrentUser(token);
        set.status = 200;
        return {
          data: result.data,
        };
      } catch (error) {
        set.status = error.statusCode || 401;
        return {
          error: error.message || "Unauthorized",
        };
      }
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Get Profil Pengguna Sedang Login",
        description:
          "Mengambil data profil pengguna aktif berdasarkan Bearer token sesi (tanpa password)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Profil pengguna berhasil didapatkan",
            content: {
              "application/json": {
                schema: t.Object({
                  data: t.Object({
                    id: t.Number({ example: 1 }),
                    name: t.String({ example: "Nabil" }),
                    email: t.String({ example: "nabil@localhost" }),
                  }),
                }),
              },
            },
          },
          401: {
            description: "Token sesi tidak valid atau header Authorization tidak disertakan",
            content: {
              "application/json": {
                schema: t.Object({
                  error: t.String({ example: "Unauthorized" }),
                }),
              },
            },
          },
        },
      },
    }
  )
  .delete(
    "/logout",
    async ({ headers, set }) => {
      try {
        const token = extractBearerToken(headers);
        if (!token) {
          set.status = 401;
          return {
            error: "Unauthorized",
          };
        }

        const result = await logoutUser(token);
        set.status = 200;
        return {
          data: result.data,
        };
      } catch (error) {
        set.status = error.statusCode || 401;
        return {
          error: error.message || "Unauthorized",
        };
      }
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Logout Pengguna",
        description:
          "Menghapus token sesi aktif pengguna dari database secara permanen",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logout berhasil dan sesi telah dihapus",
            content: {
              "application/json": {
                schema: t.Object({
                  data: t.String({ example: "OK" }),
                }),
              },
            },
          },
          401: {
            description: "Token sesi tidak valid atau tidak ditemukan",
            content: {
              "application/json": {
                schema: t.Object({
                  error: t.String({ example: "Unauthorized" }),
                }),
              },
            },
          },
        },
      },
    }
  );
