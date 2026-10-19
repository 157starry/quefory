# Quefory 💌

*Ask anything, share anything.* An anonymous Q&A link for your bio.

- **Ask Me**: a public question. The question and the Keeper's answer appear on the board.
- **Tell Me**: a private message, locked with a 4-digit code made by the system. Only the sender and the Listener can read it. The sender chooses between **Reply to me** and **Just listen**.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Halaman pengunjung (link untuk bio) |
| `admin.html` | Ruang Keeper: menjawab, membalas, memberi reaksi, menghapus |
| `app.js` / `admin.js` | Logika kedua halaman |
| `style.css` | Warna & tampilan. Ubah warna di bagian `:root` |
| `config.js` | Kunci Supabase + teks sapaan, nama Keeper/Listener |
| `supabase.sql` | Setup database. Dijalankan sekali di Supabase, **jangan di-upload ke GitHub** |

---

## Setup (sekali saja, ±15 menit)

### 1. Buat database di Supabase
1. Buka **supabase.com** → Sign up/Log in → **New project**.
   - Name: `quefory` · Region: **Southeast Asia (Singapore)** · buat database password & simpan.
2. Tunggu project siap, lalu buka **SQL Editor** → **New query**.
3. Buka file `supabase.sql`, salin semua isinya, tempel di SQL Editor.
4. Di baris paling bawah, ganti `your-email@example.com` dengan email yang akan kamu pakai untuk login sebagai Keeper.
5. Klik **Run**. Harus muncul "Success".

### 2. Buat akun Keeper
1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Isi email yang **sama** dengan langkah 1.4 dan buat password. Centang **Auto Confirm User**.
3. Supabase → **Authentication** → **Sign In / Providers** → matikan **Allow new users to sign up**.
   (Supaya tidak ada orang lain yang bisa membuat akun.)

### 3. Isi `config.js`
1. Supabase → **Project Settings** → **API Keys** (atau **Data API**).
2. Salin **Project URL** → tempel di `supabaseUrl`.
3. Salin **Publishable key** (`sb_publishable_…`) atau **anon public** key → tempel di `supabaseAnonKey`.
4. ⚠️ Jangan pernah memakai **secret** / **service_role** key.

### 4. Upload ke GitHub
1. Di repo GitHub → **Add file** → **Upload files**.
2. Upload: `index.html`, `admin.html`, `app.js`, `admin.js`, `style.css`, `config.js`, `README.md`.
3. Klik **Commit changes**.
4. Kalau GitHub Pages belum aktif: **Settings** → **Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**.

### 5. Selesai 🎉
- Link untuk bio: `https://<username>.github.io/<nama-repo>/`
- Ruang Keeper: `https://<username>.github.io/<nama-repo>/admin.html`

Perubahan biasanya muncul 1–2 menit setelah commit.

---

## Cara kerja keamanan

- Pengunjung **tidak bisa** membaca database secara langsung. Mereka hanya bisa memakai fungsi yang diizinkan di `supabase.sql`.
- Kode 4 angka dibuat oleh server dan hanya disimpan dalam bentuk *hash* (teracak). Kode aslinya hanya dilihat pengirim sekali.
- Setiap box punya nomor sendiri (misal `#K7QM`). Kalau kode salah 5 kali, box terkunci selama 15 menit, jadi tidak bisa ditebak-tebak.
- Hanya email yang terdaftar di tabel `quefory_keepers` yang bisa membuka `admin.html`.
- Semua teks dari pengunjung ditampilkan sebagai teks biasa, bukan kode.

## Mengubah sesuatu nanti

| Ingin mengubah… | Edit di |
|---|---|
| Sapaan, nama "the Keeper" / "the Listener" | `config.js` |
| Warna | `style.css` → `:root` |
| Pilihan emoji reaksi | `admin.js` → baris `EMOJIS` |
| Tulisan pada tombol/kartu | `index.html` |

Edit langsung di GitHub (klik file → ikon ✏️ → Commit changes).

## Catatan Supabase gratis
Project yang tidak dipakai sekitar 1 minggu bisa di-*pause* otomatis. Kalau link Quefory tiba-tiba tidak memuat board, buka dashboard Supabase lalu klik **Restore project**.
