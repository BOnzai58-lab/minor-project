(function () {
  const KEYS = {
    users: "styleorbit_users_v2",
    shops: "styleorbit_shops_v2",
    favorites: "styleorbit_favorites_v2",
    reviews: "styleorbit_reviews_v2",
    activity: "styleorbit_activity_v2",
    session: "styleorbit_session_v2",
    apiBase: "styleorbit_api_base_v1",
  };

  const API_BASE = localStorage.getItem(KEYS.apiBase) || "http://127.0.0.1:8001";

  const DEFAULT_USERS = [
    { id: "u-admin", email: "admin@sims.com", password: "admin123", role: "admin", name: "Admin" },
    { id: "u-owner", email: "owner@sims.com", password: "owner123", role: "shop_owner", name: "Owner" },
    { id: "u-owner2", email: "owner2@sims.com", password: "owner234", role: "shop_owner", name: "Owner Two" },
    { id: "u-user", email: "user@sims.com", password: "user123", role: "user", name: "User" },
  ];

  const now = new Date().toISOString();
  const DEFAULT_SHOPS = [
    { id: "s1", ownerId: "u-owner", name: "Urban Step Nepal", category: "clothes", legalOwnerName: "Aarya Thapa", contactPhone: "9800000001", panNumber: "123456789", vatNumber: "", citizenshipNumber: "NP-11223344", documentUrl: "https://docs.example.com/urban-pan", city: "Kathmandu", instaId: "urbanstep.np", pageUrl: "https://urbanstep.example.com", image: "", description: "Streetwear and daily style drops.", status: "approved", createdAt: now, updatedAt: now },
    { id: "s2", ownerId: "u-owner2", name: "BagCraft Studio", category: "accessories", legalOwnerName: "Mina Karki", contactPhone: "9800000002", panNumber: "", vatNumber: "987654321", citizenshipNumber: "NP-55667788", documentUrl: "https://docs.example.com/bag-vat", city: "Lalitpur", instaId: "bagcraftstudio", pageUrl: "https://bagcraft.example.com", image: "", description: "Handmade bags and office carry collections.", status: "approved", createdAt: now, updatedAt: now },
    { id: "s3", ownerId: "u-owner2", name: "Skinly Nepal", category: "beauty", legalOwnerName: "Mina Karki", contactPhone: "9800000002", panNumber: "", vatNumber: "987654321", citizenshipNumber: "NP-55667788", documentUrl: "https://docs.example.com/skin-vat", city: "Pokhara", instaId: "skinly.nepal", pageUrl: "", image: "", description: "Skincare essentials and beauty bundles.", status: "pending", createdAt: now, updatedAt: now },
  ];

  function loadJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function postJSON(path, payload) {
    if (typeof fetch !== "function") return;
    fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  function snapshotPayload() {
    return {
      users: getUsers(),
      shops: getShops(),
      favorites: getFavorites(),
      reviews: getReviews(),
      activity: getActivity(),
    };
  }

  function syncSnapshot() {
    postJSON("/api/snapshot", snapshotPayload());
  }

  function ensureDefaults() {
    let users = loadJSON(KEYS.users, []);
    if (!Array.isArray(users)) users = [];

    const requiredEmails = new Set(DEFAULT_USERS.map((u) => u.email));
    const existingEmails = new Set(users.map((u) => String(u.email || "").toLowerCase()));
    DEFAULT_USERS.forEach((u) => {
      if (!existingEmails.has(u.email.toLowerCase())) users.push(u);
    });
    if (!users.length || !Array.from(requiredEmails).every((e) => users.some((u) => String(u.email || "").toLowerCase() === e.toLowerCase()))) {
      users = [...DEFAULT_USERS];
    }
    saveJSON(KEYS.users, users);

    let shops = loadJSON(KEYS.shops, []);
    if (!Array.isArray(shops)) shops = [];
    if (!shops.length) shops = [...DEFAULT_SHOPS];
    shops = shops.map((shop) => ({
      ...shop,
      pageUrl: String(shop.pageUrl || "").trim(),
      legalOwnerName: String(shop.legalOwnerName || "").trim(),
      contactPhone: String(shop.contactPhone || "").trim(),
      panNumber: String(shop.panNumber || "").trim(),
      vatNumber: String(shop.vatNumber || "").trim(),
      citizenshipNumber: String(shop.citizenshipNumber || "").trim(),
      documentUrl: String(shop.documentUrl || "").trim(),
    }));
    saveJSON(KEYS.shops, shops);

    const favorites = loadJSON(KEYS.favorites, null);
    if (!favorites || typeof favorites !== "object") saveJSON(KEYS.favorites, {});

    const reviews = loadJSON(KEYS.reviews, null);
    if (!reviews || typeof reviews !== "object") saveJSON(KEYS.reviews, {});

    const activity = loadJSON(KEYS.activity, null);
    if (!Array.isArray(activity)) saveJSON(KEYS.activity, []);
  }

  function bootstrap() {
    ensureDefaults();
    syncSnapshot();
  }

  function resetDemoData() {
    saveJSON(KEYS.users, [...DEFAULT_USERS]);
    saveJSON(KEYS.shops, [...DEFAULT_SHOPS]);
    saveJSON(KEYS.favorites, {});
    saveJSON(KEYS.reviews, {});
    saveJSON(KEYS.activity, []);
    localStorage.removeItem(KEYS.session);
    syncSnapshot();
  }

  function getUsers() { return loadJSON(KEYS.users, []); }
  function setUsers(users) { saveJSON(KEYS.users, users); syncSnapshot(); }
  function getShops() { return loadJSON(KEYS.shops, []); }
  function setShops(shops) { saveJSON(KEYS.shops, shops); syncSnapshot(); }
  function getFavorites() { return loadJSON(KEYS.favorites, {}); }
  function setFavorites(favorites) { saveJSON(KEYS.favorites, favorites); syncSnapshot(); }
  function getReviews() { return loadJSON(KEYS.reviews, {}); }
  function setReviews(reviews) { saveJSON(KEYS.reviews, reviews); syncSnapshot(); }
  function setSession(session) { saveJSON(KEYS.session, session); }
  function getSession() { return loadJSON(KEYS.session, null); }
  function clearSession() { localStorage.removeItem(KEYS.session); localStorage.removeItem("styleorbit_session_v1"); localStorage.removeItem("styleorbit_session_v2"); }
  function getActivity() { return loadJSON(KEYS.activity, []); }

  function addActivity(action, detail, actorId) {
    const logs = getActivity();
    const entry = { id: crypto.randomUUID(), action, detail, actorId: actorId || "system", at: new Date().toISOString() };
    logs.unshift(entry);
    saveJSON(KEYS.activity, logs.slice(0, 200));
    postJSON("/api/logs", entry);
  }

  function setApiBase(apiBase) {
    localStorage.setItem(KEYS.apiBase, String(apiBase || "").trim());
  }

  window.StyleOrbitStore = {
    bootstrap,
    resetDemoData,
    getUsers,
    setUsers,
    getShops,
    setShops,
    getFavorites,
    setFavorites,
    getReviews,
    setReviews,
    getSession,
    setSession,
    clearSession,
    getActivity,
    addActivity,
    setApiBase,
    syncSnapshot,
  };
})();

