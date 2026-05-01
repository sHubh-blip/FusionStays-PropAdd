# FusionStays-PropAdd

FusionStays-PropAdd is an internal property and client management tool designed for the Property Onboarding Team. It provides a clean, user-friendly frontend interface to efficiently add, edit, and view records, syncing all data directly to a connected Google Sheet via a backend API.

## Architecture
- **Frontend**: React.js, Tailwind CSS, React Router (Targeted for Vercel Deployment)
- **Backend**: Node.js, Express.js (Targeted for Render Deployment)
- **Database**: Google Sheets via Google Sheets API

## Folder Structure
- `/backend`: Node.js Express server.
- `/frontend`: React application built with Vite.

## Deployment Setup

### 1. Backend (Render)
1. Push the `/backend` folder to a GitHub repository or connect Render to your monorepo.
2. In Render, create a new "Web Service".
3. Set the Root Directory to `backend` (if using a monorepo).
4. Build Command: `npm install`
5. Start Command: `npm start`
6. **Environment Variables needed in Render:**
    - `PORT`: `5000` (Render will assign its own, but good to set)
    - `FRONTEND_URL`: URL of your deployed Vercel frontend (e.g., `https://fusionstays-propadd.vercel.app`)
    - `JWT_SECRET`: A secure random string for signing JWTs.
    - `ADMIN_EMAIL`: The generic admin login email for the dashboard MVP (e.g., `admin@fusionstays.com`)
    - `ADMIN_PASSWORD`: The generic admin password.
    - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: The `client_email` from your Google Service Account JSON.
    - `GOOGLE_PRIVATE_KEY`: The `private_key` from your Google Service Account JSON. Ensure you include the entire string including `\n`.
    - `GOOGLE_SHEET_ID`: The ID of your target Google Sheet (extracted from the Sheet URL).

### 2. Frontend (Vercel)
1. Import the `/frontend` directory to a new project in Vercel.
2. Framework Preset: `Vite`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. **Environment Variables needed in Vercel:**
    - `VITE_API_URL`: The URL of your deployed Render backend (e.g., `https://fusionstays-propadd-backend.onrender.com/api`)

## Local Development Requirements
- Node.js (v18+)
- A Google Service Account with Editor access to your specific Google Sheet (share the Google Sheet with the Service Account email).

### Running locally
1. Configure `.env` in the `backend` folder.
2. Configure `.env` in the `frontend` folder.
3. Start Backend: `cd backend && npm run dev`
4. Start Frontend: `cd frontend && npm run dev`
