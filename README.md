# belajar-vibe-code

Backend service modern menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL** berbasis **murni JavaScript (ES Modules)**.

---

## 🛠️ Tech Stack
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [ElysiaJS](https://elysiajs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database Driver**: [mysql2](https://github.com/sidorares/node-mysql2)
- **Database**: MySQL

---

## 📁 Struktur Direktori
```text
belajar-vibe-code/
├── src/
│   ├── db/
│   │   ├── index.js       # Inisialisasi pool MySQL & client Drizzle
│   │   └── schema.js      # Definisi skema tabel Drizzle ORM
│   └── index.js           # Server Elysia & routing endpoint
├── .env.example           # Template environment variable
├── .env                   # Environment variable lokal
├── .gitignore
├── drizzle.config.js      # Konfigurasi Drizzle Kit untuk MySQL
├── package.json
└── README.md
```

---

## 🚀 Memulai (Getting Started)

### 1. Instalasi Dependensi
Pastikan [Bun](https://bun.sh) sudah terinstall:
```bash
bun install
```

### 2. Konfigurasi Database
Salin file `.env.example` ke `.env` (jika belum ada) dan sesuaikan kredensial MySQL Anda:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=belajar_vibe
```

### 3. Migrasi & Skema Database (Drizzle Kit)
- **Generate migrasi**:
  ```bash
  bun run db:generate
  ```
- **Push skema langsung ke database**:
  ```bash
  bun run db:push
  ```
- **Buka Drizzle Studio**:
  ```bash
  bun run db:studio
  ```

### 4. Menjalankan Server
- **Mode Development (Hot Reload)**:
  ```bash
  bun run dev
  ```
- **Mode Production**:
  ```bash
  bun run start
  ```

---

## 📡 Endpoint Tersedia
- `GET /` : Endpoint perkenalan server
- `GET /health` : Healthcheck server dan status konektivitas database MySQL
