import { db } from "./firebase.js";
import { collection, query, where, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const promoRef = collection(db, "promotions");
    const q = query(promoRef, where("active", "==", true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("No active promotions found.");
      return;
    }

    const promos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const container = document.getElementById("promo-banner-container");

    if (!container) return;

    let index = 0;

    // Create promo banners dynamically
    promos.forEach((promo, i) => {
      const banner = document.createElement("div");
banner.className = `promo-banner ${i === 0 ? "promo-show" : "promo-hidden"}`;
      // Image
      const img = document.createElement("img");
      img.src = promo.imageUrl || "placeholder.png";
      img.alt = promo.title || "Promotion";
      img.className = "promo-image";

      // Title
      const title = document.createElement("h2");
      title.textContent = promo.title || "";

      // Message
      const message = document.createElement("p");
      message.textContent = promo.message || "";

      // Button
      const btn = document.createElement("a");
      btn.href = promo.buttonLink || "#";
      btn.textContent = promo.buttonText || "Learn More";

      // Append elements
      banner.appendChild(img);
      banner.appendChild(title);
      banner.appendChild(message);
      banner.appendChild(btn);

      container.appendChild(banner);
    });

    const banners = container.querySelectorAll("div");

    // Rotate promos every 4s
    setInterval(() => {
      banners[index].classList.remove("promo-show");
      banners[index].classList.add("promo-hidden");

      index = (index + 1) % banners.length;

      banners[index].classList.remove("promo-hidden");
      banners[index].classList.add("promo-show");
    }, 4000);

  } catch (error) {
    console.error("Error loading promotions:", error);
  }
});