// subscribe.js
import { db } from "./firebase.js";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM elements
const subscribeBtn = document.getElementById("subscribeBtn");
const subscriberEmail = document.getElementById("subscriberEmail");
const msgElem = document.getElementById("newsletter-msg");

// Ensure DOM elements exist
if (!subscribeBtn || !subscriberEmail) {
  console.error("Subscribe button or email input not found in DOM");
} else {
  subscribeBtn.addEventListener("click", async () => {
    const email = subscriberEmail.value.trim().toLowerCase();

    if (!email) {
      msgElem.textContent = "Please enter your email ❌";
      msgElem.style.color = "red";
      return;
    }

    try {
      // Prevent duplicates: check if email already exists
      const q = query(collection(db, "subscribers"), where("email", "==", email));
      const existing = await getDocs(q);

      if (!existing.empty) {
        msgElem.textContent = "This email is already subscribed ✅";
        msgElem.style.color = "green";
        subscriberEmail.value = "";
        return;
      }

      // Add new subscriber
      await addDoc(collection(db, "subscribers"), {
        email,
        subscribedAt: serverTimestamp()
      });

      msgElem.textContent = "Subscribed successfully ✅";
      msgElem.style.color = "green";
      subscriberEmail.value = "";

    } catch (err) {
      console.error("Subscription failed:", err);
      msgElem.textContent = "Subscription failed ❌";
      msgElem.style.color = "red";
    }
  });
}