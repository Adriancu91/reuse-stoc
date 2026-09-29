// Pagina de admin: citește și scrie products.json + poze direct în repo prin GitHub API.
(function () {
  var LS = "reuse_admin_token";
  var token = "";
  try { token = localStorage.getItem(LS) || ""; } catch (e) {}
  var products = [], sha = null, editing = null;

  // ---- repo detectat automat din adresa github.io (sau din config.js) ----
  var owner = C.githubUser, repo = C.repo, branch = C.branch || "main";
  if ((!owner || !repo) && /\.github\.io$/.test(location.hostname)) {
    owner = owner || location.hostname.split(".")[0];
    var seg = location.pathname.split("/").filter(Boolean)[0];
    repo = repo || (seg && !/\.html$/.test(seg) ? seg : location.hostname);
  }

  var $ = function (id) { return document.getElementById(id); };
  function show(v) { ["vLogin", "vList", "vForm"].forEach(function (x) { $(x).hidden = x !== v; }); $("logout").hidden = v === "vLogin"; window.scrollTo(0, 0); }
  function flash(msg, err) { $("flash").innerHTML = msg ? '<div class="flash' + (err ? " err" : "") + '">' + esc(msg) + "</div>" : ""; }
  function busy(t) { $("busy").hidden = !t; if (t) $("busyText").textContent = t; }
  function raw(path) { return "https://raw.githubusercontent.com/" + owner + "/" + repo + "/" + branch + "/" + path + "?t=" + Date.now(); }

  // ---- base64 cu diacritice ----
  function enc(str) { var b = new TextEncoder().encode(str), s = ""; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function dec(b64) { var s = atob(b64.replace(/\n/g, "")), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return new TextDecoder().decode(a); }

  // ---- GitHub API ----
  function api(path, opt) {
    opt = opt || {};
    opt.headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" };
    if (opt.body) opt.headers["Content-Type"] = "application/json";
    return fetch("https://api.github.com/repos/" + owner + "/" + repo + path, opt).then(function (r) {
      if (r.status === 404 && opt.allow404) return null;
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) {
        var e = new Error(r.status === 401 ? "Token invalid sau expirat." : r.status === 409 || r.status === 422 && /sha/.test(j.message || "") ? "Datele s-au schimbat între timp. Reîncarcă pagina și încearcă din nou." : "Eroare GitHub (" + r.status + "): " + (j.message || ""));
        e.status = r.status; throw e;
      });
      return r.json();
    });
  }
  function getFile(path) { return api("/contents/" + path + "?ref=" + branch + "&t=" + Date.now(), { allow404: true, cache: "no-store" }); }
  function putFile(path, b64, msg, fsha) {
    var body = { message: msg, content: b64, branch: branch }; if (fsha) body.sha = fsha;
    return api("/contents/" + path, { method: "PUT", body: JSON.stringify(body) });
  }
  function delFile(path, msg) {
    return getFile(path).then(function (f) {
      if (!f) return;
      return api("/contents/" + path, { method: "DELETE", body: JSON.stringify({ message: msg, sha: f.sha, branch: branch }) });
    }).catch(function () {});
  }

  function loadAll() {
    return getFile("products.json").then(function (f) {
      products = f ? JSON.parse(dec(f.content) || "[]") : [];
      sha = f ? f.sha : null;
    });
  }
  function saveAll(msg) {
    return putFile("products.json", enc(JSON.stringify(products, null, 2) + "\n"), msg, sha).then(function (r) { sha = r.content.sha; });
  }

  // ---- poze: micșorate în browser la max 1600px, JPEG ----
  function resize(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.onerror = function () { rej(new Error("Nu pot citi poza: " + file.name)); };
      img.src = url;
    });
  }
  function uploadPhotos(pid, files) {
    var paths = [], i = 0;
    function next() {
      if (i >= files.length) return Promise.resolve(paths);
      var n = ++i;
      busy("Se urcă poza " + n + " din " + files.length + "...");
      return resize(files[n - 1]).then(function (b64) {
        var path = "images/" + pid + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
        return putFile(path, b64, "Poză " + pid).then(function () { paths.push(path); return next(); });
      });
    }
    return next();
  }

  // ---- listă ----
  function renderList() {
    products.sort(function (a, b) { return b.created - a.created; });
    $("count").textContent = products.length;
    $("alist").innerHTML = products.length ? products.map(function (p) {
      var q = p.quantity == null ? 1 : p.quantity;
      var img = p.photos && p.photos.length ? '<img src="' + esc(raw(p.photos[0])) + '" alt="">' : '<div class="nophoto">—</div>';
      return '<div class="aitem">' + img + '<div class="grow"><a class="t" href="product.html?id=' + encodeURIComponent(p.id) + '" target="_blank">' + esc(p.title) + '</a>' +
        '<div class="loc">' + esc(price(p.price)) + ' · <span class="' + (q === 0 ? "q0" : "") + '">stoc ' + q + '</span></div>' +
        '<div class="acts" data-id="' + esc(p.id) + '">' +
        '<button class="btn sm ghost" data-a="minus">−1</button><button class="btn sm ghost" data-a="plus">+1</button>' +
        '<button class="btn sm ghost" data-a="edit">Editează</button><button class="btn sm red" data-a="del">Șterge</button></div></div></div>';
    }).join("") : '<p class="empty">Nu ai produse. Apasă „+ Adaugă”.</p>';
  }

  $("alist").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-a]"); if (!b) return;
    var id = b.parentNode.dataset.id, p = products.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var a = b.dataset.a;
    if (a === "edit") return openForm(p);
    if (a === "del") {
      if (!confirm("Ștergi definitiv „" + p.title + "”?")) return;
      busy("Se șterge...");
      products = products.filter(function (x) { return x !== p; });
      return saveAll("Șters: " + p.title).then(function () {
        return (p.photos || []).reduce(function (pr, ph) { return pr.then(function () { return delFile(ph, "Șters poză"); }); }, Promise.resolve());
      }).then(function () { done("Produs șters."); }).catch(fail);
    }
    var q = (p.quantity == null ? 1 : p.quantity) + (a === "plus" ? 1 : -1);
    if (q < 0) return;
    p.quantity = q; busy("Se salvează stocul...");
    saveAll("Stoc " + p.title + ": " + q).then(function () { done("Stoc actualizat: " + q + " buc."); }).catch(fail);
  });

  function done(msg) { busy(); renderList(); show("vList"); flash(msg + " Pe site apare în ~1 minut."); }
  function fail(err) { busy(); flash(err.message || String(err), true); loadAll().then(renderList).catch(function () {}); }

  // ---- formular ----
  var f = $("form");
  $("cur").textContent = C.currency;
  function openForm(p) {
    editing = p || null; flash(""); f.reset(); $("preview").innerHTML = "";
    $("fTitle").textContent = p ? "Editează produs" : "Produs nou";
    f.title.value = p ? p.title : ""; f.price.value = p ? p.price || "" : "";
    f.quantity.value = p ? (p.quantity == null ? 1 : p.quantity) : 1;
    f.location.value = p ? p.location || "" : ""; f.description.value = p ? p.description || "" : "";
    var lastPhone = ""; try { lastPhone = localStorage.getItem(LS + "_phone") || ""; } catch (e) {}
    f.phone.value = p ? p.phone || "" : lastPhone;
    $("coverPreview").innerHTML = "";
    var ph = p && p.photos || [];
    $("oldPhotos").innerHTML = ph.length ? '<label>Poze existente</label><div class="photos">' + ph.map(function (x, i) {
      return '<label><img src="' + esc(raw(x)) + '" alt="">' +
        '<input type="radio" name="main" value="' + esc(x) + '"' + (i === 0 ? " checked" : "") + '> principală<br>' +
        '<input type="checkbox" class="rm" value="' + esc(x) + '"> șterge</label>';
    }).join("") + "</div>" : "";
    $("lblCover").textContent = ph.length ? "Poză principală nouă (opțional — înlocuiește poza de titlu)" : "Poza principală (de titlu)";
    show("vForm");
  }
  function previewInto(input, box) {
    input.addEventListener("change", function () {
      $(box).innerHTML = Array.prototype.map.call(this.files, function (file) {
        return '<label><img src="' + URL.createObjectURL(file) + '" alt=""></label>';
      }).join("");
    });
  }
  previewInto($("files"), "preview");
  previewInto($("cover"), "coverPreview");
  $("btnNew").onclick = function () { openForm(null); };
  $("cancel").onclick = function (e) { e.preventDefault(); flash(""); show("vList"); };

  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = f.title.value.trim(); if (!title) return;
    var p = editing || { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), created: Date.now(), photos: [] };
    var phone = f.phone.value.trim();
    if (waNumber(phone).length < 10) { flash("Număr de telefon invalid.", true); window.scrollTo(0, 0); return; }
    var remove = Array.prototype.map.call(document.querySelectorAll(".rm:checked"), function (x) { return x.value; });
    var mainSel = document.querySelector("input[name=main]:checked");
    var main = mainSel ? mainSel.value : null;
    var coverFile = $("cover").files[0];
    var files = (coverFile ? [coverFile] : []).concat(Array.prototype.slice.call($("files").files));
    busy("Se salvează...");
    uploadPhotos(p.id, files).then(function (newPaths) {
      p.title = title.slice(0, 120);
      p.price = f.price.value.trim().slice(0, 30);
      p.quantity = Math.max(0, parseInt(f.quantity.value, 10) || 0);
      p.location = f.location.value.trim().slice(0, 80);
      p.description = f.description.value.trim().slice(0, 5000);
      p.phone = phone.slice(0, 30);
      try { localStorage.setItem(LS + "_phone", p.phone); } catch (e) {}
      var kept = (p.photos || []).filter(function (x) { return remove.indexOf(x) < 0; });
      if (main && kept.indexOf(main) > 0) { kept.splice(kept.indexOf(main), 1); kept.unshift(main); }
      var newCover = coverFile ? newPaths.shift() : null;
      p.photos = (newCover ? [newCover] : []).concat(kept, newPaths);
      if (!editing) products.push(p);
      busy("Se salvează produsul...");
      return saveAll((editing ? "Editat: " : "Adăugat: ") + p.title);
    }).then(function () {
      return remove.reduce(function (pr, ph) { return pr.then(function () { return delFile(ph, "Șters poză"); }); }, Promise.resolve());
    }).then(function () { done(editing ? "Salvat ✔" : "Produs adăugat ✔"); })
      .catch(function (err) { if (!editing) products = products.filter(function (x) { return x !== p; }); fail(err); });
  });

  // ---- login ----
  function start() {
    if (!owner || !repo) { show("vLogin"); flash("Completează githubUser și repo în config.js.", true); return; }
    if (!token) { show("vLogin"); return; }
    busy("Se încarcă...");
    api("").then(function (r) {
      if (!r.permissions || !r.permissions.push) throw new Error("Tokenul nu are drept de scriere (Contents: Read and write).");
      return loadAll();
    }).then(function () { busy(); renderList(); show("vList"); })
      .catch(function (err) { busy(); show("vLogin"); flash(err.message, true); });
  }
  $("repoInfo").textContent = owner && repo ? "Repo: " + owner + "/" + repo : "";
  $("btnLogin").onclick = function () {
    token = $("token").value.trim(); if (!token) return;
    try { localStorage.setItem(LS, token); } catch (e) {}
    flash(""); start();
  };
  $("logout").onclick = function () { try { localStorage.removeItem(LS); } catch (e) {} token = ""; $("token").value = ""; show("vLogin"); };
  start();
})();
