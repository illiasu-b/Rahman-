import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


// ================= CLOUDINARY UPLOAD =================
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "product_upload");

  const res = await fetch("https://api.cloudinary.com/v1_1/dw3h0amnh/image/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}


// ================= AUTH CHECK =================
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

  await loadOrders();
  await loadSubscribers();
  initStockManager();
  initAnalytics();
  initCategoryManager();   // ✅ NEW: Load category manager
  populateCategoryDropdown(); // ✅ NEW: Fill the category <select> in the add-product form
});


// ================= CATEGORY MANAGER =================
// Categories are stored in Firestore under a "categories" collection.
// Each doc: { name: "Electronics", slug: "electronics", createdAt: Date }

function initCategoryManager() {
  const catForm = document.getElementById("categoryForm");
  const catList = document.getElementById("categoryList");

  if (!catForm || !catList) return;

  // Listen for real-time category updates
  onSnapshot(collection(db, "categories"), (snapshot) => {
    catList.innerHTML = "";

    if (snapshot.empty) {
      catList.innerHTML = `<p style="color:#888;">No categories yet. Add one above.</p>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const cat = { id: docSnap.id, ...docSnap.data() };

      const item = document.createElement("div");
      item.style.cssText = "display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #eee;";
      item.innerHTML = `
        <span style="flex:1;font-weight:500;">${cat.name}</span>
        <span style="color:#888;font-size:13px;">${cat.slug}</span>
        <button onclick="deleteCategory('${cat.id}', '${cat.slug}')" style="color:red;background:none;border:none;cursor:pointer;">🗑 Delete</button>
      `;
      catList.appendChild(item);
    });

    // After updating the list, also refresh the dropdown in the product form
    populateCategoryDropdown();
  });

  // Handle add category form submit
  catForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("catName");
    const name = nameInput?.value?.trim();

    if (!name) return alert("Enter a category name");

    const slug = name.toLowerCase().replace(/\s+/g, "-"); // e.g. "New Arrivals" → "new-arrivals"

    try {
      // Use slug as the document ID so it's always unique
      await setDoc(doc(db, "categories", slug), {
        name,
        slug,
        createdAt: new Date()
      });

      alert(`Category "${name}" added ✅`);
      catForm.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to add category ❌");
    }
  });
}


// ================= DELETE CATEGORY =================
window.deleteCategory = async (id, slug) => {
  if (!confirm(`Delete category "${slug}"? Products in this category will NOT be deleted but will have no category.`)) return;

  try {
    await deleteDoc(doc(db, "categories", id));
    alert("Category deleted ✅");
  } catch (err) {
    console.error(err);
    alert("Failed to delete category ❌");
  }
};


// ================= POPULATE CATEGORY DROPDOWN =================
// Reads from Firestore "categories" and fills the <select id="category"> in the product form
async function populateCategoryDropdown() {
  const select = document.getElementById("category");
  if (!select) return;

  try {
    const snapshot = await getDocs(collection(db, "categories"));

    // Keep any non-option placeholder
    select.innerHTML = `<option value="" disabled selected>-- Select Category --</option>`;

    if (snapshot.empty) {
      select.innerHTML += `<option disabled>No categories found. Add one first.</option>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const cat = docSnap.data();
      const option = document.createElement("option");
      option.value = cat.slug;         // stored value e.g. "electronics"
      option.textContent = cat.name;   // displayed text e.g. "Electronics"
      select.appendChild(option);
    });

  } catch (err) {
    console.error("Failed to load categories for dropdown:", err);
  }
}


// ================= ADD PRODUCT =================
// ================= ADD PRODUCT =================
// Replace your existing productForm submit handler in dashboard.js with this

