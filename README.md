# belajar-vibe-code

Layanan backend RESTful API modern dan berkinerja tinggi untuk autentikasi pengguna dan manajemen sesi berbasis token UUID. Proyek ini dibangun murni menggunakan **JavaScript (ES Modules)** dengan runtime **Bun**, framework web **ElysiaJS**, ORM **Drizzle**, dan basis data **MySQL**.

---

## 🛠️ Teknologi & Library yang Digunakan

| Kategori | Teknologi / Library | Keterangan |
| :--- | :--- | :--- |
| **Runtime & Tooling** | [Bun](https://bun.sh/) (v1.4+) | Runtime JavaScript serba cepat dan modern sekaligus package manager & test runner. |
| **Web Framework** | [ElysiaJS](https://elysiajs.com/) | Framework web berkecepatan tinggi yang dirancang optimal untuk runtime Bun. |
| **ORM & Database Tooling** | [Drizzle ORM](https://orm.drizzle.team/) & `drizzle-kit` | TypeScript/JavaScript ORM yang ringan, type-safe, dan efisien untuk migrasi serta query data. |
| **Database Driver** | [mysql2](https://github.com/sidorares/node-mysql2) | Client MySQL berperforma tinggi yang mendukung connection pooling dan promises. |
| **Database** | MySQL (5.7 / 8.0+) | Basis data relasional (RDBMS). |
| **Password Hashing** | `Bun.password` (Bcrypt) | Modul native Bun untuk hashing dan verifikasi kata sandi menggunakan algoritma **bcrypt**. |
| **Token Sesi** | Web Crypto (`crypto.randomUUID`) | Generator UUID v4 native untuk token sesi autentikasi pengguna. |
| **Test Runner** | `bun test` | Runner unit & integration test bawaan Bun untuk pengujian cepat. |

---

## 📁 Struktur Direktori & File

Proyek menerapkan prinsip arsitektur **Separation of Concerns (SoC)** dengan memisahkan routing HTTP dan logika bisnis:

```text
belajar-vibe-code/
├── drizzle/                     # File migrasi SQL hasil generate Drizzle Kit
│   ├── meta/                    # Metadata snapshot skema Drizzle
│   ├── 0000_...sql              # Migrasi awal skema tabel users
│   ├── 0001_...sql              # Migrasi penambahan kolom password
│   └── 0003_...sql              # Migrasi pembuatan tabel sessions
├── src/
│   ├── db/
│   │   ├── index.js             # Pool koneksi MySQL & instance Drizzle ORM
│   │   └── schema.js            # Definisi skema tabel database (users & sessions)
│   ├── route/
│   │   └── users-route.js       # Router controller Elysia (routing HTTP & ekstraksi Bearer token)
│   ├── services/
│   │   └── users-services.js    # Logika bisnis (registrasi, login, auth, session, hashing bcrypt)
│   └── index.js                 # Entry point server Elysia & mounting modul routes
├── tests/
│   └── users.test.js            # Suite unit & integration test komprehensif (bun test)
├── .env.example                 # Template environment variables
├── .env                         # Konfigurasi environment lokal (diabaikan oleh git)
├── .gitignore                   # Konfigurasi file yang diabaikan oleh git
├── drizzle.config.js            # Konfigurasi Drizzle Kit untuk koneksi MySQL
├── package.json                 # Konfigurasi paket dependensi & skrip npm/bun
└── README.md                    # Dokumentasi lengkap proyek
```

---

## 🗄️ Skema Database

Aplikasi memiliki dua tabel relasional di dalam database MySQL:

### 1. Tabel `users`
Menyimpan kredensial dan informasi akun pengguna:
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `serial` (`bigint unsigned`) | Primary Key, Auto Increment |
| `name` | `varchar(255)` | Not Null (Nama pengguna, maks. 255 karakter) |
| `email` | `varchar(255)` | Not Null, Unique (Alamat email pengguna) |
| `password` | `varchar(255)` | Not Null (Menyimpan hash bcrypt, bukan plain text) |
| `created_at` | `timestamp` | Not Null, Default `CURRENT_TIMESTAMP` |

### 2. Tabel `sessions`
Menyimpan token sesi aktif dari pengguna yang berhasil login:
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `serial` (`bigint unsigned`) | Primary Key, Auto Increment |
| `token` | `varchar(255)` | Not Null, Unique (Token sesi UUID v4) |
| `user_id` | `bigint unsigned` | Not Null, Foreign Key $\rightarrow$ `users.id` (`ON DELETE CASCADE`) |
| `created_at` | `timestamp` | Not Null, Default `CURRENT_TIMESTAMP` |

> **Relasi**: Setiap baris di tabel `sessions` terhubung ke satu pengguna di tabel `users`. Jika akun pengguna dihapus, seluruh sesi yang terhubung akan otomatis terhapus (*cascade delete*).

---

## 📡 Dokumentasi API yang Tersedia

Base URL: `http://localhost:3000`

### 1. Registrasi Pengguna Baru
- **Endpoint**: `POST /api/users`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Nabil",
    "email": "nabil@localhost",
    "password": "rahasiaSuper123"
  }
  ```
- **Response Sukses (HTTP 200)**:
  ```json
  {
    "data": "OK"
  }
  ```
- **Response Error (HTTP 400)**:
  - Input kosong: `{"error": "name, email, dan password wajib diisi"}`
  - Melebihi batas: `{"error": "nama maksimal 255 karakter"}`
  - Email duplikat: `{"error": "email sudah terdaftar"}`

---

### 2. Autentikasi / Login Pengguna
- **Endpoint**: `POST /api/users/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "nabil@localhost",
    "password": "rahasiaSuper123"
  }
  ```
- **Response Sukses (HTTP 200)**:
  ```json
  {
    "data": "1b22a4cd-4982-4fde-a15c-b2a627324309"
  }
  ```
  *(Menghasilkan token UUID sesi yang aktif dan tersimpan di database)*
- **Response Error (HTTP 400)**:
  - Email tidak ditemukan atau kata sandi salah: `{"error": "email atau password salah"}`

---

### 3. Profil Pengguna yang Sedang Login (*Current User*)
- **Endpoint**: `POST /api/users/current`
- **Headers**:
  - `Authorization`: `Bearer <token-sesi-uuid>`
- **Response Sukses (HTTP 200)**:
  ```json
  {
    "data": {
      "id": 1,
      "name": "Nabil",
      "email": "nabil@localhost",
      "create_at": "2026-11-03T12:41:38.000Z"
    }
  }
  ```
  *(Field `password` dilindungi dan tidak pernah disertakan dalam respons)*
- **Response Error (HTTP 401 Unauthorized)**:
  - Header tidak ada atau token tidak valid: `{"error": "Unauthorized"}`

---

### 4. Logout Pengguna
- **Endpoint**: `DELETE /api/users/logout`
- **Headers**:
  - `Authorization`: `Bearer <token-sesi-uuid>`
- **Response Sukses (HTTP 200)**:
  ```json
  {
    "data": "OK"
  }
  ```
  *(Record token sesi dihapus secara permanen dari database secara atomik)*
- **Response Error (HTTP 401 Unauthorized)**:
  - Token tidak ditemukan / sudah pernah di-logout: `{"error": "Unauthorized"}`

---

### 5. Endpoint Sistem & Healthcheck
- `GET /` $\rightarrow$ Mengembalikan informasi dasar server (`HTTP 200`).
- `GET /health` $\rightarrow$ Healthcheck status server dan konektivitas database MySQL (`HTTP 200`).

---

## 🚀 Panduan Setup & Instalasi Proyek

### 1. Prasyarat
Pastikan komputer Anda telah terinstal:
- [Bun](https://bun.sh/) (v1.2 atau lebih baru)
- Server database [MySQL](https://www.mysql.com/) yang sedang aktif (port default: `3306`)

### 2. Kloning Repository & Instal Dependensi
```bash
git clone https://github.com/NabilSH20/belajar-vibe-code.git
cd belajar-vibe-code
bun install
```

### 3. Konfigurasi Environment Variable
Salin template `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan nilai konfigurasi pada `.env` dengan kredensial MySQL lokal Anda:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=belajar_vibe
```

> **Catatan**: Buat database `belajar_vibe` di MySQL jika belum ada:
> ```sql
> CREATE DATABASE IF NOT EXISTS belajar_vibe;
> ```

### 4. Migrasi & Sinkronisasi Skema Database
Gunakan Drizzle Kit untuk menerapkan skema tabel ke database MySQL:
```bash
# Opsi 1: Menerapkan skema langsung ke database (rekomendasi development)
bun run db:push

# Opsi 2: Membuat file migrasi SQL baru jika skema berubah
bun run db:generate

# Opsi 3: Membuka dashboard visual Drizzle Studio di browser
bun run db:studio
```

---

## 💻 Menjalankan Aplikasi

### Mode Development (Hot Reloading)
Aplikasi akan otomatis me-reload saat ada perubahan kode:
```bash
bun run dev
```

### Mode Production
```bash
bun run start
```
Server akan aktif di: `http://localhost:3000`

---

## 🧪 Menjalankan Automated Unit & Integration Tests

Aplikasi dilengkapi test suite lengkap (20 skenario uji) yang mencakup seluruh endpoint, kasus validasi batas karakter, penolakan kredensial salah, siklus sesi login-logout, dan proteksi dari kebocoran SQL.

Setiap test case secara otomatis membersihkan tabel `sessions` dan `users` (`beforeEach` cleanup) untuk menjamin isolasi dan konsistensi data.

### Jalankan Semua Test:
```bash
bun test
```

### Jalankan Test dalam Mode Watch:
```bash
bun test --watch
```
