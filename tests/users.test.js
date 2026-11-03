import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import app from "../src/index.js";
import { db, pool } from "../src/db/index.js";
import { users, sessions } from "../src/db/schema.js";

// Helper untuk mengirim HTTP request in-memory ke Elysia app
async function request(path, options = {}) {
  const url = `http://localhost:3000${path}`;
  const req = new Request(url, {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const res = await app.handle(req);
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // If response is not JSON
  }
  return {
    status: res.status,
    body: json,
    headers: res.headers,
  };
}

// Bersihkan data database sebelum setiap test case untuk menjamin isolasi & idempotensi
beforeEach(async () => {
  await db.delete(sessions);
  await db.delete(users);
});

// Tutup koneksi pool setelah seluruh pengujian selesai agar runner Bun keluar dengan bersih
afterAll(async () => {
  await db.delete(sessions);
  await db.delete(users);
  await pool.end();
});

describe("Root & Healthcheck Endpoints", () => {
  it("GET / should return server info", async () => {
    const res = await request("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("ElysiaJS");
    expect(res.body.version).toBe("1.0.0");
  });

  it("GET /health should return ok and database status", async () => {
    const res = await request("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBeDefined();
    expect(res.body.database.status).toBe("connected");
  });
});

describe("POST /api/users - Register User", () => {
  it("should successfully register a new user and hash password in database", async () => {
    const res = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        name: "Nabil",
        email: "nabil@localhost",
        password: "rahasiaSuper123",
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: "OK" });

    // Verifikasi database record & hashing bcrypt
    const allUsers = await db.select().from(users);
    expect(allUsers.length).toBe(1);
    expect(allUsers[0].name).toBe("Nabil");
    expect(allUsers[0].email).toBe("nabil@localhost");
    expect(allUsers[0].password.startsWith("$2b$")).toBe(true);
    expect(allUsers[0].password).not.toBe("rahasiaSuper123");
  });

  it("should fail when required fields are missing", async () => {
    // Missing name
    const res1 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "a@localhost", password: "pwd" },
    });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe("name, email, dan password wajib diisi");

    // Missing email
    const res2 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "A", password: "pwd" },
    });
    expect(res2.status).toBe(400);

    // Missing password
    const res3 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "A", email: "a@localhost" },
    });
    expect(res3.status).toBe(400);

    // Empty body
    const res4 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {},
    });
    expect(res4.status).toBe(400);
  });

  it("should fail when input contains only whitespace or invalid types", async () => {
    const res1 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "   ", email: "valid@localhost", password: "pwd" },
    });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe("name, email, dan password wajib diisi");

    const res2 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: 12345, email: "valid@localhost", password: "pwd" },
    });
    expect(res2.status).toBe(400);
  });

  it("should fail when input length exceeds 255 characters", async () => {
    // Name > 255
    const res1 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "a".repeat(256), email: "valid@localhost", password: "pwd" },
    });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe("nama maksimal 255 karakter");

    // Email > 255
    const res2 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "Valid", email: "e".repeat(250) + "@test.com", password: "pwd" },
    });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toBe("email maksimal 255 karakter");

    // Password > 255
    const res3 = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "Valid", email: "valid@localhost", password: "p".repeat(256) },
    });
    expect(res3.status).toBe(400);
    expect(res3.body.error).toBe("password maksimal 255 karakter");
  });

  it("should fail when registering with an existing email (duplicate)", async () => {
    // First registration
    await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "User One", email: "duplicate@localhost", password: "password123" },
    });

    // Second registration with same email
    const res = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "User Two", email: "duplicate@localhost", password: "password456" },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email sudah terdaftar");
  });

  it("should never leak SQL query or raw database error to client", async () => {
    const res = await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "x".repeat(300), email: "test@localhost", password: "pwd" },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain("Failed query:");
    expect(res.body.error).not.toContain("insert into");
  });
});

