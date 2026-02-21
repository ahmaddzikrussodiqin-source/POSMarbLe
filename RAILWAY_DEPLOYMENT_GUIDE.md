# Langkah-Langkah Deploy ke Railway

## ⚠️ PENTING: PENGATURAN ROOT DIRECTORY

Untuk menghindari error seperti:
- "npm warn config production Use `--omit=dev` instead"
- "Using SQLite database" (seharusnya MySQL di production)
- Server running pada port yang salah

**PENTING**: Pada Railway, Anda HARUS mengatur Root Directory ke `backend` untuk service backend!

---

## Persiapan Awal

### 1. Push Kode ke GitHub
Jika belum punya repo GitHub:
```
bash
# Initialize git (jika belum)
git init

# Add semua file
git add .

# Commit
git commit -m "Initial commit - POSMarbLe"

# Buat repo di GitHub.com, lalu:
git remote add origin https://github.com/USERNAME/posmarble.git
git branch -M main
git push -u origin main
```

---

## Deploy Backend ke Railway

### 2. Buat Akun Railway
1. Buka https://railway.app
2. Login dengan GitHub
3. Klik "New Project"
4. Pilih "Deploy from GitHub repo"

### 3. Konfigurasi Backend
1. Pilih repository `posmarble`
2. Klik "New" → "Empty Project"
3. Klik "New" → "MySQL" (buat database MySQL dulu)
4. Tunggu hingga MySQL selesai dibuat
5. Klik "New" → "GitHub Repo"
6. Pilih repo `posmarble`
7. Pada service baru (Backend), klik "Settings"
8. **PENTING - Scroll ke "Root Directory", isi dengan: `backend`**
9. Scroll ke "Environment Variables", tambahkan:
   - `NODE_ENV`: `production`
   - `USE_SQLITE`: `false`
   - `DB_HOST`: `mysql.railway.internal` (atau klik "Reference" untuk memilih variabel MySQL)
   - `DB_USER`: `root` (atau klik "Reference" untuk memilih variabel MySQL)
   - `DB_PASSWORD`: (klik "Reference" untuk memilih dari MySQL)
   - `DB_NAME`: `railway` (atau klik "Reference" untuk memilih dari MySQL)
   - `PORT`: `8080` (Railway menggunakan port 8080)

### 3b. Alternatif - Jika Menggunakan Monorepo tanpa Root Directory
Jika Anda tidak menggunakan Root Directory, Anda perlu:
1. Buat service baru dengan repo yang sama
2. Pada service settings, pastikan Root Directory KOSONG atau tidak diset
3. Ubah package.json di root menjadi hanya untuk backend

### 4. Deploy Backend
1. Klik "Deploy" pada service backend
2. Tunggu hingga deployment selesai
3. Klik "View Logs" untuk memastikan tidak ada error
4. Catat URL backend (contoh: `https://posmarble-backend.railway.app`)

---

## Deploy Frontend ke Railway

### 5. Build Frontend
```
bash
cd frontend
npm install
npm run build
```

### 6. Deploy Frontend
1. Di Railway dashboard, klik "New" → "Static Site"
2. Pilih repo `posmarble`
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
    - `VITE_API_URL`: `https://posmarble-backend.railway.app/api` (ganti dengan URL backend kamu)
7. Klik "Deploy"

---

## Verifikasi

### 7. Test Aplikasi
1. Buka URL frontend Railway
2. Login dengan:
   - Username: `admin`
   - Password: `admin123`

---

## Troubleshooting

### Error: "npm warn config production Use `--omit=dev` instead"
- **Penyebab**: Railway tidak mendeteksi Root Directory dengan benar
- **Solusi**: Pastikan Root Directory diatur ke `backend` pada settings service

### Error: "Using SQLite database" (Seharusnya MySQL di Production)
- **Penyebab**: Environment variable `USE_SQLITE` tidak diset ke `false`
- **Solusi**: Pastikan environment variables berikut diset dengan benar:
  - `NODE_ENV`: `production`
  - `USE_SQLITE`: `false`
  - `DB_HOST`: `mysql.railway.internal` (atau gunakan MySQL reference)
  - `DB_USER`: `root` (atau gunakan MySQL reference)
  - `DB_PASSWORD`: (gunakan MySQL reference)
  - `DB_NAME`: `railway` (atau gunakan MySQL reference)

### Error: Port 3000 tidak berfungsi
- **Penyebab**: Railway menggunakan port 8080 secara default
- **Solusi**: Set environment variable `PORT`: `8080` atau biarkan kosong (kode sudah fallback ke 8080)

### Jika Error "Connection Refused"
- Pastikan environment variables benar
- Pastikan MySQL sudah running
- Cek logs di Railway dashboard

### Jika Error Database
- Pastikan `USE_SQLITE=false`
- Pastikan variabel DB_HOST, DB_USER, DB_PASSWORD, DB_NAME benar

### Jika Error 404 di Frontend
- Pastikan Build Command dan Output Directory benar
- Coba deploy ulang

---

## Catatan Penting
- Railway gratuito memberikan batas bandwidth
- Database MySQL akan dihapus jika tidak digunakan dalam waktu tertentu (perlu renewal)
- Untuk production, pertimbangkan upgrade ke plan berbayar