document.addEventListener("DOMContentLoaded", () => {
  const productForm = document.getElementById("productForm");

  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name     = document.getElementById("name")?.value?.trim();
      const price    = document.getElementById("price")?.value;
      const stock    = document.getElementById("stock")?.value;
      const currency = document.getElementById("currency")?.value;
      const category = document.getElementById("category")?.value?.trim().toLowerCase();
      const discount = document.getElementById("discount")?.value || 0;   // ✅ NEW
      const cartLink = document.getElementById("cartLink")?.value?.trim() || "shop.html"; // ✅ NEW

      if (!name || !price || !stock || !category) {
        alert("Please fill all fields including category");
        return;
      }

      const file = document.getElementById("imageFile")?.files[0];
      let imageURL = "images/no-image.png";

      try {
        if (file) {
          imageURL = await uploadToCloudinary(file) || imageURL;
        }
      } catch (err) {
        console.error("Image upload failed:", err);
      }

      try {
        if (category === "promo") {
          // ✅ Promo products go to "promotions" collection
          await addDoc(collection(db, "promotions"), {
            name,
            price:     Number(price),
            stock:     Number(stock),
            currency:  currency || "GHS",
            category,
            imageURL,
            discount:  Number(discount),  // ✅ NEW: e.g. 20 means 20% off
            cartLink,                      // ✅ NEW: link for Add to Cart button
            active:    true,
            createdAt: new Date()
          });

          console.log(`✅ Promo product "${name}" saved to promotions collection`);

        } else {
          // ✅ All other products go to "products" collection
          await addDoc(collection(db, "products"), {
            name,
            price:     Number(price),
            stock:     Number(stock),
            currency:  currency || "GHS",
            category,
            imageURL,
            createdAt: new Date()
          });

          console.log(`✅ Product "${name}" saved to products collection with category: ${category}`);
        }

        alert("Product added ✅");
        productForm.reset();
        document.getElementById("category").value = "";

      } catch (err) {
        console.error(err);
        alert("Error adding product ❌");
      }
    });
  }
});

// ================= STOCK MANAGER =================
function initStockManager() {
  const lowStockDiv    = document.getElementById("lowStockAlerts");
  const stockManagerDiv = document.getElementById("stockManager");

  if (!lowStockDiv || !stockManagerDiv) return;

  onSnapshot(collection(db, "products"), (snapshot) => {
    lowStockDiv.innerHTML = "";

    stockManagerDiv.innerHTML = `
      <table border="1" style="width:100%;border-collapse:collapse;">
        <tr>
          <th>Product</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </table>`;

    const table = stockManagerDiv.querySelector("table");

    snapshot.forEach((docSnap) => {
      const p = { id: docSnap.id, ...docSnap.data() };

      if (p.stock < 2) {
        const warn = document.createElement("div");
        warn.textContent = `⚠ Low Stock: ${p.name} (${p.stock})`;
        warn.style.color = "red";
        lowStockDiv.appendChild(warn);
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.category || "—"}</td>
        <td>${p.currency || "₵"} ${p.price}</td>
        <td><input type="number" id="stock-${p.id}" value="${p.stock}" min="0"></td>
        <td>
          <button onclick="updateStock('${p.id}')">Update</button>
          <button onclick="editProduct('${p.id}')">Edit</button>
          <button onclick="deleteProduct('${p.id}')">Delete</button>
        </td>
      `;

      table.appendChild(row);
    });
  });
}


// ================= UPDATE STOCK =================
window.updateStock = async (id) => {
  const input = document.getElementById(`stock-${id}`);
  if (!input) return;

  await updateDoc(doc(db, "products", id), {
    stock: Number(input.value)
  });

  alert("Stock updated ✅");
};


// ================= EDIT PRODUCT =================
window.editProduct = async (id) => {
  try {
    const ref  = doc(db, "products", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert("Product not found ❌");

    const data = snap.data();

    // Load current categories from Firestore for the prompt hint
    const catSnap = await getDocs(collection(db, "categories"));
    const catSlugs = catSnap.docs.map(d => d.data().slug).join(", ");

    const newName     = prompt("Edit name:", data.name);
    const newPrice    = prompt("Edit price:", data.price);
    const newStock    = prompt("Edit stock:", data.stock);
    const newCurrency = prompt("Currency:", data.currency || "GHS");
    const newCategory = prompt(
      `Category slug (available: ${catSlugs}):`,
      data.category || ""
    )?.trim().toLowerCase();

    if (!newName || !newPrice || !newStock) return;

    await updateDoc(ref, {
      name:     newName,
      price:    Number(newPrice),
      stock:    Number(newStock),
      currency: newCurrency,
      category: newCategory || data.category || "general"
    });

    alert("Product updated ✅");

  } catch (err) {
    console.error(err);
  }
};


// ================= DELETE PRODUCT =================
window.deleteProduct = async (id) => {
  if (!confirm("Delete this product?")) return;
  await deleteDoc(doc(db, "products", id));
  alert("Deleted 🗑️");
};


// ================= LOAD ORDERS =================
async function loadOrders() {
  const ordersTable = document.getElementById("orders-table");
  if (!ordersTable) return;

  ordersTable.innerHTML = "";

  try {
    const q        = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      ordersTable.innerHTML = `<tr><td colspan="10">No orders yet</td></tr>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const order = docSnap.data();

      const itemsList = Array.isArray(order.items)
        ? order.items.map(i => `${i.name} x${i.qty}`).join("<br>")
        : "No items";

      const date          = order.createdAt?.toDate?.();
      const formattedDate = date ? date.toLocaleString("en-GH") : "N/A";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="orderCheckbox" value="${docSnap.id}"></td>
        <td>${order.name || "N/A"}</td>
        <td>${order.phone || "N/A"}</td>
        <td>${order.email || "N/A"}</td>
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
    ordersTable.innerHTML = `<tr><td colspan="10">Failed to load ❌</td></tr>`;
  }
}


// ================= LOAD SUBSCRIBERS =================
async function loadSubscribers() {
  const subscribersTable = document.getElementById("subscribersTable");
  if (!subscribersTable) return;

  subscribersTable.innerHTML = "";

  try {
    const q        = query(collection(db, "subscribers"), orderBy("subscribedAt", "desc"));
    const snapshot = await getDocs(q);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const row  = document.createElement("tr");
      row.innerHTML = `
        <td>${data.name || "—"}</td>
        <td>${data.email || "N/A"}</td>
        <td>${data.subscribedAt?.toDate?.()?.toLocaleString() || "N/A"}</td>
      `;
      subscribersTable.appendChild(row);
    });

  } catch (err) {
    console.error(err);
  }
}


// ================= LOGOUT =================
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "admin.html";
    });
  }
});


