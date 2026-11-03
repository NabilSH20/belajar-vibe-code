# Bug Report & Fix Plan: Validasi Panjang Input Registrasi User & Pencegahan Kebocoran Error SQL

## 1. Deskripsi Bug
Saat pengguna melakukan registrasi melalui endpoint `POST /api/users` dengan atribut `name` yang memiliki panjang lebih dari 255 karakter (misalnya 300 karakter), terjadi dua masalah serius:
1. **Kegagalan Database**: MySQL menolak query dengan error `ER_DATA_TOO_LONG` karena kolom `name` pada tabel `users` bertipe `varchar(255)`.
2. **Kebocoran Informasi Sensitif (*Information Disclosure / SQL Leak*)**: Pesan error mentah (*raw error*) dari database dan Drizzle ORM diteruskan secara langsung ke response client, sehingga struktur query SQL internal dan parameter input ikut terekspos ke publik.

### Bukti Terjadinya Bug (*Actual Response*):
- **HTTP Status**: `400 Bad Request`
- **Response Body**:
  ```json
  {
    "error": "Failed query: insert into `users` (`id`, `name`, `email`, `password`, `created_at`) values (default, ?, ?, ?, default)\nparams: aaaaaaaaaa...,testlong@localhost,$2b$10$..."
  }
  ```

---

## 2. Analisis Penyebab Masalah (Root Cause Analysis)

1. **Ketiadaan Validasi Batas Panjang Karakter di Service Layer**:
   Pada file [`src/services/users-services.js`](file:///d:/ProjectVibeEng/belajar-vibe-code/src/services/users-services.js), fungsi `registerUser` hanya memeriksa apakah field terisi:
   ```javascript
   if (!name || !email || !password) {
     const error = new Error("name, email, dan password wajib diisi");
     error.statusCode = 400;
     throw error;
   }
   ```
   Tidak ada validasi `name.length <= 255` maupun `email.length <= 255`.

2. **Error Handling Database yang Tidak Tersanitasi**:
   Dalam blok `catch (err)` pada fungsi `registerUser`:
   ```javascript
   } catch (err) {
     if (err.code === "ER_DUP_ENTRY" || err.message?.includes("Duplicate entry")) {
       const error = new Error("email sudah terdaftar");
       error.statusCode = 400;
       throw error;
     }
     throw err; // <-- Error mentah DrizzleQueryError dilempar apa adanya
   }
   ```
   Dan di controller [`src/route/users-route.js`](file:///d:/ProjectVibeEng/belajar-vibe-code/src/route/users-route.js):
   ```javascript
   } catch (error) {
     set.status = error.statusCode || 400;
     return {
       error: error.message || "Terjadi kesalahan pada server",
     };
   }
   ```
   Karena `error.statusCode` tidak diset pada error database tak terduga, status code default ke `400` dan `error.message` mentah langsung dikirim ke client.

---

## 3. Spesifikasi Perilaku yang Diharapkan (Expected Behavior)

Jika client mengirimkan `name` dengan panjang lebih dari 255 karakter:
- **HTTP Status**: `400 Bad Request`
- **Response Body**:
  ```json
  {
    "error": "nama maksimal 255 karakter"
  }
  ```
- **Keamanan**: Tidak ada informasi skema database, query SQL, atau stack trace internal yang bocor ke response client.

Begitu juga untuk `email` (maksimal 255 karakter) dan `password` (maksimal 255 karakter):
- `email`: `400 Bad Request` $\rightarrow$ `{ "error": "email maksimal 255 karakter" }`
- `password`: `400 Bad Request` $\rightarrow$ `{ "error": "password maksimal 255 karakter" }`

---

## 4. Panduan Perbaikan Langkah demi Langkah (Untuk Junior Programmer)

### Langkah 1: Tambahkan Validasi Panjang Karakter di `src/services/users-services.js`
Buka file `src/services/users-services.js` dan perbarui fungsi `registerUser`:
1. Pastikan input tidak kosong (trim whitespace).
2. Periksa batas panjang karakter:
   - Jika `name.length > 255`: lempar error dengan pesan `"nama maksimal 255 karakter"` dan `statusCode = 400`.
   - Jika `email.length > 255`: lempar error dengan pesan `"email maksimal 255 karakter"` dan `statusCode = 400`.
   - Jika `password.length > 255`: lempar error dengan pesan `"password maksimal 255 karakter"` dan `statusCode = 400`.

### Langkah 2: Sanitasi Error Handling Database (Cegah SQL Leak)
Pada blok `try / catch` insert ke database di `registerUser`:
1. Tetap tangkap error `ER_DUP_ENTRY` untuk pesan `"email sudah terdaftar"`.
2. Jika terjadi error database lain (misalnya masalah koneksi atau error tak terduga):
   - Catat error ke console server: `console.error("Database error in registerUser:", err);`
   - Jangan melempar error mentah ke client! Buat objek error baru yang aman:
     ```javascript
     const serverError = new Error("Terjadi kesalahan pada server");
     serverError.statusCode = 500;
     throw serverError;
     ```

### Langkah 3: Pengujian & Validasi Fitur
Lakukan pengujian otomatis atau manual dengan skenario berikut:
1. **Skenario 1 (Kasus Bug Utama)**:
   - Request `POST /api/users` dengan `name` sepanjang 300 karakter.
   - **Ekspektasi**: HTTP 400, Body `{ "error": "nama maksimal 255 karakter" }`.
2. **Skenario 2 (Email Terlalu Panjang)**:
   - Request `POST /api/users` dengan `email` sepanjang 300 karakter.
   - **Ekspektasi**: HTTP 400, Body `{ "error": "email maksimal 255 karakter" }`.
3. **Skenario 3 (Registrasi Normal / Valid)**:
   - Request `POST /api/users` dengan panjang normal (`name: "nabil"`, `email: "nabil2@localhost"`).
   - **Ekspektasi**: HTTP 200, Body `{ "data": "OK" }`.
4. **Skenario 4 (Verifikasi SQL Leak)**:
   - Pastikan pada seluruh skenario gagal, tidak ada pesan bertuliskan `Failed query:` atau parameter SQL yang muncul di response API.

---

## 5. Catatan Penting untuk Junior Programmer
- **Fail Fast di Layer Aplikasi**: Selalu validasi data di layer aplikasi sebelum menyentuh database. Menyerahkan validasi ke database akan membuang resource (koneksi, hashing bcrypt yang memakan CPU) dan menimbulkan risiko kebocoran internal error.
- **Prinsip Information Leak Prevention**: Client hanya boleh menerima pesan error fungsional yang ramah pengguna. Detail query database, nama tabel, atau stack trace hanya boleh dicatat di server log (*console.error/logger*), tidak boleh dikirim ke client.

---

## 6. Definition of Done (DoD)
- [ ] Validasi batas panjang karakter (`maxLength: 255`) untuk `name`, `email`, dan `password` ditambahkan ke `src/services/users-services.js`.
- [ ] Error database yang tidak terduga disanitasi sehingga mengembalikan status HTTP 500 dengan pesan aman `"Terjadi kesalahan pada server"`.
- [ ] Request registrasi dengan `name` > 255 karakter mengembalikan HTTP 400 dengan pesan `"nama maksimal 255 karakter"`.
- [ ] Tidak ada query SQL atau error mentah yang bocor ke response client.
- [ ] Registrasi data valid tetap berjalan normal tanpa regresi.
- [ ] Seluruh skenario pengujian manual berhasil dipenuhi.
