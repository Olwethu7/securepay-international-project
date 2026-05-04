# Customer International Payments Portal - Setup & Demo Guide

## Local Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- NPM or PNPM

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Update `JWT_SECRET` and `CSRF_SECRET` with strong random strings.

### 3. Installation
```bash
npm install
```

### 4. Running the Application
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 5. HTTPS Setup (Optional but Recommended)
To run locally over HTTPS as requested:
1. Install `mkcert`: `brew install mkcert` (Mac) or download binary.
2. Run `mkcert -install`.
3. Create certificate: `mkcert localhost`.
4. Update `vite.config.ts` to include:
   ```ts
   server: {
     https: {
       key: fs.readFileSync('./localhost-key.pem'),
       cert: fs.readFileSync('./localhost.pem'),
     }
   }
   ```

---

## Recording Your Demo Video (OBS Guide)

### 1. Scenes to Record
Showcase the following in order:
1. **Security Feature (Registration)**: Create an account. Point out the password complexity requirements.
2. **Authentication**: Log in with the new account.
3. **Whitelisting (Failure)**: Attempt a payment with an invalid IBAN or recipient name (e.g., symbols like `<script>` or `@`). Show the error messages blocking the input.
4. **Whitelisting (Success)**: Make a valid payment (use a valid IBAN format).
5. **Data Persistence**: Refresh the page to show the account balance updated and the transaction appearing in history.
6. **Backend Security**: Mention that passwords are stored as `bcrypt` hashes (show the SQLite file or log if possible).

### 2. OBS Settings
- **Source**: Window Capture (your browser).
- **Resolution**: 1080p.
- **Microphone**: Narrate the security steps (Hashing, Parameterized queries, CSRF tokens).

### 3. Upload
Upload to YouTube as **Unlisted** and share the link.

---

## Security Features Implemented

- **Password Hashing**: Salted and hashed using `bcryptjs` (Cost factor 12).
- **SQL Injection Guard**: All SQLite interactions use `prepare().run()` or `prepare().get()`.
- **Input Whitelisting**: Strict RegEx patterns on both Frontend (Instant feedback) and Backend (Final check).
- **Session Security**: JWTs stored in `httpOnly`, `secure`, `sameSite: strict` cookies.
- **XSS Protection**: `helmet` headers and React's automatic output escaping.
- **Rate Limiting**: Limits API calls to 100 per 15 minutes per IP.
- **CSRF Mitigation**: SameSite cookie policy enforced.
