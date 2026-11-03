# Feature Plan: Get Current User API (`POST /api/users/current`)

## 1. Ringkasan Fitur
Tujuan dari issue ini adalah membuat endpoint untuk mengambil data profil user yang sedang login (*current user*) berdasarkan token sesi yang dikirimkan pada HTTP Header `Authorization`. 

Fitur ini memanfaatkan tabel `sessions` yang berelasi dengan tabel `users` untuk memvalidasi sesi aktif pengguna. Dokumen ini dirancang sebagai panduan langkah demi langkah (*step-by-step*) yang mudah dipahami oleh programmer junior maupun model AI.

---

## 2. Spesifikasi API Endpoint

### Endpoint: `POST /api/users/current`
- **Method**: `POST`
- **Request Headers**:
  - `Authorization`: `Bearer <token>` (Token sesi UUID yang didapatkan saat login)
- **Request Body**: *(Kosong / Tidak memerlukan request body)*

#### Response Sukses (HTTP 200)
Jika token valid dan sesi ditemukan:
```json
{
  "data": {
    "id": 1,
    "name": "nabil",
    "email": "nabil@localhost",
    "create_at": "2026-11-03T12:41:38.000Z"
  }
}
```
> **Penting (Keamanan)**: Kolom `password` **tidak boleh** disertakan dalam response data demi alasan privasi dan keamanan sistem.

#### Response Error (HTTP 401 Unauthorized)
Terjadi jika:
- Header `Authorization` tidak dikirimkan.
- Format header tidak diawali dengan `Bearer ` atau token kosong.
- Token tidak ditemukan di tabel `sessions`.
- Sesi tidak lagi valid / user tidak ditemukan.
```json
{
  "error": "Unauthorized"
}
```

---

## 3. Standar Arsitektur & Struktur File

Melanjutkan arsitektur proyek berbasis **Separation of Concerns (SoC)**:
1. **Route Layer (`src/route/users-route.js`)**: Membaca request headers, mengekstrak token dari header `Authorization`, memanggil service, dan mengatur status code HTTP (200 untuk sukses, 401 untuk unauthorized).
2. **Service Layer (`src/services/users-services.js`)**: Mengambil data token, melakukan query ke database (JOIN tabel `sessions` dan `users`), memastikan keamanan data (tidak menyertakan password), dan mengembalikan objek user.

### Struktur File:
```text
src/
├── db/
│   ├── index.js             # Koneksi Drizzle & pool MySQL
│   └── schema.js            # Skema tabel users dan sessions
├── route/
│   └── users-route.js       # Penambahan handler: POST /api/users/current
└── services/
    └── users-services.js    # Penambahan fungsi service: getCurrentUser
```

---

## 4. Panduan Tahapan Implementasi (Step-by-Step untuk Junior Programmer)

### Langkah 1: Pahami Alur Kerja Validasi Token
1. Client mengirim request ke `POST /api/users/current` dengan header `Authorization: Bearer <token>`.
2. Server mengambil string token tersebut (menghilangkan kata `"Bearer "`).
3. Server mencari token tersebut di tabel `sessions`.
4. Jika ditemukan, server mengambil data `users` yang berelasi dengan `sessions.user_id`.
5. Data user dikembalikan tanpa kolom `password`.
6. Jika token tidak ditemukan atau header tidak valid, kembalikan HTTP 401 dengan `{ "error": "Unauthorized" }`.

### Langkah 2: Tambahkan Service `getCurrentUser` di `src/services/users-services.js`
Buat fungsi asynchronous `getCurrentUser(token)`:
1. **Validasi Input**:
   - Jika `token` tidak ada atau kosong, lempar error dengan pesan `"Unauthorized"` dan `statusCode = 401`.
2. **Query Database (JOIN sessions & users)**:
   - Gunakan query Drizzle dengan inner join antara tabel `sessions` dan tabel `users` untuk efisiensi (1 kali query):
     ```javascript
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
     ```
