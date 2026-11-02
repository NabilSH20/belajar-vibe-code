# Project Initialization Plan: ElysiaJS + Drizzle ORM + MySQL (Bun - JavaScript)

## 1. Overview & Objective
Tujuan dokumen ini adalah memberikan panduan tingkat tinggi (*high-level roadmap*) untuk menginisialisasi project backend baru di direktori ini menggunakan runtime **Bun**, framework web **ElysiaJS**, ORM **Drizzle**, dan database **MySQL** berbasis **murni JavaScript (ES Modules)** tanpa TypeScript. Dokumen ini dirancang sebagai acuan kerja bagi programmer maupun AI coding agent.

---

## 2. Tech Stack
- **Language**: JavaScript (ES Modules / ESM)
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Web Framework**: [ElysiaJS](https://elysiajs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database Driver**: MySQL driver (`mysql2`)
- **Database**: MySQL
- **Tooling**: `drizzle-kit` (skema migrasi & prototyping)

---

## 3. High-Level Implementation Steps

### Fase 1: Inisialisasi Project & Konfigurasi Dasar
1. Inisialisasi project Bun berbasis JavaScript di root repository.
2. Pastikan `package.json` dikonfigurasi menggunakan ESM (`"type": "module"`).
3. Siapkan file `.gitignore` standar untuk project JavaScript / Bun (mengabaikan `node_modules`, `.env`, dll.).
4. Konfigurasi skrip standar di `package.json` (misalnya: `dev`, `start`, dan script Drizzle).

### Fase 2: Instalasi Dependensi
1. **Core Dependencies**:
   - `elysia`
   - `drizzle-orm`
   - `mysql2`
2. **Development Dependencies**:
   - `drizzle-kit`

### Fase 3: Konfigurasi Environment & Database Connection
1. Buat template environment variable (`.env.example` dan `.env`) untuk menyimpan kredensial database (host, user, password, database name, port).
2. Buat koneksi database client menggunakan `mysql2` pool connection berbasis JavaScript (`.js`).
3. Inisialisasi instance Drizzle ORM dengan koneksi MySQL tersebut.
4. Siapkan konfigurasi `drizzle.config.js` untuk migrasi dan sinkronisasi skema.

### Fase 4: Definisi Skema Database (Drizzle Schema)
1. Tentukan struktur folder modular untuk skema database (misal: `src/db/schema/` atau `src/db/schema.js`).
2. Definisikan skema awal dalam format JavaScript murni.
3. Ekspor skema secara terpusat agar mudah diakses oleh Drizzle ORM dan Drizzle Kit.

### Fase 5: Setup Server & Endpoint ElysiaJS
1. Buat entry point server berbasis JavaScript (misal: `src/index.js`).
2. Inisialisasi aplikasi Elysia dan binding ke port yang ditentukan (dari environment variable atau default).
3. Buat endpoint dasar:
   - Root / Healthcheck endpoint (`GET /` atau `GET /health`) untuk memastikan server berjalan dan koneksi database aktif.
4. Pasang middleware dasar yang relevan secara modular.

### Fase 6: Validasi & Testing
1. Verifikasi server dapat dijalankan menggunakan Bun (`bun run dev` atau `bun src/index.js`).
2. Verifikasi Drizzle dapat membaca konfigurasi `drizzle.config.js` dan terhubung ke MySQL (`bunx drizzle-kit push` / `generate`).
3. Verifikasi response endpoint healthcheck via HTTP client/curl.

---

## 4. Definition of Done (DoD)
- [x] Project Bun terinisialisasi menggunakan murni JavaScript (ES Modules, tanpa file `.ts` atau `tsconfig.json`).
- [x] Dependensi utama (`elysia`, `drizzle-orm`, `mysql2`, `drizzle-kit`) terpasang dengan baik.
- [x] Konfigurasi Drizzle (`drizzle.config.js`) dan koneksi MySQL terhubung dengan rapi.
- [x] Minimal 1 file skema JavaScript terdefinisi di Drizzle.
- [x] Server ElysiaJS (`src/index.js`) berjalan sukses dan merespons request HTTP.
- [x] Dokumentasi ringkas (`README.md` atau panduan) cara menjalankan server dan migrasi database.

---

## 5. Catatan untuk Programmer & Model (AI Agent)
- **Ekstensi File**: Selalu gunakan ekstensi `.js` (bukan `.ts`) di seluruh file source code dan konfigurasi.
- **Module System**: Gunakan standar JavaScript ES Modules (`import` / `export`).
- **Kerapian Struktur**: Pisahkan kode ke dalam modul terpisah (misal: `src/db/`, `src/routes/`).
- **Keamanan**: Jangan commit file `.env` yang berisi kredensial sensitif.

