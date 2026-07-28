// scripts/setAdminClaim.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });

getAuth()
  .setCustomUserClaims("qtjlJbKkSBQvn4rkI7jKh1DWLxf1", { role: "admin" })
  .then(() => {
    console.log("Admin claim set.");
    process.exit(0);
  })
  .catch(console.error);
