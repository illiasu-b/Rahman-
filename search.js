// search.js
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const container = document.getElementById("productResults");

let debounceTimer;

searchButton.addEventListener("click", searchProducts);

searchInput.addEventListener("keyup", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(searchProducts, 300);
});

async function searchProducts() {
  container.innerHTML = "";
  const queryText = searchInput.value.toLowerCase().trim();

  if (!queryText) return;

  try {
    const snapshot = await getDocs(collection(db, "products"));
    let found = false;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const productId = doc.id;

      const name = (data.name || "").toLowerCase();
      const description = (data.description || "").toLowerCase();

      if (name.includes(queryText) || description.includes(queryText)) {
        found = true;

        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
          <a href="shop.html?id=${productId}" class="product-link">
            <img src="${data.imageURL || 'placeholder.png'}" width="150" alt="${data.name || 'Product'}">
            <h4>${data.name || "Unnamed Product"}</h4>
            <p>₵${data.price || "0.00"}</p>
          </a>
        `;

        container.appendChild(card);
      }
    }

    if (!found) {
      container.innerHTML = "<p>No products found</p>";
    }

  } catch (error) {
    console.error("Error fetching products:", error);
    container.innerHTML = "<p>Failed to load products</p>";
  }
}
