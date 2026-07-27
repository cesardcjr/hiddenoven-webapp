const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const app = require("./app");
const { onOrderWrite } = require("./triggers/onOrderWrite");

// Main API
exports.api = functions.https.onRequest(app);

// Firestore trigger — fires on every order create/update
exports.onOrderWrite = functions.firestore
  .document("orders/{orderId}")
  .onWrite(onOrderWrite);
