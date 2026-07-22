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

  const { email, password, name, program, section } = request.data || {};
  if (!email || !password || password.length < 6 || !program || !section) {
    throw new HttpsError("invalid-argument", "email, password, department, and section are required.");
  }

  const user = await admin.auth().createUser({ email, password, displayName: name || email });
  await admin.auth().setCustomUserClaims(user.uid, { role: "admin", program, section });

  await admin.firestore().doc(`users/${user.uid}`).set({
    role: "admin",
    name: name || "",
    email,
    program,
    section,
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

exports.updateAdminAccount = onCall(async (request) => {
  const callerRole = request.auth?.token?.role;
  if (callerRole !== "superadmin") {
    throw new HttpsError("permission-denied", "Only a superadmin can update admin accounts.");
  }

  const { uid, name, email, program, section } = request.data || {};
  if (!uid || !name || !program || !section) {
    throw new HttpsError("invalid-argument", "uid, name, department, and section are required.");
  }

  const adminRef = admin.firestore().doc(`users/${uid}`);
  const snapshot = await adminRef.get();
  if (!snapshot.exists || snapshot.data().role !== "admin") {
    throw new HttpsError("not-found", "Admin user not found.");
  }

  const authUpdate = {};
  if (email) authUpdate.email = email;
  if (name) authUpdate.displayName = name;
  if (Object.keys(authUpdate).length) {
    await admin.auth().updateUser(uid, authUpdate);
  }

  await admin.auth().setCustomUserClaims(uid, { role: "admin", program, section });
  await adminRef.update({ name, email, program, section });

  return { uid, email };
});

exports.deleteAdminAccount = onCall(async (request) => {
  const callerRole = request.auth?.token?.role;
  if (callerRole !== "superadmin") {
    throw new HttpsError("permission-denied", "Only a superadmin can delete admin accounts.");
  }

  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "uid is required.");

  await admin.auth().deleteUser(uid);
  await admin.firestore().doc(`users/${uid}`).delete();

  return { uid, deleted: true };
});

exports.updateStudentAccount = onCall(async (request) => {
  const callerRole = request.auth?.token?.role;
  if (callerRole !== "admin" && callerRole !== "superadmin") {
    throw new HttpsError("permission-denied", "Only an admin or superadmin can update student accounts.");
  }

  const { uid, firstName, lastName, section } = request.data || {};
  if (!uid || !firstName || !lastName || !section) {
    throw new HttpsError("invalid-argument", "uid, firstName, lastName, and section are required.");
  }

  const studentRef = admin.firestore().doc(`users/${uid}`);
  const snapshot = await studentRef.get();
  if (!snapshot.exists || snapshot.data().role !== "student") {
    throw new HttpsError("not-found", "Student account not found.");
  }

  const student = snapshot.data();
  if (callerRole === "admin") {
    const callerProgram = request.auth.token.program;
    const callerSection = request.auth.token.section;
    if (student.program !== callerProgram || student.section !== callerSection) {
      throw new HttpsError("permission-denied", "Admins can only update students in their assigned department and section.");
    }
  }

  await studentRef.update({ firstName, lastName, section });
  return { uid };
});

exports.deleteStudentAccount = onCall(async (request) => {
  const callerRole = request.auth?.token?.role;
  if (callerRole !== "admin" && callerRole !== "superadmin") {
    throw new HttpsError("permission-denied", "Only an admin or superadmin can delete student accounts.");
  }

  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "uid is required.");

  const studentRef = admin.firestore().doc(`users/${uid}`);
  const snapshot = await studentRef.get();
  if (!snapshot.exists || snapshot.data().role !== "student") {
    throw new HttpsError("not-found", "Student account not found.");
  }

  const student = snapshot.data();
  if (callerRole === "admin") {
    const callerProgram = request.auth.token.program;
    const callerSection = request.auth.token.section;
    if (student.program !== callerProgram || student.section !== callerSection) {
      throw new HttpsError("permission-denied", "Admins can only delete students in their assigned department and section.");
    }
  }

  await admin.auth().deleteUser(uid);
  await studentRef.delete();
  return { uid, deleted: true };
});
