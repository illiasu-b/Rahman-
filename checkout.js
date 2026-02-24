// ✅ PAYSTACK PUBLIC KEY
const PAYSTACK_PUBLIC_KEY = "pk_test_15c9f4dc6fc7acc13d7981c48c8bba1783f62a21";

function payWithPaystack() {
  console.log("PaystackPop:", typeof PaystackPop);

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    alert("Your cart is empty");
    return;
  }

  let email = document.getElementById("email").value;
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let address = document.getElementById("address").value;

  if (!email || !name || !phone || !address) {
    alert("Please fill all fields");
    return;
  }

  let total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: total * 100,
    currency: "GHS",

    callback: function (response) {
      saveOrder(response.reference);
    },

    onClose: function () {
      alert("Payment cancelled");
    }
  });

  handler.openIframe();
}

function saveOrder(reference) {
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const order = {
    id: Date.now(),
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    email: document.getElementById("email").value,
    address: document.getElementById("address").value,
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    paymentRef: reference,
    status: "Paid",
    date: new Date().toLocaleString()
  };

  orders.push(order);
  localStorage.setItem("orders", JSON.stringify(orders));
  localStorage.removeItem("cart");

  alert("Payment successful! Order placed ✅");
  window.location.href = "dashboard.html";
}
