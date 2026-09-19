# Plaid POC

Proof of concept for connecting a bank account via Plaid Link. Next.js app, deploys on Vercel.

## Setup

1. Create a Plaid account at https://dashboard.plaid.com and grab your `client_id` and Sandbox secret from Developers > Keys.
2. Copy `.env.example` to `.env.local` and fill in the values.
3. `npm install && npm run dev`, open http://localhost:3000.
4. Click "Connect bank". In sandbox, pick any bank and log in with `user_good` / `pass_good`.

## Deploy to Vercel

Import the repo in Vercel and set `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` in project env vars.

## Going to production (real Chase)

- Request Production access in the Plaid dashboard.
- Chase uses OAuth: register your deployed URL as an allowed redirect URI in Plaid dashboard (API > Allowed redirect URIs).
- Set `PLAID_ENV=production` and use the production secret.
- Replace the in-memory access token storage in `app/api/exchange-token/route.js` with a database.
