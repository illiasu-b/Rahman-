import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { startPayment } from "./payment.js";

const orderForm = document.getElementById("orderForm");
const payNowBtn = document.getElementById("payNowBtn");
const cartBadge = document.getElementById("cartBadge");

// ======================
// GET CART (always fresh)
// ======================
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

// ======================
// CUSTOMER INFO
// ======================
function getCustomerInfo() {
  const name = document.getElementById("name")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const address = document.getElementById("address")?.value.trim();
  const email = document.getElementById("email")?.value.trim();

  if (!name || !phone || !address || !email) {
    alert("Please fill all fields ❌");
    return null;
  }

  return { name, phone, address, email };
}

// ======================
// CART BADGE
// ======================
function updateCartBadge() {
  if (!cartBadge) return;

  const cart = getCart();
  const itemCount = cart.reduce((sum, i) => sum + Number(i.qty), 0);

  cartBadge.textContent = itemCount;
}

// ======================
// CALCULATE TOTAL
// ======================
function getTotal(cart) {
  return cart.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);
}

// ======================
// REDUCE STOCK (SAFE)
// ======================
async function reduceStock(cartItems) {
  for (const item of cartItems) {
    const productRef = doc(db, "products", item.id);

    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        throw new Error(`Product not found: ${item.name}`);
      }

      const currentStock = productDoc.data().stock ?? 0;

      if (currentStock < item.qty) {
        throw new Error(`Not enough stock for ${item.name}`);
      }

      transaction.update(productRef, {
        stock: currentStock - item.qty
      });
    });
  }
}

// ======================
// RESTORE STOCK (rollback)
// ======================
async function restoreStock(cartItems) {
  for (const item of cartItems) {
    const productRef = doc(db, "products", item.id);

    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) return;

      const currentStock = productDoc.data().stock ?? 0;

      transaction.update(productRef, {
        stock: currentStock + item.qty
      });
    });
  }
}

// ======================
// PAY NOW FLOW
// ======================
if (payNowBtn) {
  payNowBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const cart = getCart();
    if (cart.length === 0) return alert("Cart is empty ❌");

    const customer = getCustomerInfo();
    if (!customer) return;

    startPayment(customer, async (paymentReference) => {
      const cart = getCart(); // refresh before processing

      try {
        const total = getTotal(cart);

        // 1️⃣ Save order FIRST (safer flow)
        await addDoc(collection(db, "orders"), {
          ...customer,
          items: cart,
          total,
          paymentRef: paymentReference,
          status: "Paid",
          createdAt: serverTimestamp()
        });

        // 2️⃣ THEN reduce stock
        await reduceStock(cart);

        // 3️⃣ clear cart
        localStorage.removeItem("cart");

        alert("Payment successful & order saved ✅");

        updateCartBadge();
        orderForm?.reset();

      } catch (err) {
        console.error("Checkout failed:", err);

        alert(err.message || "Checkout failed ❌");
      }
    });
  });
}

// ======================
// PLACE ORDER (PAY LATER)
// ======================
if (orderForm) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cart = getCart();
    if (cart.length === 0) return alert("Cart is empty ❌");

    const customer = getCustomerInfo();
    if (!customer) return;

    try {
      const total = getTotal(cart);

      // Save order first
      await addDoc(collection(db, "orders"), {
        ...customer,
        items: cart,
        total,
        paymentRef: null,
        status: "Pending Payment",
        createdAt: serverTimestamp()
      });

      alert("Order placed successfully ✅");

      localStorage.removeItem("cart");
      updateCartBadge();
      orderForm.reset();

    } catch (err) {
      console.error("Order failed:", err);
      alert(err.message || "Failed to place order ❌");
    }
  });
}

// ======================
// INIT
// ======================
updateCartBadge();