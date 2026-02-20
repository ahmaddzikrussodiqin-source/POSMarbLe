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

### Backend

1. Push code ke GitHub
2. Login ke Railway dan buat new project
3. Connect ke GitHub repository
4. Tambahkan environment variables:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (dari Railway MySQL)
   - `JWT_SECRET`
   - `PORT=3000`
5. Deploy会自动创建数据库表

### Frontend

1. Push code ke GitHub
2. Login ke Vercel dan import repository
3. Set environment variable:
   - `VITE_API_URL` = URL Railway API (contoh: `https://your-railway-app.up.railway.app/api`)
4. Deploy

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

