import { Elysia } from "elysia";
import { registerUser } from "../services/users-services.js";

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
  });

