# Feature Plan: Integrasi Swagger / OpenAPI Documentation (`@elysiajs/swagger`)

## 1. Ringkasan & Tujuan
Tujuan dari issue ini adalah menambahkan antarmuka dokumentasi interaktif **Swagger UI / OpenAPI** ke dalam proyek backend. Dengan adanya Swagger, developer frontend, rekan tim, maupun pengguna publik dapat dengan mudah mempelajari spesifikasi API, melihat skema request/response, dan langsung mencoba (*test live*) endpoint API melalui antarmuka web interaktif di browser.

Dokumen ini disusun secara rinci dan bertahap (*step-by-step*) khusus untuk programmer junior maupun model AI agar implementasi dapat dilakukan dengan standar terbaik ElysiaJS.

---

## 2. Library & Tooling yang Digunakan

- **Library**: [`@elysiajs/swagger`](https://elysiajs.com/plugins/swagger.html)
- **Framework Web**: [ElysiaJS](https://elysiajs.com/)
- **Schema Builder**: Modul `t` (TypeBox) bawaan dari package `elysia` untuk mendefinisikan validasi dan skema OpenAPI.
- **URL Akses**: `http://localhost:3000/swagger` (dan file spesifikasi JSON di `http://localhost:3000/swagger/json`).

---

## 3. Spesifikasi Fitur Dokumentasi Swagger

### 3.1. Metadata Umum API
- **Title**: `Belajar Vibe Code API`
- **Version**: `1.0.0`
- **Description**: `Dokumentasi RESTful API untuk autentikasi pengguna dan manajemen sesi dengan ElysiaJS, Drizzle ORM, dan MySQL.`
- **Tags Pengelompokan**:
  - `Users`: Endpoint terkait pengguna (registrasi, login, profil, logout).
  - `System`: Endpoint pemeriksaan server dan konektivitas database.

### 3.2. Konfigurasi Autentikasi (Bearer Auth)
Swagger UI harus mendukung pengujian endpoint yang memerlukan token sesi (`/current` dan `/logout`) melalui tombol **Authorize**:
- **Security Scheme**: `bearerAuth`
- **Type**: `http`
- **Scheme**: `bearer`
- **Bearer Format**: `UUID`

---

## 4. Matriks Dokumentasi Endpoint

| Method | Path | Tag | Auth | Deskripsi |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/` | System | ❌ | Informasi dasar server |
| `GET` | `/health` | System | ❌ | Healthcheck status server & koneksi database MySQL |
| `POST` | `/api/users` | Users | ❌ | Registrasi akun pengguna baru |
| `POST` | `/api/users/login` | Users | ❌ | Autentikasi login pengguna dan pembuatan token sesi UUID |
| `POST` | `/api/users/current` | Users | 🔒 | Mengambil profil user yang sedang login (tanpa password) |
| `DELETE` | `/api/users/logout` | Users | 🔒 | Logout dan menghapus token sesi aktif dari database |

---

## 5. Panduan Tahapan Implementasi Langkah demi Langkah (Junior Programmer Friendly)

### Langkah 1: Instalasi Library `@elysiajs/swagger`
Jalankan perintah instalasi menggunakan runtime Bun di terminal:
```bash
bun add @elysiajs/swagger
```
Pastikan `@elysiajs/swagger` tercatat pada bagian `"dependencies"` di file `package.json`.

---

### Langkah 2: Registrasi Swagger Plugin di `src/index.js`
Buka file `src/index.js` dan konfigurasikan plugin `swagger`:
1. Import `swagger` dari `@elysiajs/swagger`.
2. Pasang plugin sebelum routes menggunakan `.use(swagger({ ... }))`:
```javascript
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { checkDatabaseConnection } from "./db/index.js";
import { usersRoute } from "./route/users-route.js";

const app = new Elysia();
const PORT = Number(process.env.PORT) || 3000;

// Registrasi Plugin Swagger UI
app.use(
  swagger({
    path: "/swagger",
    documentation: {
      info: {
        title: "Belajar Vibe Code API",
        version: "1.0.0",
        description: "Dokumentasi RESTful API untuk autentikasi pengguna dan manajemen sesi dengan ElysiaJS, Drizzle ORM, dan MySQL.",
      },
      tags: [
        { name: "Users", description: "Endpoint autentikasi dan manajemen akun pengguna" },
        { name: "System", description: "Endpoint status server dan database" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "UUID",
            description: "Masukkan token sesi UUID yang didapatkan dari endpoint login",
          },
        },
      },
    },
  })
);

// Endpoint System
app.get(
  "/",
  () => ({
    message: "ElysiaJS + Drizzle ORM + MySQL server running with Bun!",
    version: "1.0.0",
  }),
  {
    detail: {
      tags: ["System"],
      summary: "Server Info",
      description: "Menampilkan informasi dasar server yang sedang berjalan",
    },
  }
);

app.get(
  "/health",
  async () => {
    const dbStatus = await checkDatabaseConnection();
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  },
  {
    detail: {
      tags: ["System"],
      summary: "Healthcheck Server & Database",
      description: "Memeriksa status server dan konektivitas ke database MySQL",
    },
  }
);

// Registrasi Route Users
app.use(usersRoute);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📚 Swagger documentation available at http://localhost:${PORT}/swagger`);
  });
}

