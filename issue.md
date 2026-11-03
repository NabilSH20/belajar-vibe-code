# Feature Plan: User Logout API (`DELETE /api/users/logout`)

## 1. Ringkasan Fitur
Tujuan dari issue ini adalah membuat endpoint untuk fitur logout user pada aplikasi backend. Saat user melakukan logout, token sesi yang dikirimkan pada HTTP Header `Authorization` akan divalidasi dan kemudian dihapus secara permanen dari tabel `sessions` di database MySQL. Dengan begitu, sesi tersebut dinyatakan berakhir dan tidak dapat lagi digunakan untuk mengakses endpoint yang membutuhkan autentikasi (seperti `POST /api/users/current`).

Dokumen ini disusun sebagai panduan langkah demi langkah (*step-by-step*) yang mudah dipahami oleh programmer junior maupun model AI.

---

## 2. Spesifikasi API Endpoint

### Endpoint: `DELETE /api/users/logout`
- **Method**: `DELETE`
- **Request Headers**:
  - `Authorization`: `Bearer <token>` (Token sesi UUID pengguna yang sedang aktif)
- **Request Body**: *(Kosong / Tidak memerlukan request body)*

#### Response Sukses (HTTP 200)
Jika token valid dan sesi berhasil dihapus dari database:
```json
{
  "data": "OK"
}
```

#### Response Error (HTTP 401 Unauthorized)
Terjadi jika:
- Header `Authorization` tidak dikirimkan.
- Format header tidak diawali dengan `Bearer ` atau token kosong.
- Token tidak ditemukan di tabel `sessions` (misalnya token palsu atau sudah pernah logout sebelumnya).
```json
{
  "error": "Unauthorized"
}
```

---

## 3. Standar Arsitektur & Struktur File

Melanjutkan arsitektur proyek berbasis **Separation of Concerns (SoC)**:
1. **Route Layer (`src/route/users-route.js`)**: Mengekstrak token dari header `Authorization`, memanggil fungsi service `logoutUser`, dan mengatur status code HTTP (200 untuk sukses, 401 untuk unauthorized).
2. **Service Layer (`src/services/users-services.js`)**: Memeriksa keberadaan sesi di database, menghapus record sesi menggunakan Drizzle ORM (`db.delete`), dan mengembalikan hasil `{ data: "OK" }`.

### Struktur File:
```text
src/
├── db/
│   ├── index.js             # Koneksi Drizzle & pool MySQL
│   └── schema.js            # Skema tabel users dan sessions
├── route/
│   └── users-route.js       # Penambahan handler: DELETE /api/users/logout
└── services/
    └── users-services.js    # Penambahan fungsi service: logoutUser
```

---

## 4. Panduan Tahapan Implementasi (Step-by-Step untuk Junior Programmer)

### Langkah 1: Pahami Alur Kerja Logout
1. Client mengirim request `DELETE` ke `/api/users/logout` dengan membawa header `Authorization: Bearer <token>`.
2. Server mengambil string token tersebut.
3. Server mencari token tersebut di tabel `sessions`.
4. Jika sesi tidak ditemukan, lempar error HTTP 401 `"Unauthorized"`.
5. Jika sesi ditemukan, hapus baris (*row*) sesi tersebut dari tabel `sessions`.
6. Kembalikan response HTTP 200 dengan format `{ "data": "OK" }`.

### Langkah 2: Tambahkan Service `logoutUser` di `src/services/users-services.js`
Buat fungsi asynchronous `logoutUser(token)`:
1. **Validasi Input**:
   - Jika `token` kosong/undefined, lempar error dengan pesan `"Unauthorized"` dan `statusCode = 401`.
2. **Cek Keberadaan Sesi di Database**:
   - Query tabel `sessions` berdasarkan `token`:
     ```javascript
     const [session] = await db
       .select()
       .from(sessions)
       .where(eq(sessions.token, token))
       .limit(1);
     ```
   - Jika `!session`, lempar error dengan pesan `"Unauthorized"` dan `statusCode = 401`.
