import { Elysia } from "elysia";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../services/users-services.js";

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

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .post("/", async ({ body, set }) => {
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
  })
  .post("/login", async ({ body, set }) => {
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
  })
  .post("/current", async ({ headers, set }) => {
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
  })
  .delete("/logout", async ({ headers, set }) => {
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
  });
