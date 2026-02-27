# TODO - Change 30 Days to Monthly Report

## Status: COMPLETED ✓

### Steps:
- [x] 1. Update backend reportController.js - getDailySales to accept start_date/end_date
- [x] 2. Update backend reportController.js - getDailyPurchases to accept start_date/end_date
- [x] 3. Update frontend api.js - getDailySales and getDailyPurchases params
- [x] 4. Update frontend AdminDashboard.jsx - pass month params to charts
- [x] 5. Update chart titles to show selected month

---

## Implementation Notes:

### Backend Changes:
- getDailySales: Accept start_date/end_date instead of days parameter
- getDailyPurchases: Accept start_date/end_date instead of days parameter

### Frontend Changes:
- Update API calls to pass date range based on selected month
- Update chart titles from "30 Hari Terakhir" to show month name