3. **Hapus Sesi dari Database**:
   - Jalankan query delete Drizzle ORM:
     ```javascript
     await db.delete(sessions).where(eq(sessions.token, token));
     ```
4. **Kembalikan Hasil**:
   - Return `{ data: "OK" }`.

### Langkah 3: Tambahkan Handler di Route `src/route/users-route.js`
1. Import fungsi `logoutUser` dari `../services/users-services.js`.
2. Tambahkan handler route `.delete("/logout", ...)` pada instance router `usersRoute`:
   ```javascript
   .delete("/logout", async ({ headers, set }) => {
     try {
       const authHeader = headers.authorization || headers.Authorization;

       // Validasi keberadaan format Bearer token
       if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
         set.status = 401;
         return { error: "Unauthorized" };
       }

       // Ekstrak nilai token
       const token = authHeader.substring(7).trim();
       if (!token) {
         set.status = 401;
         return { error: "Unauthorized" };
       }

       const result = await logoutUser(token);
       set.status = 200;
       return { data: result.data };
     } catch (error) {
       set.status = error.statusCode || 401;
       return { error: "Unauthorized" };
     }
   })
   ```

### Langkah 4: Pengujian & Validasi Fitur
Jalankan server menggunakan `bun run dev` dan lakukan pengujian skenario berikut secara berurutan:

1. **Skenario 1: Login dan Ambil Token**:
   - Kirim `POST /api/users/login` dengan kredensial valid.
   - Ambil token UUID dari response: `{ "data": "<token>" }`.
2. **Skenario 2: Logout Berhasil (HTTP 200)**:
   - Kirim `DELETE /api/users/logout` dengan header `Authorization: Bearer <token>`.
   - Ekspektasi: HTTP 200, response body `{ "data": "OK" }`.
3. **Skenario 3: Verifikasi Penghapusan di Database**:
   - Cek tabel `sessions` di MySQL untuk memastikan record dengan token tersebut telah terhapus (*tidak ada lagi di database*).
4. **Skenario 4: Coba Logout Ulang dengan Token yang Sama (HTTP 401)**:
   - Kirim kembali `DELETE /api/users/logout` dengan token yang barusan dihapus.
   - Ekspektasi: HTTP 401, response body `{ "error": "Unauthorized" }` (karena sesi sudah hangus).
5. **Skenario 5: Coba Akses Get Current User dengan Token yang Telah Logout (HTTP 401)**:
   - Kirim `POST /api/users/current` dengan token yang telah logout.
   - Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
6. **Skenario 6: Logout Tanpa Header Authorization (HTTP 401)**:
   - Kirim `DELETE /api/users/logout` tanpa header.
   - Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.

---

## 5. Catatan Penting untuk Junior Programmer
- **Sifat Idempoten vs Strict Auth**: Pada skenario autentikasi sesi ketat, jika token sudah tidak ada di database, server wajib menolak request dengan HTTP 401 Unauthorized karena token tersebut tidak merepresentasikan sesi pengguna yang sah.
- **Integritas Relasi**: Menghapus data sesi hanya menghapus row pada tabel `sessions`, akun user pada tabel `users` tetap ada dan utuh.

---

## 6. Definition of Done (DoD)
- [x] Fungsi `logoutUser(token)` dibuat di `src/services/users-services.js`.
- [x] Record sesi terkait berhasil dihapus dari tabel `sessions` saat logout dipanggil.
- [x] Handler `DELETE /api/users/logout` terpasang di `src/route/users-route.js`.
- [x] Header `Authorization: Bearer <token>` tervalidasi dengan benar.
- [x] Response sukses mengembalikan format HTTP 200 `{ "data": "OK" }`.
- [x] Response error saat token tidak valid/sudah dihapus mengembalikan format HTTP 401 `{ "error": "Unauthorized" }`.
- [x] Token yang telah di-logout terbukti tidak bisa lagi digunakan pada endpoint `POST /api/users/current`.
- [x] Seluruh skenario pengujian manual berhasil dipenuhi.
