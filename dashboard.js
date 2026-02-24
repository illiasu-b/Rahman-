import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM
const ordersTable = document.getElementById("orders-table");
const logoutBtn = document.getElementById("logoutBtn");
const exportBtn = document.getElementById("exportSubs");
const subscribersTable = document.getElementById("subscribersTable");

// NEW DOM ELEMENTS FOR STOCK & ANALYTICS
const lowStockDiv = document.getElementById("lowStockAlerts"); // <div> for low stock alerts
const stockManagerDiv = document.getElementById("stockManager"); // <div> for stock manager table
const analyticsDiv = document.getElementById("analytics"); // <div> for sales analytics

// ===========================
// AUTH CHECK
// ===========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "admin.html";
    return;
  }

  const adminEmail = "rahman@gmail.com";

  if (user.email !== adminEmail) {
    alert("You are not admin ❌");
    window.location.href = "index.html";
    return;
  }

  // Load everything for admin
  await loadOrders();
  await loadSubscribers();
  await loadPayments();
  initStockManager();
  initAnalytics();
});

// ===========================
// LOGOUT
// ===========================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "admin.html";
  });
}

// ===========================
// LOAD ORDERS
// ===========================
async function loadOrders() {
  if (!ordersTable) return;

  ordersTable.innerHTML = "";

  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      ordersTable.innerHTML = `<tr><td colspan="9">No orders yet</td></tr>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const order = docSnap.data();

      const itemsList = Array.isArray(order.items)
        ? order.items.map(i => `${i.name} x${i.qty}`).join("<br>")
        : "No items";

      const date = order.createdAt?.toDate();
      const formattedDate = date ? date.toLocaleString("en-GH") : "N/A";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${order.name || "N/A"}</td>
        <td><a href="tel:${order.phone || ''}">${order.phone || "N/A"}</a></td>
        <td><a href="mailto:${order.email || ''}?subject=Order ${docSnap.id}">${order.email || "N/A"}</a></td>
        <td>${order.address || "N/A"}</td>
        <td>${itemsList}</td>
        <td>₵${order.total || 0}</td>
        <td>${order.status || "Pending Payment"}</td>
        <td>${order.deliveryStatus || "Pending Delivery"}</td>
        <td>${formattedDate}</td>
      `;
      ordersTable.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    ordersTable.innerHTML = `<tr><td colspan="9">Failed to load ❌</td></tr>`;
  }
}

// ===========================
// LOAD SUBSCRIBERS
// ===========================
async function loadSubscribers() {
  if (!subscribersTable) return;

  subscribersTable.innerHTML = "";

  try {
    const q = query(collection(db, "subscribers"), orderBy("subscribedAt", "desc"));
    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
      const data = doc.data();

      const name = data.name || "—";
      const email = data.email || "N/A";
      const date = data.subscribedAt?.toDate ? data.subscribedAt.toDate().toLocaleString() : "N/A";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${name}</td>
        <td><a href="mailto:${email}?subject=Rahma Farms Update">${email}</a></td>
        <td>${date}</td>
      `;

      subscribersTable.appendChild(row);
    });

  } catch (err) {
    console.error("Failed to load subscribers:", err);
    subscribersTable.innerHTML = `<tr><td colspan="3">Failed to load subscribers ❌</td></tr>`;
  }
}

// ===========================
// EXPORT EMAILS
// ===========================
if (exportBtn) {
  exportBtn.addEventListener("click", async () => {
    const snapshot = await getDocs(collection(db, "subscribers"));

    let csv = "Email\n";
    snapshot.forEach(doc => {
      csv += doc.data().email + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "subscribers.csv";
    link.click();
  });
}

// ===========================
// LOAD PAYMENTS
// ===========================
async function loadPayments() {
  try {
    const snapshot = await getDocs(collection(db, "payments"));
    snapshot.forEach(doc => {
      console.log("Payment:", doc.id, doc.data());
    });
  } catch (err) {
    console.error("Payment load error:", err);
  }
}

// ===========================
// STOCK MANAGER & LOW STOCK ALERTS
// ===========================
function initStockManager() {

  if (!lowStockDiv || !stockManagerDiv) return;

  // LIVE LOW STOCK ALERTS
  onSnapshot(collection(db, "products"), snapshot => {

    // LOW STOCK ALERT
    lowStockDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      if (p.stock < 2) {
        const div = document.createElement("div");
        div.textContent = `⚠ Low Stock: ${p.name} only ${p.stock} left!`;
        div.style.color = "red";
        lowStockDiv.appendChild(div);
      }
    });

    // STOCK MANAGER TABLE
    stockManagerDiv.innerHTML = "<table border='1' style='width:100%;text-align:left'><tr><th>Product</th><th>Stock</th><th>Update</th></tr>";
    snapshot.forEach(doc => {
      const p = { id: doc.id, ...doc.data() };
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.name}</td>
        <td><input type="number" id="stock-${p.id}" value="${p.stock}" min="0" style="width:60px"></td>
        <td><button onclick="updateStock('${p.id}')">Update</button></td>
      `;
      stockManagerDiv.querySelector("table").appendChild(row);
    });
  });
}

// UPDATE STOCK FUNCTION
window.updateStock = async (productId) => {
  const input = document.getElementById(`stock-${productId}`);
  if (!input) return;
  const newStock = Number(input.value);
  const productRef = doc(db, "products", productId);
  await updateDoc(productRef, { stock: newStock });
  alert("Stock updated ✅");
};

// ===========================
// SALES ANALYTICS
// ===========================
function initAnalytics() {
  if (!analyticsDiv) return;

  onSnapshot(collection(db, "orders"), snapshot => {
    let totalRevenue = 0;
    let totalOrders = snapshot.size;
    const productSales = {};

    snapshot.forEach(docSnap => {
      const order = docSnap.data();
      totalRevenue += order.total || 0;

      order.items?.forEach(item => {
        if (!productSales[item.name]) productSales[item.name] = 0;
        productSales[item.name] += item.qty;
      });
    });

    analyticsDiv.innerHTML = `
      <h3>Sales Analytics</h3>
      <p>Total Revenue: ₵${totalRevenue}</p>
      <p>Total Orders: ${totalOrders}</p>
      <h4>Best Selling Products:</h4>
      <ul>
        ${Object.entries(productSales).map(([name, qty]) => `<li>${name}: ${qty} sold</li>`).join("")}
      </ul>
    `;
  });
}
// ===========================
// COLLAPSIBLE ADMIN PANEL
// ===========================
const toggleBtn = document.getElementById("toggleAdminPanel");
const adminContent = document.getElementById("adminContent");

if (toggleBtn && adminContent) {
  toggleBtn.addEventListener("click", () => {
    if (adminContent.style.display === "none") {
      adminContent.style.display = "block";
      toggleBtn.textContent = "Hide Admin Panel ⚙️";
    } else {
      adminContent.style.display = "none";
      toggleBtn.textContent = "Show Admin Panel ⚙️";
    }
  });
}