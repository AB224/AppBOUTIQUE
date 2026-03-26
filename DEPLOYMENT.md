# Deployment Guide

## 1. Requirements

- A MongoDB Atlas cluster URI
- A Render account
- A Google Cloud OAuth Client ID
- A Gmail App Password for SMTP

## 2. Environment variables

### Backend (`appboutique-api`)

- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `GMAIL_SMTP_USER`
- `GMAIL_SMTP_PASS`
- `DEFAULT_SENDER_EMAIL`
- `GOOGLE_CLIENT_ID`
- `ADMIN_PASSWORD`

### Frontend (`appboutique-web`)

- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`

## 3. Render deployment

1. Push this project to GitHub.
2. In Render, create a new Blueprint and select the repository.
3. Render will detect `render.yaml`.
4. Fill in all required secret environment variables.
5. Deploy both services.

## 4. Google OAuth

Allowed JavaScript origins:

- `http://localhost:5173`
- your Render frontend URL
- your custom domain, if used

## 5. Gmail SMTP

Use a Google App Password, not the Gmail account password.

## 6. Security

- Helmet is enabled.
- API and auth rate limits are enabled.
- CORS is restricted to configured frontend origins.
- JWT secret must be unique in production.
