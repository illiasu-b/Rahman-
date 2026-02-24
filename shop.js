// shop.js
import { db } from './firebase.js';
import { 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { addToCart } from "./cart.js";

// Real-time product listener
function showProducts() {

  const container = document.getElementById("products-container");

  onSnapshot(collection(db, "products"), (snapshot) => {

    container.innerHTML = ""; // Clear before rendering

    snapshot.forEach(doc => {

      const p = { id: doc.id, ...doc.data() };

      // ✅ Hide product when stock = 0
      if (!p.stock || p.stock <= 0) {
        return;
      }

      const card = document.createElement("div");
      card.className = "product-card";

      // ✅ Low stock warning
      let stockText = "";

      if (p.stock <= 3) {
        stockText = `<p class="low-stock">⚠ Only ${p.stock} left!</p>`;
      } else {
        stockText = `<p class="in-stock">In Stock: ${p.stock}</p>`;
      }

      card.innerHTML = `
        <h3>${p.name}</h3>
        <img src="${p.imageURL}" alt="${p.name}">
        <p>${p.description}</p>
        <p>Price: $${p.price}</p>
        ${stockText}
        <button class="add-to-cart"
                data-id="${p.id}"
                data-name="${p.name}"
                data-price="${p.price}"
                data-stock="${p.stock}">
          Add to Cart
        </button>
      `;

      container.appendChild(card);
    });

    attachCartListeners();
  });

  console.log("Live stock tracking enabled ✅");
}

function attachCartListeners() {

  const buttons = document.querySelectorAll(".add-to-cart");

  buttons.forEach(button => {
    button.addEventListener("click", () => {

      const id = button.dataset.id;
      const name = button.dataset.name;
      const price = Number(button.dataset.price);
      const stock = Number(button.dataset.stock);

      if (stock <= 0) {
        alert("Out of stock");
        return;
      }

      addToCart({ id, name, price, qty: 1 });
      alert(`${name} added to cart ✅`);
    });
  });
}

document.addEventListener("DOMContentLoaded", showProducts);