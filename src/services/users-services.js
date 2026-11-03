import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, sessions } from "../db/schema.js";

/**
 * Service untuk memproses registrasi user baru
 * @param {{ name?: string, email?: string, password?: string }} payload
 * @returns {Promise<{ data: string }>}
 */
export async function registerUser({ name, email, password } = {}) {
  // Validasi kelengkapan input
  if (!name || !email || !password) {
    const error = new Error("name, email, dan password wajib diisi");
    error.statusCode = 400;
    throw error;
  }

  // Cek apakah email sudah terdaftar di database
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    const error = new Error("email sudah terdaftar");
    error.statusCode = 400;
    throw error;
  }

  // Hash password menggunakan algoritma bcrypt
  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // Simpan data user ke database
  try {
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    });
  } catch (err) {
    // Tangani kemungkinan duplikasi dari constraint MySQL
    if (err.code === "ER_DUP_ENTRY" || err.message?.includes("Duplicate entry")) {
      const error = new Error("email sudah terdaftar");
      error.statusCode = 400;
      throw error;
    }
    throw err;
  }

  return { data: "OK" };
}

/**
 * Service untuk memproses autentikasi login user dan pembuatan session token
 * @param {{ email?: string, password?: string }} payload
 * @returns {Promise<{ data: string }>}
 */
export async function loginUser({ email, password } = {}) {
  // Validasi kelengkapan input
  if (!email || !password) {
    const error = new Error("email atau password salah");
    error.statusCode = 400;
    throw error;
  }

  // Cari user berdasarkan email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    const error = new Error("email atau password salah");
    error.statusCode = 400;
    throw error;
  }

  // Verifikasi hash password bcrypt
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("email atau password salah");
    error.statusCode = 400;
    throw error;
  }

  // Buat session token UUID
  const token = crypto.randomUUID();

  // Simpan session baru ke database
  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return { data: token };
}

/**
 * Service untuk mengambil data user yang sedang login berdasarkan session token
 * @param {string} token
 * @returns {Promise<{ data: { id: number, name: string, email: string, create_at: any } }>}
 */
export async function getCurrentUser(token) {
  if (!token) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      create_at: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!result) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  return { data: result };
}

/**
 * Service untuk logout user dan menghapus token sesi dari database
 * @param {string} token
 * @returns {Promise<{ data: string }>}
 */
export async function logoutUser(token) {
  if (!token) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  // Hapus sesi secara langsung dalam 1 query atomik untuk efisiensi dan menghindari race condition
  const [result] = await db.delete(sessions).where(eq(sessions.token, token));

  if (!result || result.affectedRows === 0) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  return { data: "OK" };
}