3. **Pengecekan Keberadaan Data**:
   - Jika `!result`, lempar error dengan pesan `"Unauthorized"` dan `statusCode = 401`.
4. **Kembalikan Hasil**:
   - Return `{ data: result }`.

### Langkah 3: Tambahkan Handler di Route `src/route/users-route.js`
1. Import fungsi `getCurrentUser` dari `../services/users-services.js`.
2. Tambahkan handler route `.post("/current", ...)` pada instance router `usersRoute`:
   ```javascript
   .post("/current", async ({ headers, set }) => {
     try {
       const authHeader = headers.authorization || headers.Authorization;
       
       // Cek keberadaan dan format header Authorization
       if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
         set.status = 401;
         return { error: "Unauthorized" };
       }

       // Ekstrak token setelah kata 'Bearer '
       const token = authHeader.substring(7).trim();
       if (!token) {
         set.status = 401;
         return { error: "Unauthorized" };
       }

       const result = await getCurrentUser(token);
       set.status = 200;
       return { data: result.data };
     } catch (error) {
       set.status = error.statusCode || 401;
       return { error: "Unauthorized" };
     }
   })
   ```

### Langkah 4: Pengujian & Validasi Fitur
Jalankan server menggunakan `bun run dev` dan lakukan pengujian dengan skenario berikut:

1. **Skenario 1: Login untuk Mendapatkan Token**:
   - Kirim `POST /api/users/login` dengan email dan password yang benar.
   - Salin token UUID dari response: `{ "data": "<token>" }`.
2. **Skenario 2: Get Current User Berhasil (HTTP 200)**:
   - Kirim `POST /api/users/current` dengan header `Authorization: Bearer <token>`.
   - Ekspektasi: HTTP 200, response body berupa data user `{ id, name, email, create_at }` dan **tidak memuat password**.
3. **Skenario 3: Get Current User Gagal - Token Palsu/Salah (HTTP 401)**:
   - Kirim `POST /api/users/current` dengan header `Authorization: Bearer token-ngawur-123`.
   - Ekspektasi: HTTP 401, response body `{ "error": "Unauthorized" }`.
4. **Skenario 4: Get Current User Gagal - Header Kosong (HTTP 401)**:
   - Kirim `POST /api/users/current` tanpa menyertakan header `Authorization`.
   - Ekspektasi: HTTP 401, response body `{ "error": "Unauthorized" }`.

---

## 5. Catatan Penting untuk Junior Programmer
- **Keamanan Data Pengguna**: Selalu gunakan whitelist/proyeksi field saat query user (misal: hanya mengambil `id`, `name`, `email`, `createdAt`). Jangan pernah menggunakan `select()` tanpa spesifikasi field jika hasilnya langsung dikembalikan ke client, karena field `password` akan ikut terekspos.
- **Konsistensi Format Error**: Seluruh kasus kegagalan autentikasi (token salah, expired, kosong, format rusak) harus selalu mengembalikan HTTP 401 dengan pesan standar `"Unauthorized"`.

---

## 6. Definition of Done (DoD)
- [x] Fungsi `getCurrentUser` dibuat di `src/services/users-services.js` menggunakan query JOIN antara tabel `sessions` dan `users`.
- [x] Kolom `password` tidak disertakan dalam data yang di-return oleh service.
- [x] Handler `POST /api/users/current` terpasang di `src/route/users-route.js`.
- [x] Header `Authorization: Bearer <token>` diekstrak dan divalidasi dengan benar.
- [x] Response sukses mengembalikan format HTTP 200 `{ "data": { "id", "name", "email", "create_at" } }`.
- [x] Response error saat token tidak valid atau header tidak ada mengembalikan format HTTP 401 `{ "error": "Unauthorized" }`.
- [x] Seluruh skenario pengujian manual berhasil dipenuhi.

