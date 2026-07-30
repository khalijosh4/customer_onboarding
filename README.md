# Fortune Sacco — Customer Onboarding System

A full-stack, 9-step digital membership onboarding system built for Fortune
Sacco's Kirinyaga/Kerugoya-based market, covering:

1. Phone verification (OTP via Advanta Africa SMS)
2. Consent & Terms and Conditions
3. Personal information
4. Employment
5. Accounts, products & services
6. Referral
7. Next of kin / nominee
8. Document verification — ID front/back scan, in-house OCR (Tesseract.js),
   IPRS cross-check, signature capture, passport photo, and live face-match /
   liveness (face-api.js on TensorFlow.js, entirely client-side)
9. Payment via Safaricom M-Pesa STK Push

Plus an **admin review dashboard** that approves/rejects applications and
pushes approved members into your Core Banking System (CBS).

**Stack:** NestJS (Node.js/TypeScript) + PostgreSQL on the backend, React +
Vite + TypeScript + Tailwind on the frontend.

---

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use the included `docker-compose.yml`)
- A modern browser with camera access (for the liveness step)

## 2. Quick start

### 2.1 Database

```bash
docker compose up -d          # starts PostgreSQL on localhost:5432
```

(Or point the backend at any PostgreSQL instance you already have.)

### 2.2 Backend

```bash
cd backend
cp .env.example .env          # fill in real credentials as you get them
npm install
npm run seed:admin            # creates your first admin login (see .env)
npm run start:dev             # http://localhost:6000/api
```

### 2.3 Frontend

```bash
cd frontend
cp .env.example .env

npm install
```

Before running the frontend, download the face-api.js model files needed
for the liveness step — see `frontend/public/models/README.md` for the
exact files and a one-line script to fetch them.

```bash
npm run dev                   # http://localhost:5175
```

- Member onboarding wizard: `http://localhost:5175/`
- Admin login: `http://localhost:5175/admin/login`

## 3. Credentials you'll need to go live

Everything below works out of the box in **development/demo mode** using
built-in mocks and console logging, so you can click through the entire
flow today. Swap in real credentials in `backend/.env` when you have them —
no code changes required.

| Integration | Where to get it | .env keys |
|---|---|---|
| Advanta Africa SMS (OTP) | Your Advanta Africa Ltd account dashboard | `ADVANTA_API_KEY`, `ADVANTA_PARTNER_ID`, `ADVANTA_SHORTCODE` |
| IPRS verification | Government IPRS integration portal (via MOU) | `IPRS_API_URL`, `IPRS_API_KEY`, `IPRS_CLIENT_ID`, `IPRS_CLIENT_SECRET`, set `IPRS_LIVE_MODE=true` |
| Safaricom Daraja (STK Push) | https://developer.safaricom.co.ke | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` |
| Core Banking System | Your CBS vendor | `CBS_API_URL`, `CBS_API_KEY`, `CBS_API_SECRET`, set `CBS_MODE=live` |

OCR (Tesseract.js) and the liveness face-match run entirely in-house / in
the browser — no external API keys required for those.

## 4. How the identity verification pipeline works

1. Member uploads the front of their ID → backend runs **Tesseract.js OCR**
   in-process, extracts ID number/name/dates, and compares them against
   what was typed in Step 3.
2. The backend simultaneously calls the **IPRS** service to confirm the ID
   number matches the name on record (mock responder until you wire up live
   credentials).
3. In the browser, **face-api.js (TensorFlow.js)** detects the member's
   face on their live webcam feed, requires a natural blink as a liveness
   gesture, then computes a 128-dimension face embedding for both the
   passport photo and the live selfie. Only those two numeric vectors (never
   the raw video) are sent to the backend, which compares them via cosine
   similarity.
4. All four checks (OCR match, IPRS match, liveness match, phone OTP) are
   shown as pass/fail badges to the admin reviewer — automated checks assist
   the human reviewer rather than silently auto-approving.

## 5. Admin approval → CBS hand-off

When an admin clicks **Approve** on an application, the backend immediately
calls `CbsService.createCustomer()`. With `CBS_MODE=mock` (default) this
generates a placeholder CBS customer number so you can demo the full flow.
Switch `CBS_MODE=live` once your CBS vendor has issued API credentials —
no other code changes are needed.

## 6. Project structure

```
backend/    NestJS API (applications, otp, documents/OCR, iprs, payments, admin, cbs)
frontend/   React onboarding wizard + admin dashboard
docker-compose.yml   Local PostgreSQL for development
```

## 7. Notes on customization

- Brand colors/fonts live in `frontend/tailwind.config.js` (emerald green +
  harvest gold, inspired by Fortune Sacco's savings/growth identity) —
  adjust to match your final brand guidelines/logo file.
- Kenyan counties list, account types, and product descriptions are in
  `backend/src/modules/catalog/catalog.data.ts` — edit freely.
- Minimum account-opening amount and share value are set in `.env`
  (`MIN_ACCOUNT_OPENING_AMOUNT`, `SHARE_VALUE_KES`).
