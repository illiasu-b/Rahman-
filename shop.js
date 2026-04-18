import { db } from "./firebase.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const container = document.getElementById("products-container");


// ==========================
// CART SYSTEM
// ==========================
function addToCart(product) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existing = cart.find(p => p.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
}

window.addToCart = addToCart;


// ==========================
// SAFE IMAGE FUNCTION
// ==========================
function getImage(p) {
  if (p.imageURL && p.imageURL.trim() !== "") {
    return p.imageURL;
  }
  return "images/no-image.png";
}


// ==========================
// REAL-TIME PRODUCTS (excludes promo — client-side filter)
// ==========================
function showProducts() {
  if (!container) {
    console.error("products-container not found in HTML");
    return;
  }

  container.innerHTML = "<p>Loading products...</p>";

  // ✅ FIX: Fetch ALL products, then filter out "promo" on the client side.
  // This avoids the Firestore composite index requirement for != queries,
  // and also shows products that have no category set yet.
  onSnapshot(collection(db, "products"), (snapshot) => {

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p>No products available.</p>";
      return;
    }

    let rendered = 0;

    snapshot.forEach(docSnap => {
      const p = { id: docSnap.id, ...docSnap.data() };

      // ✅ Client-side: skip anything categorised as "promo"
      const cat = p.category?.trim().toLowerCase();
      if (cat === "promo") return;

      rendered++;

      const stock    = Number(p.stock ?? 0);
      const image    = getImage(p);
      const currency = p.currency || "GHS";
      const symbol   =
        currency === "USD" ? "$" :
        currency === "EUR" ? "€" :
        currency === "GBP" ? "£" :
        "₵";

      let stockText = "";
      if (stock <= 0) {
        stockText = `<p class="sold-out">Sold Out</p>`;
      } else if (stock <= 3) {
        stockText = `<p class="low-stock">⚠ Only ${stock} left!</p>`;
      } else {
        stockText = `<p class="in-stock">In Stock: ${stock}</p>`;
      }

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <h3>${p.name || "No name"}</h3>
        <img src="${image}" alt="${p.name || "product"}">
        <p>${p.description || ""}</p>
        <p>Price: ${symbol}${p.price || 0}</p>
        ${stockText}
        <button class="add-to-cart"
          data-id="${p.id}"
          data-name="${p.name}"
          data-price="${p.price}"
          data-stock="${stock}">
          ${stock <= 0 ? "Sold Out" : "Add to Cart"}
        </button>
      `;

      container.appendChild(card);
    });

    // ✅ If everything was filtered out (all products are promos)
    if (rendered === 0) {
      container.innerHTML = "<p>No products available.</p>";
    }

    attachCartListeners();
  });

  console.log("Live stock tracking enabled ✅");
}


// ==========================
// CART BUTTONS
// ==========================
function attachCartListeners() {
  document.querySelectorAll(".add-to-cart").forEach(button => {
    button.addEventListener("click", () => {
      const id    = button.dataset.id;
      const name  = button.dataset.name;
      const price = Number(button.dataset.price);
      const stock = Number(button.dataset.stock);

      if (stock <= 0) {
        alert("This product is sold out ❌");
        return;
      }

      addToCart({ id, name, price, qty: 1 });
      alert(`${name} added to cart ✅`);
    });
  });
}


// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", showProducts);