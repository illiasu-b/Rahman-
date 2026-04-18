const cartTable = document.getElementById("cartTable");
const totalItemsEl = document.getElementById("totalItems");
const totalPriceEl = document.getElementById("cartTotal");

// ======================
// GET CART (always fresh)
// ======================
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

// ======================
// SAVE CART
// ======================
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// ======================
// RENDER CART
// ======================
function renderCart() {
  if (!cartTable) return;

  const cart = getCart();

  cartTable.innerHTML = "";

  let totalItems = 0;
  let totalPrice = 0;

  cart.forEach((item, index) => {

    const qty = Number(item.qty || 1);
    const price = Number(item.price || 0);

    totalItems += qty;
    totalPrice += price * qty;

    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <div class="cart-name">${item.name}</div>

      <div class="cart-price">₵${price}</div>

      <div class="cart-qty">
        ${qty} <!-- ✅ ONLY NUMBER, NO TEXT -->
      </div>

      
      <button class="remove-btn" onclick="removeItem(${index})">❌</button>
    `;

    cartTable.appendChild(div);
  });

  if (totalItemsEl) totalItemsEl.textContent = totalItems;
  if (totalPriceEl) totalPriceEl.textContent = totalPrice;

  saveCart(cart);
}

// ======================
// UPDATE QUANTITY
// ======================
window.updateQty = (index, value) => {
  const cart = getCart();

  cart[index].qty = Number(value);

  saveCart(cart);
  renderCart();
};

// ======================
// REMOVE ITEM
// ======================
window.removeItem = (index) => {
  const cart = getCart();

  cart.splice(index, 1);

  saveCart(cart);
  renderCart();
};

// ======================
// INIT
// ======================
renderCart();