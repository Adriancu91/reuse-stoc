var C = window.CONFIG;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function price(v) {
  v = String(v == null ? "" : v).trim();
  return v ? v + " " + C.currency : "Preț la cerere";
}

function fmtDate(ts) {
  var d = new Date(ts);
  return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
}

// 0722 123 456 / +40722123456 / 0040722... -> 40722123456
function waNumber(s) {
  s = String(s || "").replace(/\D/g, "");
  if (s.indexOf("00") === 0) s = s.slice(2);
  if (s.charAt(0) === "0") s = "40" + s.slice(1);
  return s;
}

function loadProducts() {
  return fetch("products.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .catch(function () { return []; });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-site]").forEach(function (el) { el.textContent = C.siteName; });
  if (!document.title) document.title = C.siteName;
});
