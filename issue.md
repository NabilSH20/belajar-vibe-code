# Test Plan: Unit & Integration Testing All APIs (Bun Test)

## 1. Ringkasan & Tujuan
Dokumen ini merangkum perencanaan pembuatan automated test suite untuk menguji seluruh endpoint API yang tersedia pada aplikasi. Pengujian dilakukan menggunakan test runner bawaan **Bun** (`bun test`). 

Tujuan utama dari pengujian ini adalah memastikan keandalan fungsional, kepatuhan validasi, penanganan error, serta pencegahan regresi di masa mendatang. Dokumen ini berfokus pada daftar skenario yang wajib diuji, sedangkan detail kode implementasi diserahkan kepada programmer atau model AI.

---

## 2. Lingkungan & Konfigurasi Pengujian

- **Direktori Target**: `tests/` (misalnya: `tests/users.test.js` atau file modular per fitur).
- **Test Runner**: [Bun Test](https://bun.sh/docs/cli/test) (`bun test`).
- **Skrip `package.json`**: Menambahkan skrip `"test": "bun test"`.
- **Strategi Isolasi Data (Database Cleanup)**:
  - Setiap pengujian wajib bersifat independen dan idempoten.
  - Gunakan hook lifecycle (`beforeEach` atau `afterEach`) untuk membersihkan data tabel `sessions` dan `users` di database agar data pengujian selalu konsisten dan tidak saling mengotori (*no test pollution*).
- **Metode Pemanggilan API**:
  - Manfaatkan fungsi `app.handle(new Request(...))` bawaan Elysia untuk eksekusi request in-memory yang cepat tanpa perlu membuka port jaringan lokal secara manual.

---

## 3. Matriks Skenario Pengujian per API

### 3.1. Endpoint Registrasi User (`POST /api/users`)
Daftar skenario yang wajib diuji:
1. **Skenario Sukses (Happy Path)**:
   - Registrasi dengan data `name`, `email`, dan `password` yang valid $\rightarrow$ Ekspektasi: HTTP 200 `{ "data": "OK" }`.
   - Verifikasi ke database bahwa password yang tersimpan berbentuk hash bcrypt (bukan teks asli).
2. **Skenario Validasi Input Kosong**:
   - Request body tanpa atribut `name` $\rightarrow$ Ekspektasi: HTTP 400.
   - Request body tanpa atribut `email` $\rightarrow$ Ekspektasi: HTTP 400.
   - Request body tanpa atribut `password` $\rightarrow$ Ekspektasi: HTTP 400.
   - Request body kosong `{}` $\rightarrow$ Ekspektasi: HTTP 400.
3. **Skenario Validasi Tipe Data & Whitespace**:
   - Nilai field hanya berupa spasi kosong (`"   "`) $\rightarrow$ Ekspektasi: HTTP 400.
   - Nilai field bertipe non-string (misal: angka/boolean) $\rightarrow$ Ekspektasi: HTTP 400.
4. **Skenario Validasi Batas Panjang Karakter**:
   - `name` memiliki panjang > 255 karakter $\rightarrow$ Ekspektasi: HTTP 400 `{ "error": "nama maksimal 255 karakter" }`.
   - `email` memiliki panjang > 255 karakter $\rightarrow$ Ekspektasi: HTTP 400 `{ "error": "email maksimal 255 karakter" }`.
   - `password` memiliki panjang > 255 karakter $\rightarrow$ Ekspektasi: HTTP 400 `{ "error": "password maksimal 255 karakter" }`.
5. **Skenario Duplikasi Data**:
   - Registrasi ulang dengan email yang sudah terdaftar $\rightarrow$ Ekspektasi: HTTP 400 `{ "error": "email sudah terdaftar" }`.
6. **Skenario Keamanan (No SQL Leak)**:
   - Memastikan tidak ada potongan query SQL mentah atau stack trace database yang muncul pada respon error.

---

### 3.2. Endpoint Login User (`POST /api/users/login`)
Daftar skenario yang wajib diuji:
1. **Skenario Sukses (Happy Path)**:
   - Login dengan kombinasi email dan password yang benar $\rightarrow$ Ekspektasi: HTTP 200 `{ "data": "<token-uuid>" }`.
   - Verifikasi bahwa token baru tersebut berhasil tercatat di tabel `sessions` pada database dengan `user_id` yang sesuai.
2. **Skenario Kredensial Salah**:
   - Login dengan email yang terdaftar, namun password salah $\rightarrow$ Ekspektasi: HTTP 400 `{ "error": "email atau password salah" }`.
   - Login dengan email yang belum terdaftar di database $\rightarrow$ Ekspektasi: HTTP 400 `{ "error": "email atau password salah" }`.
3. **Skenario Validasi Request Body**:
   - Request body tanpa atribut `email` $\rightarrow$ Ekspektasi: HTTP 400.
   - Request body tanpa atribut `password` $\rightarrow$ Ekspektasi: HTTP 400.
   - Request body kosong `{}` $\rightarrow$ Ekspektasi: HTTP 400.

---

### 3.3. Endpoint Get Current User (`POST /api/users/current`)
Daftar skenario yang wajib diuji:
1. **Skenario Sukses (Happy Path)**:
   - Mengakses endpoint dengan header `Authorization: Bearer <valid-token>` $\rightarrow$ Ekspektasi: HTTP 200 mengembalikan profil pengguna `{ id, name, email, create_at }`.
   - **Verifikasi Keamanan**: Memastikan atribut `password` **tidak ada** di dalam data respon.
2. **Skenario Token Tidak Valid / Expired**:
   - Mengakses dengan token acak yang tidak terdaftar di tabel `sessions` $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
3. **Skenario Header Tidak Lengkap / Format Rusak**:
   - Request tanpa menyertakan header `Authorization` $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
   - Header `Authorization` tidak diawali dengan skema `Bearer ` (misal: `Basic xyz` atau hanya string token saja) $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
   - Header `Authorization` hanya berisi kata `Bearer` tanpa token $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
4. **Skenario Case-Insensitive Skema**:
   - Header diawali dengan huruf kecil `bearer <token>` $\rightarrow$ Ekspektasi: Tetap berhasil HTTP 200.

---

### 3.4. Endpoint Logout User (`DELETE /api/users/logout`)
Daftar skenario yang wajib diuji:
1. **Skenario Sukses (Happy Path)**:
   - Logout dengan header `Authorization: Bearer <valid-token>` $\rightarrow$ Ekspektasi: HTTP 200 `{ "data": "OK" }`.
   - Verifikasi ke database bahwa record token terkait **benar-benar telah terhapus** dari tabel `sessions`.
2. **Skenario Token Tidak Ditemukan / Sudah Hangus**:
   - Logout menggunakan token yang sudah pernah di-logout sebelumnya (repeat logout) $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
   - Logout menggunakan token acak yang tidak terdaftar di database $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
3. **Skenario Validasi Header**:
   - Request tanpa menyertakan header `Authorization` $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
   - Format header bukan `Bearer` $\rightarrow$ Ekspektasi: HTTP 401 `{ "error": "Unauthorized" }`.
4. **Skenario Alur Lengkap (Session Invalidation Lifecycle)**:
   - Alur: Login $\rightarrow$ Ambil profil via `/current` (berhasil) $\rightarrow$ Logout via `/logout` (berhasil) $\rightarrow$ Coba ambil profil lagi via `/current` dengan token yang sama $\rightarrow$ Ekspektasi: Ditolak dengan HTTP 401 `{ "error": "Unauthorized" }`.

---

### 3.5. Endpoint Pendukung (Healthcheck & Root)
1. **Root Endpoint (`GET /`)**:
   - Ekspektasi: HTTP 200 mengembalikan pesan info server.
2. **Healthcheck Endpoint (`GET /health`)**:
   - Ekspektasi: HTTP 200 mengembalikan status server dan status konektivitas database MySQL.

---

## 4. Panduan Eksekusi bagi Programmer & Model AI

1. Buat folder `tests/` di root proyek.
2. Buat file test, misalnya `tests/users.test.js`.
3. Manfaatkan assertions dan hooks dari modul test Bun:
   ```javascript
   import { describe, it, expect, beforeEach, afterAll } from "bun:test";
   ```
4. Di dalam hook `beforeEach`, jalankan pembersihan data tabel:
   - Hapus tabel `sessions` terlebih dahulu (child).
   - Hapus tabel `users` (parent).
5. Jalankan pengujian melalui terminal:
   ```bash
   bun test
   ```
6. Pastikan seluruh skenario lulus (*100% passing*) tanpa flaky tests.

---

## 5. Definition of Done (DoD)
- [ ] Folder `tests/` dibuat dan skrip `"test": "bun test"` terdaftar di `package.json`.
- [ ] Mekanisme pembersihan database (*database cleanup*) diimplementasikan sebelum setiap skenario pengujian.
- [ ] Seluruh skenario pengujian untuk `POST /api/users` terimplementasi dan lulus.
- [ ] Seluruh skenario pengujian untuk `POST /api/users/login` terimplementasi dan lulus.
- [ ] Seluruh skenario pengujian untuk `POST /api/users/current` terimplementasi dan lulus.
- [ ] Seluruh skenario pengujian untuk `DELETE /api/users/logout` terimplementasi dan lulus.
- [ ] Skenario pengujian endpoint pendukung (`GET /` dan `GET /health`) terimplementasi dan lulus.
- [ ] Perintah `bun test` dapat dieksekusi dengan sukses tanpa ada test yang gagal atau menggantung (*hanging*).
