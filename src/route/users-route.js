import { Elysia } from "elysia";
import { registerUser, loginUser, getCurrentUser } from "../services/users-services.js";

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
      const authHeader = headers.authorization || headers.Authorization;

      if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        set.status = 401;
        return {
          error: "Unauthorized",
        };
      }

      const token = authHeader.substring(7).trim();
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
  });
