import { db } from "./firebase.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { loadProductReviews, renderStars } from "./reviews.js";
import { checkWishlistState } from "./wishlist.js";

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
// REAL-TIME PRODUCTS
// ==========================
function showProducts() {
  if (!container) {
    console.error("products-container not found in HTML");
    return;
  }

  container.innerHTML = "<p>Loading products...</p>";

  onSnapshot(collection(db, "products"), (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p>No products available.</p>";
      return;
    }

    let rendered = 0;

    snapshot.forEach(docSnap => {
      const p = { id: docSnap.id, ...docSnap.data() };

      // Skip promo products
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

      // Safely escape product name for use in onclick attributes
      const safeName = (p.name || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <!-- Product header with wishlist heart -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h3 style="margin:0; flex:1;">${p.name || "No name"}</h3>
          <button
            id="wishlist_${p.id}"
            onclick="toggleWishlist('${p.id}', '${safeName}', ${p.price}, '${image}', '${currency}')"
            title="Add to wishlist"
            style="background:none; border:none; font-size:1.4rem;
                   cursor:pointer; padding:0 0 0 8px; line-height:1;">
            🤍
          </button>
        </div>

        <img src="${image}" alt="${p.name || "product"}">
        <p>${p.description || ""}</p>
        <p>Price: ${symbol}${p.price || 0}</p>
        ${stockText}

        <button class="add-to-cart"
          data-id="${p.id}"
          data-name="${p.name}"
          data-price="${p.price}"
          data-imageurl="${image}"
          data-currency="${currency}"
          data-stock="${stock}">
          ${stock <= 0 ? "Sold Out" : "Add to Cart"}
        </button>

        <!-- Review button -->
        <div style="margin-top:8px;">
          <button onclick="openReviewModal('${p.id}', '${safeName}')"
            style="background:none; border:1px solid #2e7d32; color:#2e7d32;
                   padding:4px 10px; border-radius:6px; font-size:0.8rem;
                   cursor:pointer; width:100%;">
            ✍ Write a Review
          </button>
        </div>

        <!-- Reviews display -->
        <div id="reviews_${p.id}" style="margin-top:8px;"></div>
      `;

      container.appendChild(card);

      // Load reviews for this product
      loadProductReviews(p.id);

      // Check if product is in wishlist
      checkWishlistState(p.id);
    });

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
      const id       = button.dataset.id;
      const name     = button.dataset.name;
      const price    = Number(button.dataset.price);
      const stock    = Number(button.dataset.stock);
      const imageURL = button.dataset.imageurl || "";
      const currency = button.dataset.currency || "GHS";

      if (stock <= 0) {
        alert("This product is sold out ❌");
        return;
      }

      addToCart({ id, name, price, imageURL, currency, qty: 1 });
      alert(`${name} added to cart ✅`);
    });
  });
}

// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", showProducts);