# Library_GUI

This repository contains:
- Backend (Node.js + Express + mysql2) at repository root
- Frontend demo (static) under docs/ for publishing with GitHub Pages

Quick start (local backend + MySQL)
1. Install dependencies:
   ```bash
   npm install
   ```

2. Import the SQL schema into your MySQL:
   ```bash
   mysql -u root -p < create_library.sql
   ```

3. Create a .env file locally (do NOT commit it). Use `.env.example` as reference.

4. Seed the admin user:
   ```bash
   npm run seed-admin
   ```

5. Start the backend:
   ```bash
   npm start
   ```
   Backend will run on port 3000 by default.

Frontend (GitHub Pages)
- The static frontend files live in docs/ so you can enable GitHub Pages from the repository Settings → Pages → main / docs folder.
- Edit docs/config.js to set `window.__API_BASE__` to your backend public URL (for example a Cloudflare Tunnel URL or an HTTPS host).
- GitHub Pages serves the static site; the backend must run separately and be reachable via the URL set in docs/config.js.

Security notes
- Do not commit real secrets or .env. Use environment variables.
- In production, create a DB user with limited privileges instead of using root.
- Use HTTPS for API endpoints. If using Cloudflare Tunnel or hosting providers, ensure TLS is enabled.
