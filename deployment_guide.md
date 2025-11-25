# Deployment Guide for NFC Business Card System

This guide outlines the steps to deploy your application to **Render.com**.

## 1. Prerequisites
- A GitHub repository containing this project code.
- A MongoDB Atlas account (or another MongoDB provider).
- A Render.com account.

## 2. Environment Variables
You must configure the following environment variables in your Render service settings:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `MONGO_URI` | Connection string for MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `MONGO_DB` | Database name | `nfc_db` |
| `NODE_ENV` | Environment mode | `production` |
| `ADMIN_TOKEN` | Token for admin actions (if applicable) | `your_secure_token` |

## 3. Render Configuration
1. **Create a New Web Service** on Render.
2. **Connect your GitHub repository**.
3. Use the following settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Region**: Choose the one closest to your users (e.g., Frankfurt for Middle East/Europe).

## 4. Important Notes
- **Hardcoded URLs**: The codebase currently contains hardcoded references to `https://nfc-vjy6.onrender.com`. If your Render URL is different, you **MUST** update the following files before deploying:
  - `script-core.js`
  - `server.js` (CSP headers)
  - `viewer.js`
  - `gallery.html`
  
- **MongoDB Access**: Ensure your MongoDB Atlas "Network Access" allows connections from anywhere (`0.0.0.0/0`) or specifically from Render's IP addresses.

## 5. Verification
After deployment:
1. Visit your Render URL.
2. Check the "Gallery" page to ensure it loads designs from the database.
3. Try creating a new card and saving it.