// ================= SELECT ALL ORDERS =================
document.addEventListener("DOMContentLoaded", () => {
  const selectAll = document.getElementById("selectAll");
  if (selectAll) {
    selectAll.addEventListener("change", () => {
      document.querySelectorAll(".orderCheckbox")
        .forEach(cb => cb.checked = selectAll.checked);
    });
  }
});


// ================= DELETE SELECTED ORDERS =================
document.addEventListener("DOMContentLoaded", () => {
  const deleteBtn = document.getElementById("deleteSelectedBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const selected = document.querySelectorAll(".orderCheckbox:checked");
      if (!selected.length) return alert("No orders selected ❌");
      if (!confirm(`Delete ${selected.length} orders?`)) return;

      for (const cb of selected) {
        await deleteDoc(doc(db, "orders", cb.value));
      }

      alert("Deleted successfully ✅");
      loadOrders();
    });
  }
});


// ================= ANALYTICS =================
function initAnalytics() {
  const analyticsDiv = document.getElementById("analytics");
  if (!analyticsDiv) return;

  onSnapshot(collection(db, "orders"), (snapshot) => {
    let total = 0;
    let count = snapshot.size;

    snapshot.forEach((docSnap) => {
      const o = docSnap.data();
      total += o.total || 0;
    });

    analyticsDiv.innerHTML = `
      <h3>Sales Analytics</h3>
      <p>Total Revenue: ₵${total}</p>
      <p>Total Orders: ${count}</p>
    `;
  });
}


// ================= COLLAPSE PANEL =================
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn    = document.getElementById("toggleAdminPanel");
  const adminContent = document.getElementById("adminContent");

  if (toggleBtn && adminContent) {
    toggleBtn.addEventListener("click", () => {
      adminContent.style.display =
        adminContent.style.display === "none" ? "block" : "none";
    });
  }
});


// ================= LOAD PRODUCTS BY CATEGORY =================
// Call this on any page that wants to display products filtered by category.
// Example: loadProductsByCategory("promo", "promoTable")
export async function loadProductsByCategory(categorySlug, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  onSnapshot(collection(db, "products"), (snapshot) => {
    table.innerHTML = "";

    const filtered = snapshot.docs.filter(
      (d) => d.data().category?.trim().toLowerCase() === categorySlug.toLowerCase()
    );

    if (filtered.length === 0) {
      table.innerHTML = `<tr><td colspan="4">No products in "${categorySlug}"</td></tr>`;
      return;
    }

    filtered.forEach((docSnap) => {
      const p   = docSnap.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.currency || "GHS"} ${p.price}</td>
        <td>${p.stock}</td>
        <td>${p.category}</td>
      `;
      table.appendChild(row);
    });
  });
}