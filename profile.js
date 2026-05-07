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

// ─── NAVBAR HELPERS ───────────────────────────────────────────────
function setNavName(firstName) {
  const label = document.getElementById("profileNavLabel");
  if (label) label.textContent = firstName || "Account";
}

function setNavPhoto(photoURL) {
  const navBtn = document.querySelector("#profileNavBtn");
  if (!navBtn || !photoURL) return;
  const existingIcon = navBtn.querySelector("i");
  const existingImg  = navBtn.querySelector("img");
  const imgTag = `<img src="${photoURL}"
    style="width:28px; height:28px; border-radius:50%; object-fit:cover; vertical-align:middle;"
    onerror="this.outerHTML='<i class=\\'fas fa-user-circle\\'></i>'">`;
  if (existingIcon) {
    existingIcon.outerHTML = imgTag;
  } else if (existingImg) {
    existingImg.src = photoURL;
  }
}

function resetNavPhoto() {
  const navBtn = document.querySelector("#profileNavBtn");
  if (!navBtn) return;
  const existingImg = navBtn.querySelector("img");
  if (existingImg) existingImg.outerHTML = `<i class="fas fa-user-circle"></i>`;
}

// ─── MODAL OPEN / CLOSE ───────────────────────────────────────────
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
  const tReg   = document.getElementById("tabRegister");
  tLogin.style.background  = isLogin ? "#fff" : "transparent";
  tLogin.style.fontWeight  = isLogin ? "600" : "500";
  tLogin.style.color       = isLogin ? "#000" : "#888";
  tReg.style.background    = isLogin ? "transparent" : "#fff";
  tReg.style.fontWeight    = isLogin ? "500" : "600";
  tReg.style.color         = isLogin ? "#888" : "#000";

  clearMsg("pLoginMsg");
  clearMsg("pRegMsg");
};

// ─── SHOW LOGGED-IN PROFILE ───────────────────────────────────────
function showLoggedIn(user, userData) {
  document.getElementById("profileLoginForm").style.display  = "none";
  document.getElementById("profileRegisterForm").style.display = "none";
  document.getElementById("authTabs").style.display          = "none";
  document.getElementById("profileLoggedIn").style.display   = "";

  const firstName = userData?.firstName
    || user.displayName?.split(" ")[0]
    || user.email.split("@")[0]
    || "User";
  const lastName  = userData?.lastName || user.displayName?.split(" ")[1] || "";
  const initials  = (firstName[0] + (lastName[0] || "")).toUpperCase();
  const joined    = userData?.createdAt?.toDate
    ? userData.createdAt.toDate().toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  // Avatar — show photo if saved, otherwise initials
  const avatarEl = document.getElementById("pAvatar");
  if (userData?.photoURL) {
    avatarEl.innerHTML = `<img src="${userData.photoURL}"
      style="width:100%; height:100%; object-fit:cover; border-radius:50%;"
      onerror="this.parentElement.textContent='${initials}'">`;
  } else {
    avatarEl.textContent = initials;
  }

  document.getElementById("pFullName").textContent    = `${firstName} ${lastName}`.trim();
  document.getElementById("pEmail").textContent       = user.email;
  document.getElementById("pInfoEmail").textContent   = user.email;
  document.getElementById("pInfoJoined").textContent  = joined;

  // Update navbar
  setNavName(firstName);
  if (userData?.photoURL) setNavPhoto(userData.photoURL);

  // Init avatar upload handler
  initAvatarUpload();
}

