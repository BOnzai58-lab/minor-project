(function () {
  const store = window.StyleOrbitStore;
  if (!store) return;
  store.bootstrap();

  const session = store.getSession();
  if (!session || (session.role !== "user" && session.role !== "admin" && session.role !== "shop_owner")) {
    window.location.replace("./index.html?logout=1");
    return;
  }

  const els = {
    searchInput: document.getElementById("searchInput"),
    searchBtn: document.getElementById("searchBtn"),
    categoryFilter: document.getElementById("categoryFilter"),
    sortFilter: document.getElementById("sortFilter"),
    favoritesOnlyBtn: document.getElementById("favoritesOnlyBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    viewerName: document.getElementById("viewerName"),
    shopGrid: document.getElementById("shopGrid"),
    emptyState: document.getElementById("emptyState"),
    shopTemplate: document.getElementById("shopTemplate"),
  };

  const state = {
    query: "",
    category: "all",
    sortBy: "name_asc",
    favoritesOnly: false,
  };

  if (els.viewerName) {
    const roleLabel = session.role === "shop_owner" ? "Owner" : session.role === "admin" ? "Admin" : "User";
    els.viewerName.textContent = `${roleLabel}: ${session.name}`;
  }

  function placeholderDataUrl(title, category) {
    const palette = {
      clothes: ["#4b8fe8", "#80b5ff"],
      accessories: ["#6a93d8", "#9bc1ff"],
      beauty: ["#739de3", "#a8c7ff"],
    };
    const [a, b] = palette[category] || ["#4f77b8", "#88a7d4"];
    const label = encodeURIComponent(String(title || "Shop").slice(0, 20));
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='540' height='320'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='540' height='320' fill='url(#g)'/><text x='24' y='170' fill='white' font-size='36' font-family='Arial'>${label}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function getWebImageUrl(shop) {
    const q = `${shop.name || "fashion"},${shop.category || "shop"},storefront`;
    return `https://source.unsplash.com/900x540/?${encodeURIComponent(q)}`;
  }

  function setShopImage(imageEl, shop) {
    const custom = String(shop.image || "").trim();
    const web = getWebImageUrl(shop);
    const fallback = placeholderDataUrl(shop.name, shop.category);

    imageEl.src = custom || web;
    imageEl.alt = shop.name;

    imageEl.onerror = () => {
      if (imageEl.dataset.failed === "1") {
        imageEl.src = fallback;
        imageEl.onerror = null;
        return;
      }
      imageEl.dataset.failed = "1";
      if (custom) imageEl.src = web;
      else imageEl.src = fallback;
    };
  }

  function toInstagramUrl(instaId) {
    return `https://instagram.com/${String(instaId || "").replace(/^@+/, "").trim()}`;
  }

  function previewCaption(shop) {
    const base = String(shop.description || "").trim();
    if (base) return base;
    return `${shop.name} collection available now. Explore styles and buy directly from the page.`;
  }

  function normalizePageUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function getShopReviews(shopId) {
    const all = store.getReviews();
    return Array.isArray(all[shopId]) ? all[shopId] : [];
  }

  function avgRating(shopId) {
    const list = getShopReviews(shopId);
    if (!list.length) return "No ratings yet";
    const avg = list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length;
    return `${avg.toFixed(1)} / 5 (${list.length} review${list.length === 1 ? "" : "s"})`;
  }

  function currentFavorites() {
    const all = store.getFavorites();
    return new Set(all[session.id] || []);
  }

  function setCurrentFavorites(set) {
    const all = store.getFavorites();
    all[session.id] = Array.from(set);
    store.setFavorites(all);
  }

  function filteredShops() {
    const q = state.query.toLowerCase().trim();
    const favs = currentFavorites();

    const list = store.getShops().filter((shop) => {
      const approved = shop.status === "approved";
      const text = `${shop.name} ${shop.category} ${shop.city} ${shop.instaId} ${shop.pageUrl || ""}`.toLowerCase();
      const queryOk = !q || text.includes(q);
      const categoryOk = state.category === "all" || String(shop.category || "").toLowerCase() === state.category;
      const favoriteOk = !state.favoritesOnly || favs.has(shop.id);
      return approved && queryOk && categoryOk && favoriteOk;
    });

    if (state.sortBy === "name_desc") {
      list.sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
    } else if (state.sortBy === "city_asc") {
      list.sort((a, b) => String(a.city || "").localeCompare(String(b.city || "")));
    } else {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    return list;
  }

  function submitReview(shopId, rating, comment) {
    const reviews = store.getReviews();
    if (!Array.isArray(reviews[shopId])) reviews[shopId] = [];
    reviews[shopId].unshift({
      id: crypto.randomUUID(),
      userId: session.id,
      rating: Number(rating),
      comment: String(comment || "").trim(),
      at: new Date().toISOString(),
    });
    store.setReviews(reviews);
    store.addActivity("review", `Review added for shop ${shopId}`, session.id);
  }

  function render() {
    const list = filteredShops();
    const favs = currentFavorites();
    els.shopGrid.innerHTML = "";

    list.forEach((shop) => {
      const node = els.shopTemplate.content.cloneNode(true);
      const image = node.querySelector(".shop-image");
      const previewImage = node.querySelector(".preview-image");
      const previewHandle = node.querySelector(".preview-handle");
      const previewCaptionText = node.querySelector(".preview-caption");
      const favBtn = node.querySelector(".fav-btn");
      const detailsBtn = node.querySelector(".details-btn");
      const details = node.querySelector(".shop-details");
      const visit = node.querySelector(".visit-btn");
      const pageBtn = node.querySelector(".page-btn");
      const reviewForm = node.querySelector(".review-form");

      setShopImage(image, shop);
      setShopImage(previewImage, shop);
      previewHandle.textContent = `@${String(shop.instaId || "").replace(/^@+/, "")}`;
      previewCaptionText.textContent = previewCaption(shop);
      node.querySelector(".shop-title").textContent = shop.name;
      node.querySelector(".shop-meta").textContent = `${shop.category} • ${shop.city}`;
      node.querySelector(".shop-insta").textContent = `@${String(shop.instaId || "").replace(/^@+/, "")}`;
      node.querySelector(".shop-desc").textContent = shop.description || "No description provided.";
      node.querySelector(".shop-rating").textContent = `Rating: ${avgRating(shop.id)}`;

      const isFav = favs.has(shop.id);
      favBtn.textContent = isFav ? "Favorited" : "Favorite";
      favBtn.addEventListener("click", () => {
        const updated = currentFavorites();
        if (updated.has(shop.id)) updated.delete(shop.id);
        else updated.add(shop.id);
        setCurrentFavorites(updated);
        store.addActivity("favorite", `Favorite toggled for shop ${shop.id}`, session.id);
        render();
      });

      detailsBtn.addEventListener("click", () => {
        details.classList.toggle("hidden");
      });

      reviewForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        submitReview(shop.id, fd.get("rating"), fd.get("comment"));
        e.currentTarget.reset();
        render();
      });

      const pageUrl = normalizePageUrl(shop.pageUrl);
      if (pageUrl) {
        pageBtn.href = pageUrl;
        pageBtn.classList.remove("hidden");
      } else {
        pageBtn.removeAttribute("href");
        pageBtn.classList.add("hidden");
      }

      visit.href = toInstagramUrl(shop.instaId);
      visit.addEventListener("click", () => {
        store.addActivity("visit_instagram", `Visited instagram for ${shop.name}`, session.id);
      });

      els.shopGrid.appendChild(node);
    });

    els.emptyState.classList.toggle("hidden", list.length > 0);
    els.favoritesOnlyBtn.textContent = state.favoritesOnly ? "Showing Favorites" : "Favorites";
  }

  els.searchInput.addEventListener("input", (e) => {
    state.query = e.target.value || "";
    render();
  });

  els.searchBtn.addEventListener("click", () => {
    state.query = els.searchInput.value || "";
    render();
  });

  els.categoryFilter.addEventListener("change", (e) => {
    state.category = String(e.target.value || "all").toLowerCase();
    render();
  });

  els.sortFilter.addEventListener("change", (e) => {
    state.sortBy = String(e.target.value || "name_asc").toLowerCase();
    render();
  });

  els.favoritesOnlyBtn.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    render();
  });

  els.logoutBtn.addEventListener("click", () => {
    store.addActivity("logout", `${session.name} logged out`, session.id);
    store.clearSession();
    window.location.replace("./index.html?logout=1");
  });

  render();
})();

