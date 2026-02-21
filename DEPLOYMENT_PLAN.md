# POSMarbLe Deployment Plan

## Project Overview
- **Project Name**: POSMarbLe (Point of Sale Application)
- **Type**: Full-stack Web Application
- **Backend**: Express.js (Node.js) with MySQL/SQLite database
- **Frontend**: React + Vite + TailwindCSS

## Current Configuration Analysis

### Backend (backend/src/index.js)
- Runs on port 3000
- Has production mode that serves frontend from `../frontend-dist`
- Already configured for Railway deployment

### Frontend (frontend/src/services/api.js)
- Already configured with Railway API URL: `https://delightful-beatuy-production-22f0.up.railway.app/api`
- Uses environment variable `VITE_API_URL` for configuration

### Database
- Supports both SQLite (local) and MySQL (production)
- For deployment, MySQL is recommended for production

---

## Deployment Options

### Option 1: Deploy to Railway (Recommended)
**Pros:**
- Full-stack deployment (backend + database)
- Already configured in the project
- Easy setup with GitHub integration

**Steps:**
1. Push code to GitHub
2. Create project on Railway
3. Connect GitHub repository
4. Configure environment variables:
   - `PORT`: 3000
   - `NODE_ENV`: production
   - `USE_SQLITE`: false
   - `DB_HOST`: MySQL host from Railway
   - `DB_USER`: MySQL user
   - `DB_PASSWORD`: MySQL password
   - `DB_NAME`: MySQL database name
   - `VITE_API_URL`: Your Railway backend URL

### Option 2: Deploy Frontend to Vercel, Backend to Render
**Pros:**
- Free tier available
- Good performance
- Easy to configure

**Steps:**
1. **Backend (Render):**
   - Push to GitHub
   - Create Render account
   - Connect GitHub repo
   - Set build command: none
   - Set start command: `node src/index.js`
   - Configure environment variables

2. **Frontend (Vercel):**
   - Push to GitHub
   - Create Vercel project
   - Connect GitHub repo
   - Set VITE_API_URL to Render backend URL
   - Deploy

### Option 3: Deploy Both to Vercel (Serverless)
- Requires converting Express to serverless functions
- More complex setup

---

## Recommended Deployment Steps (Option 1 - Railway)

### Phase 1: Prepare for Deployment
- [ ] Ensure all code is committed to GitHub
- [ ] Update package.json scripts if needed
- [ ] Test locally in production mode

### Phase 2: Backend Deployment
- [ ] Create Railway account
- [ ] Create new Railway project
- [ ] Add MySQL database
- [ ] Deploy backend from GitHub
- [ ] Configure environment variables
- [ ] Note the backend URL

### Phase 3: Frontend Deployment
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Deploy to Railway or Vercel
- [ ] Configure VITE_API_URL

### Phase 4: Testing
- [ ] Test login
- [ ] Test POS functionality
- [ ] Test admin dashboard
- [ ] Test order creation

---

## Environment Variables Needed

### Backend
```
PORT=3000
NODE_ENV=production
USE_SQLITE=false
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=your-database-name
JWT_SECRET=your-secret-key
```

### Frontend
```
VITE_API_URL=https://your-backend-url/api
```

---

## Current API Configuration
The frontend is already configured to use:
- Development: `http://localhost:3000/api`
- Production: `https://delightful-beauty-production-22f0.up.railway.app/api`

This means if you deploy to Railway using the existing URL, no frontend changes needed!
