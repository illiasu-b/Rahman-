import { db } from "./firebase.js";
import { collection, query, where, getDocs, orderBy } 
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const trackBtn = document.getElementById("trackBtn");
const ordersList = document.getElementById("ordersList");

trackBtn.addEventListener("click", async () => {
  const emailInput = document.getElementById("orderEmail");
  const email = emailInput?.value.trim();
  if (!email) {
    alert("Please enter your email ❌");
    return;
  }

  try {
    const q = query(
      collection(db, "orders"),
      where("email", "==", email),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      ordersList.innerHTML = "<p>No orders found ❌</p>";
      return;
    }

    let html = "<ul>";
    snapshot.forEach(doc => {
      const order = doc.data();

      const paymentStatus = order.status || "Pending Payment";
      const deliveryStatus = order.deliveryStatus || "Pending Delivery";

      html += `
        <li>
          <strong>Order ID:</strong> ${doc.id}<br>

          <strong>Payment:</strong> 
          <span class="${paymentStatus === "Paid" ? "paid" : "pending"}">
            ${paymentStatus}
          </span><br>

          <strong>Delivery:</strong> 
          <span class="${deliveryStatus === "Delivered" ? "delivered" : "pending"}">
            ${deliveryStatus}
          </span><br>

          <strong>Total:</strong> ₵${order.total}<br>

          <strong>Items:</strong>
          <ul>
            ${order.items.map(i => `<li>${i.name} x${i.qty}</li>`).join("")}
          </ul>

          <small>Placed: ${order.createdAt?.toDate().toLocaleString()}</small>
        </li>
      `;
    });
    html += "</ul>";

    ordersList.innerHTML = html;

  } catch (err) {
    console.error("Order tracking failed:", err);
    ordersList.innerHTML = "<p>Error fetching orders ❌</p>";
  }
});
