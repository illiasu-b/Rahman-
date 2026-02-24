// auth.js
import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  // --- SIGN UP ---
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    const signupEmail = document.getElementById("signupEmail");
    const signupPassword = document.getElementById("signupPassword");

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = signupEmail.value.trim();
      const password = signupPassword.value.trim();

      try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created ✅");
        window.location.href = "admin.html";
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // --- LOGIN ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "dashboard.html";
      } catch (error) {
        alert("Invalid login ❌");
      }
    });
  }

});
