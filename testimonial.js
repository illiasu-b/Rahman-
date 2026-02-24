
let selectedRating = 0;
const stars = document.querySelectorAll("#starRating span");
const container = document.getElementById("testimonialsContainer");

// Star click
stars.forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = star.getAttribute("data-value");
    stars.forEach(s => s.classList.remove("active"));
    for (let i = 0; i < selectedRating; i++) {
      stars[i].classList.add("active");
    }
  });
});

// Load saved reviews
window.addEventListener("load", () => {
  const savedReviews = JSON.parse(localStorage.getItem("reviews")) || [];
  savedReviews.forEach(review => addReview(review));
});

// Submit review
document.getElementById("submitReview").addEventListener("click", () => {
  const name = document.getElementById("customerName").value;
  const text = document.getElementById("customerReview").value;

  if (!name || !text || selectedRating == 0) {
    alert("Please complete all fields and select rating.");
    return;
  }

  const review = {
    name,
    text,
    rating: selectedRating
  };

  addReview(review);

  // Save to localStorage
  const savedReviews = JSON.parse(localStorage.getItem("reviews")) || [];
  savedReviews.push(review);
  localStorage.setItem("reviews", JSON.stringify(savedReviews));

  // Reset form
  document.getElementById("customerName").value = "";
  document.getElementById("customerReview").value = "";
  stars.forEach(s => s.classList.remove("active"));
  selectedRating = 0;
});

function addReview(review) {
  const card = document.createElement("div");
  card.classList.add("testimonial-card");

  let starIcons = "";
  for (let i = 0; i < review.rating; i++) {
    starIcons += "★";
  }

  card.innerHTML = `
    <div class="stars">${starIcons}</div>
    <h4>${review.name}</h4>
    <p>${review.text}</p>
  `;

  container.prepend(card);
}
