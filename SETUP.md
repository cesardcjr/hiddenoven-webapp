# The Hidden Oven — Setup Guide

Follow these steps exactly, in order, before running the application.

---

## Step 1 — Firebase Console Setup

### 1.1 Create the Firebase Project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `hiddenoven-dev`
3. Disable Google Analytics (not needed) → **Create project**
4. **Upgrade to Blaze plan**: Click the Spark plan badge at the bottom left → **Upgrade** → select Blaze (pay-as-you-go). Cloud Functions require this — you won't be charged unless you exceed the free tier.

### 1.2 Enable Firebase Services
In the left sidebar, enable each service:

**Authentication**
- Click **Authentication** → **Get started**
- Go to **Sign-in method** tab → enable **Email/Password** → Save

**Firestore**
- Click **Firestore Database** → **Create database**
- Choose **Start in production mode** → select your region (e.g. `asia-southeast1` for PH) → **Enable**

**Storage**
- Click **Storage** → **Get started**
- Choose **Start in production mode** → same region as Firestore → **Done**

**Cloud Functions**
- Click **Functions** → **Get started** → follow the prompts

### 1.3 Get Your Web App Config
1. Go to **Project Settings** (gear icon) → **General** tab
2. Scroll to **Your apps** → click **Add app** → choose **Web** (</>)
3. Register the app (name it `hidden-oven-web`) — **don't** enable Firebase Hosting
4. Copy the `firebaseConfig` object — you'll need these values in Step 3

It will look like this:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "hiddenoven-dev.firebaseapp.com",
  projectId: "hiddenoven-dev",
  storageBucket: "hiddenoven-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 1.4 Create the Admin Account
1. In **Authentication** → **Users** tab → **Add user**
2. Enter an email and password for the admin account
3. Copy the **UID** shown after creation (you'll need it below)

### 1.5 Set the Admin Custom Claim
Cloud Functions are not deployed yet, so set the admin claim manually via the Firebase Admin SDK.

Run this one-time Node.js script locally (requires `firebase-admin`):

```js
// scripts/setAdminClaim.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // download from Firebase Console

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

admin.auth().setCustomUserClaims("PASTE_ADMIN_UID_HERE", { role: "admin" })
  .then(() => { console.log("Admin claim set."); process.exit(0); })
  .catch(console.error);
```

To get `serviceAccountKey.json`:
- **Project Settings** → **Service accounts** tab → **Generate new private key** → Download

---

## Step 2 — Clone & Install

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/hidden-oven.git
cd hidden-oven

# Install backend dependencies
cd functions && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Log in to Firebase
firebase login

# Link to your Firebase project
firebase use --add
# Select hiddenoven-dev when prompted, alias it as "dev"
```

---

## Step 3 — Configure Environment Variables

```bash
# From the frontend/ directory
cd frontend
cp .env.example .env.local
```

Open `frontend/.env.local` and fill in every value using your `firebaseConfig` from Step 1.3:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=hiddenoven-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hiddenoven-dev
VITE_FIREBASE_STORAGE_BUCKET=hiddenoven-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

VITE_API_BASE_URL=http://localhost:5001/hiddenoven-dev/us-central1/api
VITE_USE_EMULATORS=true
```

> Replace `hiddenoven-dev` with your actual project ID throughout.

---

## Step 4 — Deploy Firestore Rules & Indexes

```bash
# From the root of the repo
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## Step 5 — Seed Initial Data (Emulator or Live)

### Pickup Slots (required to place orders)
Add at least one pickup slot to Firestore manually via the Firebase Console → **Firestore** → **+ Start collection** → `pickup_slots`:

```
slotId:    (auto-generated)
date:      2024-12-25        ← use a future date
timeRange: "2:00PM - 3:00PM"
capacity:  20
slotsUsed: 0
```

### Products
Add products via **Firestore** → `products` collection, or use the Admin portal after logging in.

---

## Step 6 — Run Locally

Open **three terminals**:

**Terminal 1 — Firebase Emulators**
```bash
cd hidden-oven
firebase emulators:start
```
Emulator UI opens at http://localhost:4000

**Terminal 2 — Frontend**
```bash
cd hidden-oven/frontend
npm run dev
```
Customer portal at http://localhost:3000

**Portal URLs:**
| Portal   | URL                              |
|----------|----------------------------------|
| Customer | http://localhost:3000            |
| Staff    | http://localhost:3000/staff/login |
| Admin    | http://localhost:3000/admin/login |

---

## Step 7 — Deploy to Production

### 7.1 Deploy Cloud Functions
```bash
firebase deploy --only functions
```

After deployment, your API base URL will be:
`https://us-central1-hiddenoven-dev.cloudfunctions.net/api`

Update `VITE_API_BASE_URL` in your Vercel environment variables (not `.env.local`).

### 7.2 Deploy Frontend to Vercel
1. Push the repo to GitHub
2. Go to https://vercel.com → **New Project** → import your repo
3. Set **Root Directory** to `frontend`
4. Add all `VITE_*` environment variables from `.env.local` in Vercel's **Environment Variables** panel
5. Set `VITE_USE_EMULATORS=false` and `VITE_API_BASE_URL` to your live Cloud Functions URL
6. Deploy

---

## Information You Need to Provide

To run this application, I need the following from your Firebase project:

| # | What I need                        | Where to find it                                      |
|---|------------------------------------|-------------------------------------------------------|
| 1 | `VITE_FIREBASE_API_KEY`            | Project Settings → General → Web app config           |
| 2 | `VITE_FIREBASE_AUTH_DOMAIN`        | Same as above                                         |
| 3 | `VITE_FIREBASE_PROJECT_ID`         | Same as above                                         |
| 4 | `VITE_FIREBASE_STORAGE_BUCKET`     | Same as above                                         |
| 5 | `VITE_FIREBASE_MESSAGING_SENDER_ID`| Same as above                                         |
| 6 | `VITE_FIREBASE_APP_ID`             | Same as above                                         |
| 7 | Admin account UID                  | Authentication → Users (after creating the account)   |

---

## Common Issues

**"Firebase: Error (auth/invalid-api-key)"**
→ Your `VITE_FIREBASE_API_KEY` in `.env.local` is wrong or missing. Restart `npm run dev` after editing `.env.local`.

**"Missing or insufficient permissions"**
→ Firestore rules not deployed. Run: `firebase deploy --only firestore:rules`

**"Cannot transition order from X to Y"**
→ You're trying an invalid status jump. Follow the flow: pending → accepted → payment_verified → ready → completed.

**Functions not starting in emulator**
→ Make sure you're on Node.js 18+: `node --version`

**Staff/admin login says "You don't have access to this portal"**
→ The custom claim (`role: staff` or `role: admin`) wasn't set. Re-run the `setAdminClaim.js` script or create staff via the Admin portal after logging in as admin.
