# TODO: Dashboard Lengkap dengan Grafik

## Progress

### Step 1: Install Dependencies
- [x] Install recharts library ✓

### Step 2: Update AdminDashboard.jsx
- [ ] Import recharts components
- [ ] Tambah state untuk chart data (dailySales, hourlySales, bestSelling, dailyPurchases)
- [ ] Update loadData function untuk fetch data grafik
- [ ] Buat komponen grafik:
  - [ ] LineChart untuk trend penjualan harian
  - [ ] BarChart untuk penjualan per jam
  - [ ] HorizontalBarChart untuk produk terlaris
  - [ ] PieChart untuk metode pembayaran
  - [ ] LineChart untuk trend pembelian harian
- [ ] Update layout dashboard dengan grid system
- [ ] Tambah statistik cards yang lebih lengkap
- [ ] Responsive design untuk mobile

### Step 3: Testing
- [ ] Test dashboard dengan data
- [ ] Verifikasi semua grafik tampil dengan benar
- [ ] Test responsive design

## Files to Edit
1. `frontend/package.json` - Add recharts dependency
2. `frontend/src/pages/Admin/AdminDashboard.jsx` - Main dashboard update
