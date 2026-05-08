
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

await setPersistence(auth, browserLocalPersistence);

// ✅ ADD IT RIGHT HERE ↓
export async function registerAsSeller(user, sellerInfo) {
  await setDoc(doc(db, "users", user.uid), {
    role: "seller",
    firstName: sellerInfo.firstName || "",
    lastName: sellerInfo.lastName || "",
    storeName: sellerInfo.storeName || "",
    email: user.email
  }, { merge: true });

  await setDoc(doc(db, "sellers", user.uid), {
    uid: user.uid,
    shopName: sellerInfo.storeName || "",
    email: user.email,
    createdAt: new Date()
  });
}

// ── STATE ──────────────────────────────────────────────────────
let currentSeller = null;   // ← your existing code continues here
let allProducts   = [];
  // ── HELPERS ───────────────────────────────────────────────────
  function showMsg(id, text, ok) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    el.style.background = ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
    el.style.color  = ok ? "#22c55e" : "#ef4444";
    el.style.border = `1px solid ${ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`;
    el.style.borderRadius = "8px";
    el.style.padding = "10px 14px";
    setTimeout(() => { el.style.display = "none"; }, 4000);
  }

  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "product_upload");
    const res  = await fetch("https://api.cloudinary.com/v1_1/dw3h0amnh/image/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
  }

  onAuthStateChanged(auth, async (user) => {

  const overlay = document.getElementById("loadingOverlay");

  try {

    // Wait for Firebase auth
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // Get user document
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // No user document
    if (!userSnap.exists()) {

      console.error("User document missing");

      alert("Account data not found.");

      await signOut(auth);

      window.location.href = "index.html";
      return;
    }

    const userData = userSnap.data();

    console.log("USER DATA:", userData);

    // Seller role check
    if (userData.role !== "seller") {

      alert("Access denied. This area is for sellers only. ❌");

      await signOut(auth);

      window.location.href = "index.html";

      return;
    }

    // SUCCESS
    currentSeller = {
      uid: user.uid,
      ...userData
    };

    console.log("Seller verified ✅");

    // Populate UI
    const firstName = userData.firstName || user.email.split("@")[0];
    const lastName  = userData.lastName || "";

    document.getElementById("sellerName").textContent = firstName;

    document.getElementById("profileFullName").textContent =
      `${firstName} ${lastName}`.trim();

    document.getElementById("profileEmail").textContent =
      user.email;

    document.getElementById("profileFirst").value =
      firstName;

    document.getElementById("profileLast").value =
      lastName;

    document.getElementById("profileStore").value =
      userData.storeName || "";

    document.getElementById("profilePhone").value =
      userData.phone || "";

    document.getElementById("profileBio").value =
      userData.bio || "";

    // Load seller products
    loadSellerProducts(user.uid);

    // Categories
    populateCategoryDropdown();

  } catch (err) {

    console.error("SELLER AUTH ERROR:", err);

    alert("Failed to verify seller account.");

    window.location.href = "index.html";

  } finally {

    if (overlay) {
      overlay.style.opacity = "0";

      setTimeout(() => {
        overlay.style.display = "none";
      }, 400);
    }
  }
});
  // ── LOAD PRODUCTS ─────────────────────────────────────────────
  function loadSellerProducts(uid) {
    const q = query(collection(db, "products"), where("sellerUid", "==", uid));

    onSnapshot(q, (snapshot) => {
      allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProductTable(allProducts);
      renderRecentProducts(allProducts);
      updateStats(allProducts);
    });
  }

  function renderProductTable(products) {
    const tbody = document.getElementById("sellerProductTable");
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-box-open"></i><p>No products yet. Add your first product!</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          ${p.imageURL && p.imageURL !== "images/no-image.png"
            ? `<img src="${p.imageURL}" class="product-thumb">`
            : `<div class="product-thumb-placeholder"><i class="fas fa-image"></i></div>`
          }
        </td>
        <td style="font-weight:500;">${p.name}</td>
        <td>
          <span class="badge ${p.category === 'promo' ? 'badge-promo' : ''}" style="${p.category !== 'promo' ? 'background:rgba(255,255,255,0.06);color:var(--muted);' : ''}">
            ${p.category || '—'}
          </span>
        </td>
        <td>${p.currency || 'GHS'} ${Number(p.price).toFixed(2)}</td>
        <td>
          <span class="badge ${p.stock < 2 ? 'badge-low' : 'badge-stock'}">
            ${p.stock < 2 ? '⚠ ' : ''}${p.stock}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="Edit" onclick="openEditModal('${p.id}')"><i class="fas fa-pen"></i></button>
            <button class="btn-icon del" title="Delete" onclick="confirmDelete('${p.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderRecentProducts(products) {
    const tbody = document.getElementById("recentProductsTable");
    if (!tbody) return;
    const recent = [...products].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-box-open"></i><p>No products yet</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = recent.map(p => `
      <tr>
        <td>${p.imageURL && p.imageURL !== "images/no-image.png" ? `<img src="${p.imageURL}" class="product-thumb">` : `<div class="product-thumb-placeholder"><i class="fas fa-image"></i></div>`}</td>
        <td style="font-weight:500;">${p.name}</td>
        <td><span style="color:var(--muted);font-size:0.82rem;">${p.category || '—'}</span></td>
        <td>${p.currency || 'GHS'} ${Number(p.price).toFixed(2)}</td>
        <td><span class="badge ${p.stock < 2 ? 'badge-low' : 'badge-stock'}">${p.stock}</span></td>
      </tr>
    `).join("");
  }

  function updateStats(products) {
    document.getElementById("statTotal").textContent   = products.length;
    document.getElementById("statInStock").textContent = products.filter(p => p.stock > 0).length;
    document.getElementById("statLow").textContent     = products.filter(p => p.stock < 2).length;
    document.getElementById("statPromo").textContent   = products.filter(p => p.category === "promo").length;
  }

  // ── CATEGORIES ────────────────────────────────────────────────
  async function populateCategoryDropdown() {
    const select = document.getElementById("sCategory");
    if (!select) return;
    try {
      const snapshot = await getDocs(collection(db, "categories"));
      select.innerHTML = `<option value="" disabled selected>-- Select Category --</option>`;
      snapshot.forEach(d => {
        const cat    = d.data();
        const option = document.createElement("option");
        option.value = cat.slug;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  // ── ADD PRODUCT ───────────────────────────────────────────────
  document.getElementById("sellerProductForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentSeller) return;

    const btn      = document.getElementById("sSubmitBtn");
    const name     = document.getElementById("sName").value.trim();
    const price    = document.getElementById("sPrice").value;
    const stock    = document.getElementById("sStock").value;
    const currency = document.getElementById("sCurrency").value;
    const category = document.getElementById("sCategory").value.trim().toLowerCase();
    const isPromo  = document.getElementById("sIsPromo").checked;
    const discount = document.getElementById("sDiscount").value || 0;
    const cartLink = document.getElementById("sCartLink").value.trim() || "shop.html";
    const file     = document.getElementById("sImageFile").files[0];

    if (!name || !price || !stock || !category) {
      showMsg("sProductMsg", "Please fill in all fields including category.", false);
      return;
    }

    btn.disabled     = true;
    btn.textContent  = "Uploading…";

    let imageURL = "images/no-image.png";
    try {
      if (file) imageURL = await uploadToCloudinary(file) || imageURL;
    } catch { /* keep default */ }

    try {
      const collectionName = (category === "promo" || isPromo) ? "promotions" : "products";
      const productData = {
        name,
        price:      Number(price),
        stock:      Number(stock),
        currency:   currency || "GHS",
        category,
        imageURL,
        sellerUid:  currentSeller.uid,
        sellerName: `${currentSeller.firstName || ""} ${currentSeller.lastName || ""}`.trim(),
        createdAt:  new Date()
      };
      if (isPromo) {
        productData.discount = Number(discount);
        productData.cartLink = cartLink;
        productData.active   = true;
      }

      await addDoc(collection(db, collectionName), productData);
      showMsg("sProductMsg", "Product added successfully ✅", true);
      e.target.reset();
      document.getElementById("sImagePreview").style.display = "none";
    } catch (err) {
      console.error(err);
      showMsg("sProductMsg", "Failed to add product ❌", false);
    } finally {
      btn.disabled    = false;
      btn.innerHTML   = '<i class="fas fa-plus"></i> Add Product';
    }
  });

  // ── EDIT MODAL ────────────────────────────────────────────────
  window.openEditModal = (id) => {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById("editProductId").value   = id;
    document.getElementById("editName").value        = product.name;
    document.getElementById("editPrice").value       = product.price;
    document.getElementById("editStock").value       = product.stock;
    document.getElementById("editCurrency").value    = product.currency || "GHS";
    document.getElementById("editCategory").value    = product.category || "";

    document.getElementById("editModal").classList.add("open");
  };

  window.closeEditModal = () => {
    document.getElementById("editModal").classList.remove("open");
  };

  window.saveEditProduct = async () => {
    if (!currentSeller) return;

    const id       = document.getElementById("editProductId").value;
    const product  = allProducts.find(p => p.id === id);
    if (!product) return;

    // Security: must belong to current seller
    if (product.sellerUid !== currentSeller.uid) {
      showMsg("editMsg", "Access denied ❌", false);
      return;
    }

    const newName     = document.getElementById("editName").value.trim();
    const newPrice    = document.getElementById("editPrice").value;
    const newStock    = document.getElementById("editStock").value;
    const newCurrency = document.getElementById("editCurrency").value;
    const newCategory = document.getElementById("editCategory").value.trim().toLowerCase();

    if (!newName || !newPrice || !newStock) {
      showMsg("editMsg", "Please fill in all fields.", false);
      return;
    }

    try {
      await updateDoc(doc(db, "products", id), {
        name:     newName,
        price:    Number(newPrice),
        stock:    Number(newStock),
        currency: newCurrency,
        category: newCategory
      });
      showMsg("editMsg", "Product updated ✅", true);
      setTimeout(closeEditModal, 1200);
    } catch (err) {
      console.error(err);
      showMsg("editMsg", "Update failed ❌", false);
    }
  };

  // ── DELETE ────────────────────────────────────────────────────
  window.confirmDelete = async (id) => {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    if (product.sellerUid !== currentSeller.uid) {
      alert("Access denied ❌");
      return;
    }

    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err) {
      console.error(err);
      alert("Delete failed ❌");
    }
  };

  // ── SAVE PROFILE ──────────────────────────────────────────────
  window.saveProfile = async () => {
    if (!currentSeller) return;

    const firstName = document.getElementById("profileFirst").value.trim();
    const lastName  = document.getElementById("profileLast").value.trim();
    const storeName = document.getElementById("profileStore").value.trim();
    const phone     = document.getElementById("profilePhone").value.trim();
    const bio       = document.getElementById("profileBio").value.trim();

    try {
      await setDoc(doc(db, "users", currentSeller.uid), {
        firstName, lastName, storeName, phone, bio
      }, { merge: true });

      await updateProfile(auth.currentUser, { displayName: `${firstName} ${lastName}` });
      document.getElementById("profileFullName").textContent = `${firstName} ${lastName}`.trim();
      document.getElementById("sellerName").textContent      = firstName;
      showMsg("profileMsg", "Profile saved ✅", true);
    } catch (err) {
      console.error(err);
      showMsg("profileMsg", "Failed to save ❌", false);
    }
  };

  // ── AVATAR UPLOAD ─────────────────────────────────────────────
  window.uploadProfileAvatar = async (input) => {
    const file = input.files[0];
    if (!file || !currentSeller) return;

    const bigAv    = document.getElementById("profileAvatarBig");
    const sidebarAv = document.getElementById("sidebarAvatar");
    bigAv.innerHTML = `<div class="spinner" style="width:30px;height:30px;border-width:2px;"></div>`;

    try {
      const photoURL = await uploadToCloudinary(file);
      await setDoc(doc(db, "users", currentSeller.uid), { photoURL }, { merge: true });
      bigAv.innerHTML    = `<img src="${photoURL}">`;
      sidebarAv.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } catch (err) {
      console.error(err);
      bigAv.textContent = "❌";
    }
  };

  // ── LOGOUT ────────────────────────────────────────────────────
  document.getElementById("sellerLogoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "admin.html";
  });


  // ── PANEL SWITCHING ───────────────────────────────────────────
  const panelTitles = {
    overview: "Overview",
    products: "My Products",
    add:      "Add Product",
    profile:  "My Profile"
  };

  window.showPanel = (name) => {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-links a").forEach(a => a.classList.remove("active"));
    document.getElementById(`panel-${name}`).classList.add("active");
    document.getElementById(`nav-${name}`).classList.add("active");
    document.getElementById("topbarTitle").textContent = panelTitles[name] || name;
    // Close sidebar on mobile
    if (window.innerWidth < 900) document.getElementById("sidebar").classList.remove("open");
  };

  // ── PROMO TOGGLE ──────────────────────────────────────────────
  window.togglePromo = (cb) => {
    const extras = document.querySelectorAll(".promo-extra");
    extras.forEach(el => el.classList.toggle("show", cb.checked));
  };

  // ── IMAGE PREVIEW ─────────────────────────────────────────────
  window.previewImage = (input) => {
    const preview = document.getElementById("sImagePreview");
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        preview.src = e.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(input.files[0]);
    }
  };

  // ── HAMBURGER ─────────────────────────────────────────────────
  document.getElementById("hamburger").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // ── CLOSE MODAL ON BACKDROP ───────────────────────────────────
  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("editModal")) closeEditModal();
  });
