# Langkah-Langkah Deploy ke Railway

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
3. Klik "New" → "GitHub Repo"
4. Pilih repo `posmarble`
5. Klik pada project yang dibuat
6. Klik "New" → "Database" → "MySQL"
7. Tunggu hingga MySQL selesai dibuat
8. Klik "New" → "Service" → "GitHub Repo"
9. Pilih repo `posmarble`
10. Pada service baru, klik "Settings"
11. Scroll ke "Root Directory", isi dengan: `backend`
12. Scroll ke "Environment Variables", tambahkan:
    - `NODE_ENV`: `production`
    - `USE_SQLITE`: `false`
    - `DB_HOST`: (nilai dari variabel MySQL, contoh: `mysql.railway.internal`)
    - `DB_USER`: (nilai dari variabel MySQL, contoh: `root`)
    - `DB_PASSWORD`: (nilai dari variabel MySQL)
    - `DB_NAME`: (nilai dari variabel MySQL, contoh: `railway`)
    - `PORT`: `3000`

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
