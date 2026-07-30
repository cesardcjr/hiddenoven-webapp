const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9091";
}

const DEFAULT_USERS = [
  {
    email: "staff@hiddenoven.com",
    password: "staff123",
    role: "staff",
    name: "Staff Account",
  },
  {
    email: "admin@hiddenoven.com",
    password: "admin123",
    role: "admin",
    name: "Admin Account",
  },
];

async function ensureDefaultUsers() {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin SDK is not initialized yet.");
  }

  const auth = admin.auth();
  const db = admin.firestore();

  for (const userDef of DEFAULT_USERS) {
    const { email, password, role, name } = userDef;

    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          throw error;
        }

        userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
          emailVerified: true,
        });
        console.log(`[bootstrap] Created ${role} user ${email}`);
      }

      await auth.setCustomUserClaims(userRecord.uid, { role });

      await db.collection("users").doc(userRecord.uid).set(
        {
          name: name.trim(),
          role,
          email: email.trim(),
          phone: "",
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await auth.updateUser(userRecord.uid, {
        password,
        displayName: name,
        emailVerified: true,
      });

      console.log(`[bootstrap] Ensured ${role} user ${email}`);
    } catch (error) {
      console.error(
        `[bootstrap] Failed to ensure ${role} user ${email}:`,
        error.message || error,
      );
    }
  }
}

module.exports = { DEFAULT_USERS, ensureDefaultUsers };
