import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

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

