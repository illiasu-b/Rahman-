import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const heroContainer = document.querySelector(".hero-container");

async function loadHeroProducts() {
  if (!heroContainer) return;

  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);

    snapshot.docs.forEach(doc => {
      const product = doc.data();
      console.log("Loaded product:", product);

      const card = document.createElement("div");
      card.className = "hero-product";

      const img = document.createElement("img");
      img.src = (product.imageURL || "").trim() || "https://via.placeholder.com/200x150";

      const title = document.createElement("h4");
      title.textContent = product.name || "Product";

      const price = document.createElement("p");
      price.textContent = `₵${product.price || 0}`;

      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(price);

      card.addEventListener("click", () => {
        window.location.href = `shop.html?id=${doc.id}`;
      });

      heroContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading hero products:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadHeroProducts);
