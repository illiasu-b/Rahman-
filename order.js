import { db } from "./firebase.js";
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { cart, renderCart } from "./cart.js";
import { startPayment } from "./payment.js";

const orderForm = document.getElementById("orderForm");
const payNowBtn = document.getElementById("payNowBtn");
const cartBadge = document.getElementById("cartBadge");

// ======================
// VALIDATE CUSTOMER INFO
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
// UPDATE CART BADGE
// ======================
function updateCartBadge() {
  if (!cartBadge) return;
  const itemCount = cart.reduce((sum, i) => sum + Number(i.qty), 0);
  cartBadge.textContent = itemCount;
}

// ======================
// REDUCE STOCK SAFELY
// ======================
async function reduceStock(cartItems) {

  for (const item of cartItems) {

    if (!item.id) {
      throw new Error("Cart item missing product ID.");
    }

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

  console.log("Stock reduced successfully ✅");
}

// ======================
// RESTORE STOCK (if order save fails)
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

  console.log("Stock restored ❗");
}

// ======================
// PAY NOW FLOW
// ======================
if (payNowBtn) {

  payNowBtn.addEventListener("click", (e) => {
    e.preventDefault();

    if (cart.length === 0) return alert("Cart is empty ❌");

    const customer = getCustomerInfo();
    if (!customer) return;

    startPayment(customer, async (paymentReference) => {

      try {

        // 1️⃣ Reduce stock
        await reduceStock(cart);

        // 2️⃣ Save order
        await addDoc(collection(db, "orders"), {
          ...customer,
          items: cart,
          total: cart.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0),
          paymentRef: paymentReference,
          status: "Paid",
          createdAt: serverTimestamp()
        });

        alert("✅ Payment successful & order saved!");

        localStorage.removeItem("cart");
        cart.length = 0;
        renderCart();
        updateCartBadge();
        orderForm?.reset();

      } catch (err) {

        console.error("Checkout failed:", err);

        // If order save fails after stock reduction
        await restoreStock(cart);

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

    if (cart.length === 0) return alert("Cart is empty ❌");

    const customer = getCustomerInfo();
    if (!customer) return;

    try {

      // 1️⃣ Reduce stock
      await reduceStock(cart);

      // 2️⃣ Save order
      await addDoc(collection(db, "orders"), {
        ...customer,
        items: cart,
        total: cart.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0),
        paymentRef: null,
        status: "Pending Payment",
        createdAt: serverTimestamp()
      });

      alert("✅ Order placed! Payment pending.");

      localStorage.removeItem("cart");
      cart.length = 0;
      renderCart();
      updateCartBadge();
      orderForm.reset();

    } catch (err) {

      console.error("Order failed:", err);

      await restoreStock(cart);

      alert(err.message || "Failed to place order ❌");
    }

  });

}

// Initial badge update
updateCartBadge();