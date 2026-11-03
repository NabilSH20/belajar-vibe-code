# Feature Plan: User Registration API (`POST /api/users`)

## 1. Ringkasan Fitur
Tujuan dari issue ini adalah membuat fitur registrasi user baru pada aplikasi backend. Fitur ini mencakup pembaruan skema tabel database `users`, pemisahan logika ke dalam layer arsitektur `route` dan `services`, serta penanganan hashing password menggunakan algoritma **bcrypt**.

Panduan ini disusun secara terstruktur agar mudah dipahami dan dieksekusi oleh programmer junior maupun model AI.

---

## 2. Spesifikasi Database (`users`)

Lokasi file skema: `src/db/schema.js`

Struktur tabel `users`:
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `serial` / `int` | Primary Key, Auto Increment |
| `name` | `varchar(255)` | Not Null |
| `email` | `varchar(255)` | Not Null, Unique |
| `password` | `varchar(255)` | Not Null (Menyimpan hash bcrypt, bukan plain text) |
| `created_at` | `timestamp` | Default current timestamp (opsional / pelengkap) |

---

## 3. Spesifikasi API Endpoint

### Endpoint: `POST /api/users`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "name": "nabil",
  "email": "nabil@localhost",
  "password": "rahasia"
}
```

#### Response Sukses (HTTP 200 / 201)
```json
{
  "data": "OK"
}
```

#### Response Error - Email Duplikat (HTTP 400 / 409)
```json
{
  "error": "email sudah terdaftar"
}
```

---

## 4. Standar Arsitektur & Struktur Folder

Proyek menggunakan pola **Separation of Concerns (SoC)** untuk memisahkan tanggung jawab penanganan HTTP request dan logika bisnis:
1. **Route Layer (`src/route/`)**: Bertanggung jawab menerima request HTTP, membaca body, memanggil service yang sesuai, dan mengembalikan response status HTTP.
2. **Service Layer (`src/services/`)**: Bertanggung jawab memproses logika bisnis (validasi, pengecekan ke database, hashing password, dan penyimpanan data).

### Struktur Folder & File yang Dibutuhkan:
```text
src/
├── db/
│   ├── index.js             # Koneksi database Drizzle & MySQL
│   └── schema.js            # Skema tabel database (tabel users)
├── route/
│   └── users-route.js       # Definisi routing Elysia untuk entitas users
├── services/
│   └── users-services.js    # Logika bisnis registrasi & query Drizzle
└── index.js                 # Entry point server (mounting users-route)
```

> **Aturan Penamaan File**:
> - File routing ditempatkan di `src/route/` dengan format kebab-case: `users-route.js`.
> - File service ditempatkan di `src/services/` dengan format kebab-case: `users-services.js`.
> - Menggunakan JavaScript murni (ES Modules / ESM) dengan ekstensi `.js`.

---

## 5. Panduan Tahapan Implementasi (Step-by-Step untuk Junior Programmer)

### Langkah 1: Update Skema Database `users`
1. Buka file `src/db/schema.js`.
2. Tambahkan kolom `password: varchar("password", { length: 255 }).notNull()` pada tabel `users`.
3. Pastikan kolom `name` dan `email` sudah berstatus `.notNull()` dan `email` berstatus `.unique()`.

### Langkah 2: Sinkronisasi Skema ke Database (Drizzle Kit)
1. Jalankan perintah generate migrasi:
   ```bash
   bun run db:generate
   ```
2. Atau jika terhubung ke MySQL lokal, jalankan perintah push skema:
   ```bash
   bun run db:push
   ```

### Langkah 3: Setup Hashing Password (Bcrypt)
Karena proyek menggunakan runtime **Bun**, kita memiliki 2 opsi yang didukung:
- **Opsi Rekomendasi (Built-in Bun)**: Gunakan `Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 })` bawaan runtime Bun (tidak perlu install dependensi tambahan).
- **Opsi Alternatif**: Menginstal library `bcryptjs` via `bun add bcryptjs`.

### Langkah 4: Buat Service Registrasi (`src/services/users-services.js`)
Buat file `src/services/users-services.js` dan implementasikan fungsi registrasi user:
1. Import `db` dari `../db/index.js` dan tabel `users` dari `../db/schema.js`.
2. Import operator pembantu dari Drizzle ORM: `import { eq } from "drizzle-orm";`.
3. Buat fungsi asynchronous `registerUser({ name, email, password })`:
   - **Validasi dasar**: Pastikan `name`, `email`, dan `password` terisi.
   - **Cek email**: Lakukan query ke tabel `users` untuk mengecek apakah `email` sudah terdaftar:
     ```javascript
     const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
     ```
   - **Kondisi email ada**: Jika ditemukan, lempar error atau kembalikan status error dengan pesan `"email sudah terdaftar"`.
   - **Hash password**: Hash password plain text menggunakan bcrypt sebelum disimpan.
   - **Insert ke database**: Masukkan data `{ name, email, password: hashedPassword }` ke tabel `users`.
   - **Kembalikan hasil**: Return `{ success: true, data: "OK" }`.

### Langkah 5: Buat Route Controller (`src/route/users-route.js`)
Buat file `src/route/users-route.js` menggunakan framework Elysia:
1. Import `Elysia` dari package `elysia`.
2. Import fungsi registrasi dari `../services/users-services.js`.
3. Buat instance router Elysia:
   ```javascript
   export const usersRoute = new Elysia({ prefix: "/api/users" })
     .post("/", async ({ body, set }) => {
       try {
         const result = await registerUser(body);
         set.status = 200; // atau 201 Created
         return { data: result.data };
       } catch (error) {
         set.status = 400; // Bad Request / Conflict
         return { error: error.message };
       }
     });
   ```

### Langkah 6: Daftarkan Route ke Server Utama (`src/index.js`)
1. Buka `src/index.js`.
2. Import `usersRoute` dari `./route/users-route.js`.
3. Daftarkan router menggunakan middleware Elysia:
   ```javascript
   app.use(usersRoute);
   ```

### Langkah 7: Pengujian & Validasi
Lakukan pengujian manual untuk memastikan endpoint bekerja sesuai spesifikasi:
1. Jalankan server:
   ```bash
   bun run dev
   ```
2. **Uji Kasus Sukses**:
   Kirim request POST ke `http://localhost:3000/api/users` dengan body:
   ```json
   {
     "name": "nabil",
     "email": "nabil@localhost",
     "password": "rahasia"
   }
   ```
   Ekspektasi: Response status 200/201 dengan body `{"data": "OK"}`.
3. **Uji Kasus Duplikat (Error)**:
   Kirim kembali request dengan email yang sama (`nabil@localhost`).
   Ekspektasi: Response status error (400/409) dengan body `{"error": "email sudah terdaftar"}`.
4. **Verifikasi Database**:
   Pastikan nilai password yang tersimpan di database adalah string hash bcrypt (diawali `$2b$` atau `$2a$`), bukan kata sandi asli `rahasia`.

---

## 6. Definition of Done (DoD)
- [x] Kolom `password` bertipe `varchar(255) not null` ditambahkan ke skema `users` di `src/db/schema.js`.
- [x] File migrasi Drizzle berhasil di-generate.
- [x] Direktori `src/route/` dan `src/services/` dibuat.
- [x] File `src/services/users-services.js` menangani pengecekan email, hashing bcrypt, dan penyimpanan data.
- [x] File `src/route/users-route.js` menangani endpoint `POST /api/users`.
- [x] Route terdaftar di `src/index.js`.
- [x] Format response sukses `{ "data": "OK" }` dan error `{ "error": "email sudah terdaftar" }` sesuai spesifikasi.
- [x] Password tersimpan dalam bentuk hash di database.
