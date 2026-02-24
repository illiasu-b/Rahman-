import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("subscribe-form");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const msgElem = document.getElementById("newsletter-msg");

  if (!form || !nameInput || !emailInput) {
    console.error("Form, name input, or email input not found in DOM");
    return;
  }

  async function fixSubscriberNames() {
    const snapshot = await getDocs(collection(db, "subscribers"));
    snapshot.forEach(async d => {
      const data = d.data();
      if (!data.name) {
        await updateDoc(doc(db, "subscribers", d.id), {
          name: "Unknown"
        });
      }
    });
    console.log("All missing names updated!");
  }
  fixSubscriberNames();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if (!name || !email) {
      msgElem.textContent = "Please enter both name and email ❌";
      msgElem.style.color = "red";
      return;
    }

    try {
      const q = query(collection(db, "subscribers"), where("email", "==", email));
      const existing = await getDocs(q);

      if (!existing.empty) {
        msgElem.textContent = "This email is already subscribed ✅";
        msgElem.style.color = "green";
        form.reset();
        return;
      }

      await addDoc(collection(db, "subscribers"), {
        name,
        email,
        subscribedAt: serverTimestamp(),
        syncedToMailchimp: false
      });

      msgElem.textContent = "Subscribed successfully ✅";
      msgElem.style.color = "green";
      form.reset();

    } catch (err) {
      console.error("Subscription failed:", err);
      msgElem.textContent = "Subscription failed ❌";
      msgElem.style.color = "red";
    }
  });
});
