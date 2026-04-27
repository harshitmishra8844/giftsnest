# GiftNest - Personalized Gift E-Commerce

GiftNest is a full-stack e-commerce web app for personalized gifts with customer shopping, secure authentication, cart + checkout, online payment, image upload, and admin management.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT, bcryptjs
- **Payments:** Razorpay
- **Image Uploads:** Cloudinary
- **Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas

## Features

### Customer Features
- Browse products
- Add to cart, update quantity, remove items
- Checkout with shipping address
- Razorpay payment flow
- Order creation and payment status updates

### Admin Features
- Admin login
- Add/Edit/Delete products
- View all orders
- Update order status from dashboard

### Platform Features
- Responsive premium gifting UI
- Loading and error states
- Cloudinary image upload flow
- Production-ready CORS and env-based API config

---

## Project Structure

- `server.js` - Express server entry point
- `config/` - DB, Razorpay, Cloudinary configuration
- `models/` - Mongoose models (`User`, `Product`, `Order`)
- `controllers/` - API handlers
- `routes/` - API route modules
- `middleware/` - auth, uploads, error handling
- `frontend/` - React application

---

## Local Setup

## 1) Clone and install backend

```bash
npm install
```

## 2) Configure backend env

Create `.env` in project root:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gift-store
JWT_SECRET=replace-with-strong-secret
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
# Optional alternative:
# CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
ADMIN_EMAIL=admin@giftnest.com
ADMIN_PASSWORD=Admin@123
FRONTEND_URL=http://localhost:5173
STORE_NAME=Gift Store
STORE_PHONE=+91-90000-00000
STORE_ADDRESS=123 Commerce Street, Mumbai, Maharashtra 400001, India
```

## 3) Install frontend dependencies

```bash
cd frontend
npm install
```

## 4) Configure frontend env

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 5) Run locally

Backend terminal:

```bash
npm run dev
```

Frontend terminal:

```bash
cd frontend
npm run dev
```

App URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

---

## Key Routes

### Public
- `GET /api/products`
- `POST /api/register`
- `POST /api/login`
- `POST /api/orders`
- `POST /api/payments/create-order`
- `POST /api/payments/verify`
- `POST /api/upload`

### Admin (token required)
- `POST /api/admin/login`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PUT /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `GET /api/admin/orders`
- `PUT /api/admin/orders/:id/status`
- `GET /api/admin/store-info`
- `PUT /api/admin/store-info`

---

## Deployment

See full deployment instructions in:

- `DEPLOYMENT.md`

Target setup:
- Frontend -> Vercel
- Backend -> Render
- Database -> MongoDB Atlas

---

## Build Commands

Frontend production build:

```bash
cd frontend
npm run build
```

Backend start (production):

```bash
npm start
```

Backfill missing business order IDs for old orders:

```bash
npm run migrate:order-codes
```

Dry run preview (no DB updates):

```bash
node scripts/backfillOrderCodes.js --dry-run
```
