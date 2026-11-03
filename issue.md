# Feature Plan: User Login & Session Management API (`POST /api/users/login`)

## 1. Ringkasan Fitur
Tujuan dari issue ini adalah membuat fitur login autentikasi user pada aplikasi backend. Fitur ini mencakup penambahan tabel `sessions` untuk menyimpan token sesi login berbasis **UUID**, verifikasi password ter-hash menggunakan **bcrypt**, serta penanganan respons error yang aman.

Dokumen ini dirancang sebagai acuan teknis yang jelas dan bertahap (*step-by-step*) bagi programmer junior maupun model AI.

---

## 2. Spesifikasi Database (`sessions`)

Lokasi file skema: `src/db/schema.js`

### Struktur Tabel `sessions`:
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `serial` / `int` | Primary Key, Auto Increment |
| `token` | `varchar(255)` | Not Null, Unique (Berisi string UUID sesi login) |
| `user_id` | `int` | Not Null, Foreign Key mengarah ke `users.id` |
| `created_at` | `timestamp` | Default current timestamp (`CURRENT_TIMESTAMP`) |

> **Catatan Relasi (Foreign Key)**:
> Kolom `user_id` pada tabel `sessions` berelasi langsung dengan kolom `id` pada tabel `users` (dapat menggunakan opsi *cascade delete* agar saat user dihapus, sesinya otomatis ikut terhapus).

---

## 3. Spesifikasi API Endpoint

### Endpoint: `POST /api/users/login`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "email": "nabil@localhost",
  "password": "rahasia"
}
```

#### Response Sukses (HTTP 200)
```json
{
  "data": "a8098c1a-f86e-11da-bd1a-00112444be1e"
}
```
*(Nilai `"data"` berisi string token UUID yang baru saja digenerate dan disimpan ke tabel `sessions`)*

#### Response Error (HTTP 400 atau 401)
Kasus: Email tidak ditemukan ATAU password salah.
```json
{
  "error": "email atau password salah"
}
```
> **Catatan Keamanan**: Pesan error sengaja dibuat generik (`"email atau password salah"`) agar penyerang (attacker) tidak dapat mengetahui apakah email tersebut terdaftar atau tidak di sistem.

---

## 4. Standar Arsitektur & Struktur File

Melanjutkan arsitektur proyek berbasis **Separation of Concerns**:
1. **Route Layer (`src/route/users-route.js`)**: Menerima request HTTP, meneruskan data body ke service, dan mengembalikan format respons HTTP beserta status code.
2. **Service Layer (`src/services/users-services.js`)**: Menjalankan pengecekan keberadaan user, memvalidasi hash bcrypt, men-generate UUID token, dan menyimpan sesi ke database.

### Struktur File:
```text
src/
├── db/
│   ├── index.js             # Koneksi Drizzle & pool MySQL
│   └── schema.js            # Skema tabel users dan penambahan tabel sessions
├── route/
│   └── users-route.js       # Penambahan route handler: POST /api/users/login
└── services/
    └── users-services.js    # Penambahan fungsi service: loginUser
