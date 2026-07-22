// seed-admins.js
// Run ONCE, locally, with Node.js, to create the default admin + superadmin
// accounts. This uses the Admin SDK, which bypasses Firestore rules — that's
// why this must NEVER run in the browser or be shipped to students.
//
// SETUP:
// 1. npm init -y && npm install firebase-admin
// 2. Firebase Console -> Project settings -> Service accounts ->
//    "Generate new private key" -> save the JSON file as
//    ./serviceAccountKey.json in this same folder (keep it out of git!).
// 3. Edit the emails/passwords below.
// 4. node seed-admins.js

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const ACCOUNTS = [
  {
    email: "superadmin@bisu.edu.ph",
    password: "CHANGE_ME_STRONG_PASSWORD_1",
    role: "superadmin",
    name: "System Superadmin"
  },
  {
    email: "admin@bisu.edu.ph",
    password: "CHANGE_ME_STRONG_PASSWORD_2",
    role: "admin",
    name: "Instructor Admin"
  }
];

async function upsertAccount({ email, password, role, name }) {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log(`Found existing auth user for ${email}, updating role/claims only.`);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    user = await admin.auth().createUser({ email, password, displayName: name });
    console.log(`Created auth user for ${email}.`);
  }

  // Custom claim lets Firestore rules (and your own backend) check
  // request.auth.token.role without an extra read.
  await admin.auth().setCustomUserClaims(user.uid, { role });

  // Profile/role doc that the client reads after login.
  await admin.firestore().doc(`users/${user.uid}`).set(
    {
      role,
      name,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  console.log(`Seeded ${role} account: ${email} (uid: ${user.uid})`);
}

(async () => {
  for (const account of ACCOUNTS) {
    await upsertAccount(account);
  }
  console.log("\nDone. IMPORTANT: change these passwords after first login, and delete/secure serviceAccountKey.json.");
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});