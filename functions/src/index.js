const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const app = require("./app");
const { onOrderWrite } = require("./triggers/onOrderWrite");
const { autoAcceptStaleOrders } = require("./scheduled/autoAcceptOrders");

// Main API
exports.api = functions.https.onRequest(app);

// Firestore trigger — fires on every order create/update
exports.onOrderWrite = functions.firestore
  .document("orders/{orderId}")
  .onWrite(onOrderWrite);

// Moves unattended intake orders into payment review after 30 minutes.
// Advance and bulk orders are then routed to their matching staff panels by the UI.
exports.autoAcceptOrders = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Asia/Manila")
  .onRun(autoAcceptStaleOrders);