```

---

## 5. Panduan Tahapan Implementasi (Step-by-Step untuk Junior Programmer)

### Langkah 1: Update Skema Database di `src/db/schema.js`
1. Buka file `src/db/schema.js`.
2. Import tipe `int` dari `drizzle-orm/mysql-core`.
3. Definisikan tabel `sessions`:
   ```javascript
   import { mysqlTable, serial, varchar, timestamp, int } from "drizzle-orm/mysql-core";

   export const sessions = mysqlTable("sessions", {
     id: serial("id").primaryKey(),
     token: varchar("token", { length: 255 }).notNull().unique(),
     userId: int("user_id")
       .notNull()
       .references(() => users.id, { onDelete: "cascade" }),
     createdAt: timestamp("created_at").defaultNow().notNull(),
   });
   ```

### Langkah 2: Migrasi Database dengan Drizzle Kit
1. Generate file migrasi baru untuk tabel `sessions`:
   ```bash
   bun run db:generate
   ```
2. Terapkan perubahan ke database MySQL lokal:
   ```bash
   bun run db:push
   ```

### Langkah 3: Implementasi Logika Login di Service (`src/services/users-services.js`)
Tambahkan fungsi asynchronous baru `loginUser({ email, password })`:
1. **Validasi Input**:
   - Pastikan `email` dan `password` dikirim dan tidak berupa string kosong. Jika kosong, lempar error dengan pesan `"email atau password salah"`.
2. **Cari User di Database**:
   - Query tabel `users` berdasarkan email yang diberikan:
     ```javascript
     const [user] = await db
       .select()
       .from(users)
       .where(eq(users.email, email))
       .limit(1);
     ```
   - Jika `user` tidak ditemukan, lempar error `"email atau password salah"`.
3. **Verifikasi Hash Password (Bcrypt)**:
   - Gunakan fitur native Bun `Bun.password.verify`:
     ```javascript
     const isPasswordValid = await Bun.password.verify(password, user.password);
     ```
   - Jika `!isPasswordValid`, lempar error `"email atau password salah"`.
4. **Generate Token Sesi (UUID)**:
   - Gunakan fungsi native bawaan: `crypto.randomUUID()`.
5. **Simpan Sesi ke Database**:
   - Lakukan insert ke tabel `sessions`:
     ```javascript
     await db.insert(sessions).values({
       token,
       userId: user.id,
     });
     ```
6. **Kembalikan Hasil**:
   - Return `{ data: token }`.

### Langkah 4: Tambahkan Handler di Route (`src/route/users-route.js`)
1. Import fungsi `loginUser` dari `../services/users-services.js`.
2. Tambahkan endpoint `.post("/login", ...)` ke instance router `usersRoute`:
   ```javascript
   .post("/login", async ({ body, set }) => {
     try {
       const result = await loginUser(body);
       set.status = 200;
       return { data: result.data };
     } catch (error) {
       set.status = 400; // atau 401 Unauthorized
       return { error: error.message };
     }
   })
   ```

### Langkah 5: Pengujian & Validasi Fitur
Jalankan server dengan `bun run dev` dan lakukan pengujian skenario berikut:

1. **Uji Login Berhasil (Happy Path)**:
   - Kirim `POST /api/users/login` dengan kredensial yang valid (user yang sudah terdaftar).
   - Ekspektasi: HTTP 200, respons `{ "data": "<string-uuid-token>" }`.
2. **Uji Login Gagal - Password Salah**:
   - Kirim `POST /api/users/login` dengan password keliru.
   - Ekspektasi: HTTP 400/401, respons `{ "error": "email atau password salah" }`.
3. **Uji Login Gagal - Email Tidak Terdaftar**:
   - Kirim `POST /api/users/login` dengan email acak yang belum terdaftar.
   - Ekspektasi: HTTP 400/401, respons `{ "error": "email atau password salah" }`.
4. **Verifikasi Database**:
   - Cek tabel `sessions` di MySQL untuk memastikan record baru tersimpan dengan `token` berupa UUID dan `user_id` yang sesuai dengan ID user login.

---

## 6. Definition of Done (DoD)
- [x] Skema tabel `sessions` dibuat di `src/db/schema.js` dengan relasi foreign key ke tabel `users`.
- [x] File migrasi Drizzle untuk tabel `sessions` berhasil di-generate dan diaplikasikan ke database.
- [x] Fungsi `loginUser` di `src/services/users-services.js` memverifikasi password dengan `Bun.password.verify`.
- [x] Token digenerate menggunakan UUID (`crypto.randomUUID()`) dan tersimpan ke tabel `sessions`.
- [x] Endpoint `POST /api/users/login` terpasang di `src/route/users-route.js`.
- [x] Format respon sukses mengembalikan `{ "data": "<token>" }`.
- [x] Format respon error saat kredensial salah mengembalikan `{ "error": "email atau password salah" }`.
- [x] Seluruh skenario pengujian manual berhasil dipenuhi.

