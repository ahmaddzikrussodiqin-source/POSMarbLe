# POSMarbLe - Cafe POS System

Sistem Point of Sale (POS) untuk cafe dengan fitur lengkap untuk manajemen produk dan transaksi penjualan.

## Fitur

- **POS/Kasir**: Interface kasir untuk transaksi penjualan
- **Admin Dashboard**: Manajemen produk, kategori, dan laporan
- **Multi-payment**: Tunai, QRIS, Debit
- **Responsif**: Dapat diakses dari desktop, tablet, dan mobile
- **Real-time**: Data tersinkronisasi antara POS dan Admin

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express.js
- **Database**: MySQL (Railway)
- **Authentication**: JWT

## Struktur Folder

```
POSMarbLe/
├── backend/              # Node.js Backend API
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── controllers/ # Route controllers
│   │   ├── middleware/  # Auth middleware
│   │   ├── routes/     # API routes
│   │   └── index.js    # Server entry point
│   └── package.json
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/    # React context (Auth)
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   └── App.jsx     # Main app component
│   └── package.json
└── README.md
```

## Cara Menjalankan

### Backend (Local Development)

1. Navigate ke folder backend:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Buat file `.env` berdasarkan `.env.example`:
```bash
cp .env.example .env
```

4. Edit `.env` dengan konfigurasi database MySQL Anda:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password_anda
DB_NAME=posmarble
JWT_SECRET=secret_key_anda
PORT=3000
```

5. Buat database MySQL:
```sql
CREATE DATABASE posmarble;
```

6. Jalankan server:
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

### Frontend (Local Development)

1. Navigate ke folder frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Jalankan development server:
```bash
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

## Deploy ke Railway

### Persiapan

1. Build frontend untuk production:
```bash
cd frontend
npm run build
```

2. Copy folder `dist` dari `frontend/dist` ke `backend/frontend-dist`:
```bash
cp -r frontend/dist backend/frontend-dist
```

3. Push code ke GitHub (termasuk folder frontend-dist)

### Backend Deployment

1. Login ke Railway:
```bash
railway login
```

2. Buat new project:
```bash
railway init
```

3. Connect ke GitHub repository:
```bash
railway connect
```

4. Tambahkan environment variables:
   - `JWT_SECRET` = secret key untuk JWT (buat random string)
   - `NODE_ENV=production`
   - `USE_SQLITE=true` (untuk menggunakan SQLite di production)
   - `PORT=3000`

5. Deploy:
```bash
railway up
```

Backend akan otomatis membuat database SQLite dan user admin default.

### Android App (Capacitor)

1. Update `frontend/src/services/api.js` dengan URL Railway production:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-railway-app.up.railway.app/api';
```

2. Update `frontend/capacitor.config.json`:
```json
{
  "appId": "id.posmarble.app",
  "appName": "POSMarbLe",
  "webDir": "dist",
  "server": {
    "android": {
      "url": "https://your-railway-app.up.railway.app",
      "allowNavigation": ["https://your-railway-app.up.railway.app"]
    }
  }
}
```

3. Build frontend:
```bash
cd frontend
npm run build
```

4. Sync Capacitor:
```bash
npx cap sync android
```

5. Buka Android Studio:
```bash
npx cap open android
```

6. Build APK di Android Studio:
   - Build > Make Project
   - Build > Build Bundle(s)/APK(s) > Build APK(s)

7. Install APK ke device Android

### Troubleshooting

#### Login Gagal di Android App

Jika login gagal di aplikasi Android:

1. **Periksa URL API**: Pastikan `frontend/src/services/api.js` menggunakan URL Railway production yang benar.

2. **CORS Issues**: Pastikan backend mengizinkan origin dari aplikasi Android. Tambahkan di backend jika perlu:
```javascript
app.use(cors({
  origin: ['https://your-railway-app.up.railway.app', 'capacitor://localhost'],
  credentials: true
}));
```

3. **Database Connection**: Pastikan backend menggunakan SQLite di production dengan `USE_SQLITE=true`.

4. **Rebuild App**: Setelah update konfigurasi, rebuild frontend dan sync Capacitor:
```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

5. **Check Logs**: Lihat Railway logs untuk error backend:
```bash
railway logs
```

## Default Login

Setelah instalasi, login dengan:
- **Username**: admin
- **Password**: admin123

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders
- `GET /api/orders/today` - Get today's orders
- `DELETE /api/orders/:id` - Cancel order

### Reports
- `GET /api/reports/sales-summary` - Sales summary (admin)
- `GET /api/reports/daily-sales` - Daily sales (admin)
- `GET /api/reports/best-selling` - Best selling products (admin)

## Lisensi

MIT License