// ─── UNIFIED AUTH STATE LISTENER ─────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  const adminLink = document.querySelector('a[href="dashboard.html"]')?.closest("li");

  // Hide admin link by default
  if (adminLink) adminLink.style.display = "none";

  if (user) {
    try {
      const snap     = await getDoc(doc(db, "users", user.uid));
      const userData = snap.exists() ? snap.data() : {};

      // Restore name in navbar
      const firstName = userData?.firstName
        || user.displayName?.split(" ")[0]
        || user.email.split("@")[0]
        || "Account";
      setNavName(firstName);

      // Restore photo in navbar
      if (userData?.photoURL) setNavPhoto(userData.photoURL);

      // Show admin link only for admin
      if (adminLink && userData?.isAdmin === true) {
        adminLink.style.display = "";
      }

      // If modal is open, show profile view
      const overlay = document.getElementById("profileModalOverlay");
      if (overlay && overlay.style.display === "block") {
        showLoggedIn(user, userData);
      }

    } catch (err) {
      console.error("Auth state error:", err);
      setNavName(user.displayName?.split(" ")[0] || "Account");
    }

  } else {
    setNavName("Account");
    resetNavPhoto();
    if (adminLink) adminLink.style.display = "none";
  }
});

// ─── OPEN PROFILE MODAL ───────────────────────────────────────────
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
  const pass  = document.getElementById("pLoginPassword").value;

  if (!email || !pass) return showMsg("pLoginMsg", "Please fill in all fields.", false);

  setLoading("pLoginBtn", true);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    showLoggedIn(cred.user, snap.exists() ? snap.data() : {});
  } catch (err) {
    const msgs = {
      "auth/user-not-found":     "No account found with this email.",
      "auth/wrong-password":     "Incorrect password.",
      "auth/invalid-email":      "Invalid email address.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/too-many-requests":  "Too many attempts. Please try again later.",
    };
    showMsg("pLoginMsg", msgs[err.code] || "Sign in failed. Please try again.", false);
  } finally {
    setLoading("pLoginBtn", false);
  }
};

// ─── REGISTER ─────────────────────────────────────────────────────
window.handleProfileRegister = async function () {
  clearMsg("pRegMsg");
  const first   = document.getElementById("pRegFirst").value.trim();
  const last    = document.getElementById("pRegLast").value.trim();
  const email   = document.getElementById("pRegEmail").value.trim();
  const pass    = document.getElementById("pRegPassword").value;
  const confirm = document.getElementById("pRegConfirm").value;

  if (!first || !last || !email || !pass) return showMsg("pRegMsg", "Please fill in all fields.", false);
  if (pass.length < 6) return showMsg("pRegMsg", "Password must be at least 6 characters.", false);
  if (pass !== confirm) return showMsg("pRegMsg", "Passwords do not match.", false);

  setLoading("pRegBtn", true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: `${first} ${last}` });
    await setDoc(doc(db, "users", cred.user.uid), {
      firstName: first,
      lastName:  last,
      email:     email,
      createdAt: serverTimestamp(),
    });
    showLoggedIn(cred.user, { firstName: first, lastName: last, email });
  } catch (err) {
    const msgs = {
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/invalid-email":        "Invalid email address.",
      "auth/weak-password":        "Password is too weak.",
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
    setNavName("Account");
    resetNavPhoto();
  } catch (err) {
    console.error("Logout error:", err);
  }
};

// ─── AVATAR UPLOAD ────────────────────────────────────────────────
function initAvatarUpload() {
  const avatarInput = document.getElementById("avatarFileInput");
  const avatarEl    = document.getElementById("pAvatar");

  if (!avatarInput || !avatarEl) return;
  if (avatarInput._bound) return; // prevent duplicate listeners
  avatarInput._bound = true;

  avatarEl.addEventListener("click", () => avatarInput.click());

  avatarInput.addEventListener("change", async () => {
    const file = avatarInput.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return;

    avatarEl.innerHTML = `<span style="font-size:11px; color:#888;">Uploading...</span>`;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "product_upload");

      const res  = await fetch("https://api.cloudinary.com/v1_1/dw3h0amnh/image/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      const photoURL = data.secure_url;

      if (!photoURL) throw new Error("No URL returned from Cloudinary");

      // Save to Firestore
      await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });

      // Show new image in avatar
      avatarEl.innerHTML = `<img src="${photoURL}"
        style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;

      // Update navbar icon
      setNavPhoto(photoURL);

    } catch (err) {
      console.error("Avatar upload failed:", err);
      avatarEl.innerHTML = `<span style="font-size:11px; color:red;">Failed ❌</span>`;
    }
  });
}