describe("POST /api/users/login - Login User", () => {
  beforeEach(async () => {
    // Daftarkan 1 user untuk pengujian login
    await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "Nabil", email: "nabil@localhost", password: "rahasiaUser123" },
    });
  });

  it("should successfully login with valid credentials and record session", async () => {
    const res = await request("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "nabil@localhost", password: "rahasiaUser123" },
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data).toBe("string");

    // Verifikasi sesi tersimpan di database
    const allSessions = await db.select().from(sessions);
    expect(allSessions.length).toBe(1);
    expect(allSessions[0].token).toBe(res.body.data);
  });

  it("should fail login when password is wrong", async () => {
    const res = await request("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "nabil@localhost", password: "wrongpassword" },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email atau password salah");
  });

  it("should fail login when email is not registered", async () => {
    const res = await request("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "unregistered@localhost", password: "rahasiaUser123" },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email atau password salah");
  });

  it("should fail login when required fields are missing", async () => {
    const res1 = await request("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "nabil@localhost" },
    });
    expect(res1.status).toBe(400);

    const res2 = await request("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { password: "rahasiaUser123" },
    });
    expect(res2.status).toBe(400);
  });
});

describe("POST /api/users/current - Get Current User", () => {
  let validToken;

  beforeEach(async () => {
    // Daftarkan user & login untuk mendapatkan valid token
    await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "Nabil", email: "nabil@localhost", password: "rahasiaUser123" },
    });
    const loginRes = await request("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "nabil@localhost", password: "rahasiaUser123" },
    });
    validToken = loginRes.body.data;
  });

  it("should return user profile and never expose password with valid token", async () => {
    const res = await request("/api/users/current", {
      method: "POST",
      headers: { Authorization: `Bearer ${validToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe("Nabil");
    expect(res.body.data.email).toBe("nabil@localhost");
    expect(res.body.data.create_at).toBeDefined();
    expect(res.body.data.password).toBeUndefined();
  });

  it("should accept lowercase bearer scheme in Authorization header", async () => {
    const res = await request("/api/users/current", {
      method: "POST",
      headers: { authorization: `bearer ${validToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("nabil@localhost");
  });

  it("should return 401 when token is invalid or non-existent", async () => {
    const res = await request("/api/users/current", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-uuid-token-12345" },
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("should return 401 when Authorization header is missing or malformed", async () => {
    // Missing header
    const res1 = await request("/api/users/current", { method: "POST" });
    expect(res1.status).toBe(401);
    expect(res1.body.error).toBe("Unauthorized");

    // Scheme is not Bearer
    const res2 = await request("/api/users/current", {
      method: "POST",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(res2.status).toBe(401);
    expect(res2.body.error).toBe("Unauthorized");

    // Bearer without token
    const res3 = await request("/api/users/current", {
      method: "POST",
      headers: { Authorization: "Bearer " },
    });
    expect(res3.status).toBe(401);
    expect(res3.body.error).toBe("Unauthorized");
  });
});

describe("DELETE /api/users/logout - Logout User", () => {
  let validToken;

  beforeEach(async () => {
    // Daftarkan user & login untuk mendapatkan valid token
    await request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { name: "Nabil", email: "nabil@localhost", password: "rahasiaUser123" },
    });
    const loginRes = await request("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "nabil@localhost", password: "rahasiaUser123" },
    });
    validToken = loginRes.body.data;
  });

  it("should successfully logout and permanently remove session from database", async () => {
    const res = await request("/api/users/logout", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${validToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: "OK" });

    // Verifikasi sesi terhapus di database
    const allSessions = await db.select().from(sessions);
    expect(allSessions.length).toBe(0);
  });

  it("should return 401 on repeat logout with the same token", async () => {
    // First logout
    await request("/api/users/logout", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${validToken}` },
    });

    // Repeat logout
    const res = await request("/api/users/logout", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${validToken}` },
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("should return 401 for invalid or missing Authorization header", async () => {
    const res1 = await request("/api/users/logout", { method: "DELETE" });
    expect(res1.status).toBe(401);

    const res2 = await request("/api/users/logout", {
      method: "DELETE",
      headers: { Authorization: "Bearer invalid-token-xyz" },
    });
    expect(res2.status).toBe(401);
  });

  it("should invalidate session across lifecycle (login -> current -> logout -> current rejected)", async () => {
    // 1. Current user works
    const resCurrentBefore = await request("/api/users/current", {
      method: "POST",
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect(resCurrentBefore.status).toBe(200);

    // 2. Logout
    const resLogout = await request("/api/users/logout", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect(resLogout.status).toBe(200);

    // 3. Current user rejected with 401
    const resCurrentAfter = await request("/api/users/current", {
      method: "POST",
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect(resCurrentAfter.status).toBe(401);
    expect(resCurrentAfter.body.error).toBe("Unauthorized");
  });
});

