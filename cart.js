// cart.js
export let cart = JSON.parse(localStorage.getItem("cart")) || [];

// --- Save cart to localStorage ---
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// --- Render cart table dynamically ---
export function renderCart() {
  const tableBody = document.querySelector("#cartTable");
  const totalElem = document.getElementById("cartTotal");

  if (!tableBody || !totalElem) return;

  tableBody.innerHTML = "";

  if (cart.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5">Your cart is empty</td></tr>`;
    totalElem.textContent = "Total: ₵0";
    return;
  }

  let total = 0;
  cart.forEach(item => {
    const price = Number(item.price);
    const qty = Number(item.qty);
    const itemTotal = price * qty;
    total += itemTotal;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>₵${price}</td>
      <td>${qty}</td>
      <td>₵${itemTotal}</td>
      <td><button class="removeBtn">Remove</button></td>
    `;

    // Remove button
    row.querySelector(".removeBtn").addEventListener("click", () => {
      removeFromCart(item.name);
    });

    tableBody.appendChild(row);
  });

  totalElem.textContent = `Total: ₵${total}`;
}

// --- Add item to cart ---
export function addToCart(item) {
  const existing = cart.find(i => i.name === item.name);
  if (existing) {
    existing.qty += Number(item.qty);
  } else {
    cart.push({ ...item, qty: Number(item.qty) });
  }
  saveCart();
  renderCart();
}

// --- Remove item from cart ---
export function removeFromCart(itemName) {
  cart = cart.filter(i => i.name !== itemName);
  saveCart();
  renderCart();
}

// --- Clear cart ---
export function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

