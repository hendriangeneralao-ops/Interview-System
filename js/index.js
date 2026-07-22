// functions/index.js
// Deploy with: firebase deploy --only functions
// (requires the Firebase CLI: npm install -g firebase-tools, then firebase login)
//
// This is the ONLY place new admin accounts get created after the initial
// seed. It runs with Admin SDK privileges but is itself gated: only a caller
// whose ID token already carries the 'superadmin' custom claim can invoke it.
// A student or admin calling this function is rejected before anything happens.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createAdminAccount = onCall(async (request) => {
  const callerRole = request.auth?.token?.role;
  if (callerRole !== "superadmin") {
    throw new HttpsError("permission-denied", "Only a superadmin can create admin accounts.");
  }

  const { email, password, name } = request.data || {};
  if (!email || !password || password.length < 6) {
    throw new HttpsError("invalid-argument", "email and a password (6+ chars) are required.");
  }

  const user = await admin.auth().createUser({ email, password, displayName: name || email });
  await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });

  await admin.firestore().doc(`users/${user.uid}`).set({
    role: "admin",
    name: name || "",
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: request.auth.uid
  });

  return { uid: user.uid, email };
});

// Optional companion: lets a superadmin revoke an admin's access (disable the
// account + downgrade Firestore role) without deleting their history.
exports.revokeAdminAccount = onCall(async (request) => {
  const callerRole = request.auth?.token?.role;
  if (callerRole !== "superadmin") {
    throw new HttpsError("permission-denied", "Only a superadmin can revoke admin accounts.");
  }

  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "uid is required.");

  await admin.auth().updateUser(uid, { disabled: true });
  await admin.auth().setCustomUserClaims(uid, { role: "revoked" });
  await admin.firestore().doc(`users/${uid}`).update({ role: "revoked" });

  return { uid, revoked: true };
});