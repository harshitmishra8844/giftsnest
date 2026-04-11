# GiftNest Deployment Guide

## 1) MongoDB Atlas

1. Create a cluster in Atlas.
2. Create a database user (username/password).
3. In Network Access, allow your Render IPs (or temporarily `0.0.0.0/0`).
4. Get connection string and set backend env:
   - `MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`

---

## 2) Backend on Render

1. Push this project to GitHub.
2. In Render, create a **Web Service** from the repo root.
3. Render can also auto-detect `render.yaml`.
4. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables:
   - `PORT=10000` (Render sets one, keep if needed)
   - `MONGO_URI`
   - `JWT_SECRET`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `FRONTEND_URL=https://<your-vercel-domain>`
6. Deploy and verify:
   - `https://<your-render-domain>/`
   - `https://<your-render-domain>/api/products`

---

## 3) Frontend on Vercel

1. Import the same repo in Vercel.
2. Set Root Directory to `frontend`.
3. Framework preset: Vite.
4. Add env variable:
   - `VITE_API_BASE_URL=https://<your-render-domain>/api`
5. Deploy.
6. Because this is SPA routing, `frontend/vercel.json` already rewrites routes to `index.html`.

---

## 4) Final wiring checklist

1. Update backend `FRONTEND_URL` with your real Vercel URL.
2. Ensure Razorpay callback/keys are in test mode for validation.
3. Validate complete flow on production:
   - Browse products
   - Register/Login
   - Cart/Checkout
   - Razorpay payment
   - Admin login + dashboard actions

---

## Useful local commands

- Backend:
  - `npm run dev`
- Frontend:
  - `cd frontend && npm run dev`
- Frontend production build:
  - `cd frontend && npm run build`
