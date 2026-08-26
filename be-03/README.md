# Auth - Login & Protect API

A secure RESTful authentication and protected routes API built with **Node.js**, **Express**, **Supabase Auth**, and **Swagger UI**.

This project implements modern web security using Supabase as an Identity Provider (IdP), issuing and verifying JSON Web Tokens (JWTs) to secure private endpoints while leaving public endpoints accessible.

---

## 🚀 Features

- 🔑 **User Authentication**: Sign Up (`/auth/signup`) and Log In (`/auth/login`) powered by Supabase Auth.
- 🛡️ **JWT Verification**: Token extraction and verification using Supabase `getUser()` API.
- 🛑 **Reusable Middleware Guard**: `requireAuth` Express middleware isolating security logic from business handlers.
- 🚪 **Session Termination**: Authenticated logout (`/auth/logout`) invalidating tokens.
- 📜 **Interactive Swagger UI**: Interactive OpenAPI 3.0 API documentation with Bearer Auth lock support at `/docs`.
- ⚡ **Strict Error Handling**: Correct standard HTTP status codes (`200`, `201`, `204`, `400`, `401`, `500`).

---

## 📁 Project Architecture

```
.
├── .env                  # Private environment variables (ignored by Git)
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Node.js dependencies and scripts
├── src/
│   ├── app.js            # Express server initialization and middleware setup
│   ├── config/
│   │   └── supabase.js   # Supabase client initialization
│   ├── middleware/
│   │   └── auth.js       # Reusable JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js       # POST /auth/signup, /auth/login, /auth/logout
│   │   ├── protected.js  # GET /protected/profile, /protected/dashboard
│   │   └── public.js     # GET /public/info
│   └── swagger/
│       └── openapi.json  # OpenAPI 3.0 specification
└── tests/
    └── api.test.js       # End-to-end integration test suite
```

---

## 🛠️ Environment Setup

1. **Clone the Repository**:
   ```bash
   git clone <your-repo-url>
   cd supabase-auth-api
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Fill in your Supabase credentials obtained from your [Supabase Dashboard](https://supabase.com) under `Project Settings -> API`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_supabase_anon_key
   PORT=3000
   ```

---

## 🏃 Running the Application

To start the server locally:
```bash
npm start
```
The server will start on `http://localhost:3000`. You will see:
```
Server running and connected to Supabase on port 3000
```

---

## 🌐 API Reference

| Method | Endpoint | Auth Required | Description | Expected Request / Header | Success Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/public/info` | ❌ No | Unprotected public information | None | `200 OK` |
| `POST` | `/auth/signup` | ❌ No | Create a new user account | `{ "email": "...", "password": "..." }` | `201 Created` |
| `POST` | `/auth/login` | ❌ No | Authenticate user & get JWT tokens | `{ "email": "...", "password": "..." }` | `200 OK` |
| `POST` | `/auth/logout` | ✅ Yes | Terminate current user session | `Authorization: Bearer <token>` | `204 No Content` |
| `GET` | `/protected/profile` | ✅ Yes | Retrieve authenticated user profile | `Authorization: Bearer <token>` | `200 OK` |
| `GET` | `/protected/dashboard`| ✅ Yes | Access protected user dashboard | `Authorization: Bearer <token>` | `200 OK` |

---

## 🧪 Testing with cURL

### 1. Register a New User
```bash
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"password123"}'
```

### 2. Log In to Receive JWT
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"password123"}'
```
*Copy the `access_token` string from the JSON response.*

### 3. Access Public Route
```bash
curl -i http://localhost:3000/public/info
```

### 4. Access Protected Route Without Token (Fails with 401)
```bash
curl -i http://localhost:3000/protected/profile
```
*Output: `401 Unauthorized` with `{"error": "Access token required"}`*

### 5. Access Protected Route With Valid Token (Succeeds with 200)
```bash
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

### 6. Log Out User
```bash
curl -i -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```
*Output: `204 No Content`*

---

## 📘 Interactive OpenAPI Documentation (Swagger UI)

Access the interactive API documentation at:
```
http://localhost:3000/docs
```

- Click the **Authorize** lock button in Swagger UI.
- Paste your `access_token` into the Bearer Auth field.
- Click **Authorize** and use **Try it out** to test endpoints directly from the browser.

---

## 🥊 Stage 7 Bonus — AI Rematch Analysis ("AI vs Me")

### 1. Token Extraction & Header Parsing
- **Manual Implementation**: Explicitly checks `req.headers.authorization`, verifies the `Bearer ` prefix case-sensitively, splits by space, and validates the presence of non-empty token strings before invoking Supabase API.
- **AI-Generated Baseline**: AI code often assumes `req.headers.authorization.split(' ')[1]` without checking if `authorization` header is `undefined` or malformed, leading to unhandled runtime `TypeError: Cannot read properties of undefined (reading 'split')`.

### 2. Security & Error Handling Flaws
- **Manual Implementation**: Differentiates between missing headers (`400`/`401` "Access token required"), invalid/expired tokens (`401` "Invalid or expired token"), missing credentials (`400`), and bad credentials (`401` "Invalid login credentials").
- **AI Baseline**: AI often catches all errors and returns generic `500` or leaky internal error messages without proper HTTP status code mapping required by security specs.

### 3. Prompt Assumptions & Gaps
- AI relies on generic JWT verification libraries (e.g. `jsonwebtoken.verify`) instead of using the IdP SDK (`supabase.auth.getUser()`), missing secret rotation and revoked session invalidation capabilities.

---

## 🔒 Security Best Practices

- Credentials and secret keys are stored exclusively in `.env` and ignored via `.gitignore`.
- Password hashing and token signing are delegated securely to Supabase Identity Provider.
- Tokens are verified on every protected request via server-side SDK checks.
