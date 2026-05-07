// profile.js
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ─── HELPERS ──────────────────────────────────────────────────────
function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";
  el.style.padding = "0.6rem 0.8rem";
  el.style.borderRadius = "6px";
  el.style.marginTop = "0.8rem";
  el.style.fontSize = "0.88rem";
  el.style.background = ok ? "#e8f5e9" : "#fdecea";
  el.style.color = ok ? "#2e7d32" : "#c0392b";
  el.style.border = "1px solid " + (ok ? "#a5d6a7" : "#f1948a");
}

function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ""; el.style.display = "none"; }
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? "0.7" : "1";
  btn.textContent = loading ? "Please wait…" : btn.dataset.label;
}

// ─── MODAL OPEN / CLOSE ───────────────────────────────────────────
window.openProfileModal = function () {
  const overlay = document.getElementById("profileModalOverlay");
  if (overlay) overlay.style.display = "block";
};

window.closeProfileModal = function () {
  const overlay = document.getElementById("profileModalOverlay");
  if (overlay) overlay.style.display = "none";
};

// Close on backdrop click
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("profileModalOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeProfileModal();
    });
  }

  // Store button labels for loading state
  ["pLoginBtn", "pRegBtn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.dataset.label = btn.textContent;
  });
});

// ─── TAB SWITCHING ────────────────────────────────────────────────
window.switchProfileTab = function (tab) {
  const isLogin = tab === "login";
  document.getElementById("profileLoginForm").style.display = isLogin ? "" : "none";
  document.getElementById("profileRegisterForm").style.display = isLogin ? "none" : "";
  document.getElementById("profileLoggedIn").style.display = "none";
  document.getElementById("authTabs").style.display = "";

  const tLogin = document.getElementById("tabLogin");
  const tReg = document.getElementById("tabRegister");
  tLogin.style.background = isLogin ? "#fff" : "transparent";
  tLogin.style.fontWeight = isLogin ? "600" : "500";
  tLogin.style.color = isLogin ? "#000" : "#888";
  tReg.style.background = isLogin ? "transparent" : "#fff";
  tReg.style.fontWeight = isLogin ? "500" : "600";
  tReg.style.color = isLogin ? "#888" : "#000";

  clearMsg("pLoginMsg");
  clearMsg("pRegMsg");
};

// ─── SHOW LOGGED-IN PROFILE ───────────────────────────────────────
function showLoggedIn(user, userData) {
  document.getElementById("profileLoginForm").style.display = "none";
  document.getElementById("profileRegisterForm").style.display = "none";
  document.getElementById("authTabs").style.display = "none";
  document.getElementById("profileLoggedIn").style.display = "";

  const firstName = userData?.firstName || user.displayName?.split(" ")[0] || "User";
  const lastName = userData?.lastName || user.displayName?.split(" ")[1] || "";
  const initials = (firstName[0] + (lastName[0] || "")).toUpperCase();
  const joined = userData?.createdAt?.toDate
    ? userData.createdAt.toDate().toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  document.getElementById("pAvatar").textContent = initials;
  document.getElementById("pFullName").textContent = `${firstName} ${lastName}`.trim();
  document.getElementById("pEmail").textContent = user.email;
  document.getElementById("pInfoEmail").textContent = user.email;
  document.getElementById("pInfoJoined").textContent = joined;

  // Update navbar label
  const label = document.getElementById("profileNavLabel");
  if (label) label.textContent = firstName;
}

// ─── AUTH STATE LISTENER ──────────────────────────────────────────
// Runs on every page load — restores session automatically
onAuthStateChanged(auth, async (user) => {
  const label = document.getElementById("profileNavLabel");
  if (user) {
    // Fetch extra profile data from Firestore
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const userData = snap.exists() ? snap.data() : {};

      // If modal is already open and showing login/register, switch to profile
      const loggedInDiv = document.getElementById("profileLoggedIn");
      if (loggedInDiv && loggedInDiv.style.display !== "none") {
        showLoggedIn(user, userData);
      }

      // Always update nav label
      const firstName = userData?.firstName || user.displayName?.split(" ")[0] || "Account";
      if (label) label.textContent = firstName;

      // If modal is open, show profile view
      const overlay = document.getElementById("profileModalOverlay");
      if (overlay && overlay.style.display === "block") {
        showLoggedIn(user, userData);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      if (label) label.textContent = user.displayName?.split(" ")[0] || "Account";
    }
  } else {
    if (label) label.textContent = "Account";
  }
});

// ─── OVERRIDE openProfileModal to check auth state ───────────────
window.openProfileModal = function () {
  const overlay = document.getElementById("profileModalOverlay");
  if (!overlay) return;
  overlay.style.display = "block";

  const user = auth.currentUser;
  if (user) {
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      showLoggedIn(user, snap.exists() ? snap.data() : {});
    });
  } else {
    switchProfileTab("login");
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────
window.handleProfileLogin = async function () {
  clearMsg("pLoginMsg");
  const email = document.getElementById("pLoginEmail").value.trim();
  const pass = document.getElementById("pLoginPassword").value;

  if (!email || !pass) return showMsg("pLoginMsg", "Please fill in all fields.", false);

  setLoading("pLoginBtn", true);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    showLoggedIn(cred.user, snap.exists() ? snap.data() : {});
  } catch (err) {
    const msgs = {
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-email": "Invalid email address.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
    };
    showMsg("pLoginMsg", msgs[err.code] || "Sign in failed. Please try again.", false);
  } finally {
    setLoading("pLoginBtn", false);
  }
};

// ─── REGISTER ─────────────────────────────────────────────────────
window.handleProfileRegister = async function () {
  clearMsg("pRegMsg");
  const first = document.getElementById("pRegFirst").value.trim();
  const last = document.getElementById("pRegLast").value.trim();
  const email = document.getElementById("pRegEmail").value.trim();
  const pass = document.getElementById("pRegPassword").value;
  const confirm = document.getElementById("pRegConfirm").value;

  if (!first || !last || !email || !pass) return showMsg("pRegMsg", "Please fill in all fields.", false);
  if (pass.length < 6) return showMsg("pRegMsg", "Password must be at least 6 characters.", false);
  if (pass !== confirm) return showMsg("pRegMsg", "Passwords do not match.", false);

  setLoading("pRegBtn", true);
  try {
    // Create Firebase Auth account
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // Update Firebase Auth display name
    await updateProfile(cred.user, { displayName: `${first} ${last}` });

    // Save extra profile data to Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      firstName: first,
      lastName: last,
      email: email,
      createdAt: serverTimestamp(),
    });

    showLoggedIn(cred.user, { firstName: first, lastName: last, email });
  } catch (err) {
    const msgs = {
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/invalid-email": "Invalid email address.",
      "auth/weak-password": "Password is too weak.",
    };
    showMsg("pRegMsg", msgs[err.code] || "Registration failed. Please try again.", false);
  } finally {
    setLoading("pRegBtn", false);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────
window.handleProfileLogout = async function () {
  try {
    await signOut(auth);
    closeProfileModal();
    const label = document.getElementById("profileNavLabel");
    if (label) label.textContent = "Account";
  } catch (err) {
    console.error("Logout error:", err);
  }
};

// ─── ADMIN VISIBILITY ─────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  const adminLink = document.querySelector('a[href="dashboard.html"]')?.closest('li');
  if (!adminLink) return;

  // Hide by default for everyone
  adminLink.style.display = 'none';

  if (user) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && snap.data().isAdmin === true) {
        adminLink.style.display = ''; // show only for admin
      }
    } catch (err) {
      console.error('Admin check failed:', err);
    }
  }
});