export default app;
```

---

### Langkah 3: Tambahkan Skema Detail pada Route di `src/route/users-route.js`
Gunakan objek `t` dari `elysia` untuk mendefinisikan skema payload dan opsi `detail` (OpenAPI metadata) pada setiap endpoint:

1. **Import `t` dari `elysia`**:
   ```javascript
   import { Elysia, t } from "elysia";
   ```

2. **Endpoint `POST /api/users` (Registrasi)**:
   Tambahkan deskripsi body dan tag:
   ```javascript
   .post("/", async ({ body, set }) => { ... }, {
     body: t.Object({
       name: t.String({ maxLength: 255, description: "Nama lengkap pengguna" }),
       email: t.String({ maxLength: 255, description: "Email pengguna" }),
       password: t.String({ maxLength: 255, description: "Kata sandi pengguna" }),
     }),
     detail: {
       tags: ["Users"],
       summary: "Registrasi Pengguna Baru",
       description: "Mendaftarkan pengguna baru ke sistem dan meng-hash password dengan bcrypt",
     },
   })
   ```

3. **Endpoint `POST /api/users/login` (Login)**:
   ```javascript
   .post("/login", async ({ body, set }) => { ... }, {
     body: t.Object({
       email: t.String({ description: "Email akun terdaftar" }),
       password: t.String({ description: "Kata sandi akun" }),
     }),
     detail: {
       tags: ["Users"],
       summary: "Autentikasi Login Pengguna",
       description: "Memverifikasi email & password, serta menghasilkan token sesi UUID",
     },
   })
   ```

4. **Endpoint `POST /api/users/current` (Current User)**:
   Sertakan konfigurasi `security`:
   ```javascript
   .post("/current", async ({ headers, set }) => { ... }, {
     detail: {
       tags: ["Users"],
       summary: "Get Profil Pengguna Sedang Login",
       description: "Mengambil data profil pengguna aktif berdasarkan Bearer token sesi (tanpa password)",
       security: [{ bearerAuth: [] }],
     },
   })
   ```

5. **Endpoint `DELETE /api/users/logout` (Logout)**:
   Sertakan konfigurasi `security`:
   ```javascript
   .delete("/logout", async ({ headers, set }) => { ... }, {
     detail: {
       tags: ["Users"],
       summary: "Logout Pengguna",
       description: "Menghapus token sesi aktif pengguna dari database secara permanen",
       security: [{ bearerAuth: [] }],
     },
   })
   ```

---

### Langkah 4: Pengujian & Validasi Fitur Swagger

1. **Jalankan Server Lokal**:
   ```bash
   bun run dev
   ```
2. **Akses Swagger UI**:
   - Buka browser dan arahkan ke: `http://localhost:3000/swagger`.
   - Pastikan halaman Swagger UI tampil rapi dengan tema OpenAPI.
3. **Validasi Elemen Swagger**:
   - Seluruh endpoint (`/`, `/health`, `/api/users`, `/api/users/login`, `/api/users/current`, `/api/users/logout`) muncul dan terkelompokkan dalam tag `System` dan `Users`.
   - Terdapat tombol hijau **Authorize** di pojok kanan atas untuk memasukkan Bearer token.
4. **Uji Langsung (*Try it out*)**:
   - Coba jalankan request `POST /api/users/login` langsung dari Swagger UI untuk mendapatkan token.
   - Klik tombol **Authorize**, masukkan token tersebut.
   - Jalankan request `POST /api/users/current` dari Swagger UI untuk memastikan autentikasi Bearer bekerja.
5. **Jalankan Unit Test**:
   - Pastikan seluruh pengujian automated test yang sudah ada tetap lulus 100%:
     ```bash
     bun test
     ```

---

## 6. Definition of Done (DoD)
- [x] Package `@elysiajs/swagger` terpasang di `package.json`.
- [x] Plugin Swagger berhasil didaftarkan di `src/index.js` dengan path `/swagger`.
- [x] Konfigurasi `securitySchemes` (`bearerAuth`) tersedia sehingga pengguna bisa memasukkan token di Swagger UI.
- [x] Seluruh endpoint (`System` dan `Users`) memiliki metadata `summary`, `description`, dan `tags`.
- [x] Skema request body pada endpoint registrasi dan login terdefinisi dengan jelas menggunakan TypeBox (`t`).
- [x] Halaman Swagger UI dapat diakses dengan sukses di `http://localhost:3000/swagger`.
- [x] Seluruh unit test (`bun test`) tetap berjalan sukses (22 pass, 0 fail).
