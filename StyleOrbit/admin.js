(function () {
  const store = window.StyleOrbitStore;
  if (!store) return;

  store.bootstrap();
  const session = store.getSession();
  if (!session || session.role !== "admin") {
    window.location.replace("./index.html?logout=1");
    return;
  }

  const els = {
    adminName: document.getElementById("adminName"),
    logoutBtn: document.getElementById("logoutBtn"),
    pendingShopList: document.getElementById("pendingShopList"),
    shopList: document.getElementById("shopList"),
    userForm: document.getElementById("userForm"),
    userStatus: document.getElementById("userStatus"),
    userList: document.getElementById("userList"),
    activityList: document.getElementById("activityList"),
  };

  els.adminName.textContent = `Admin: ${session.name}`;

  function roleLabel(role) {
    if (role === "shop_owner") return "shop owner";
    return role;
  }

  function renderPendingShops() {
    const pending = store.getShops().filter((s) => s.status === "pending");
    els.pendingShopList.innerHTML = "";

    if (!pending.length) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = "<p>No pending shops.</p>";
      els.pendingShopList.appendChild(row);
      return;
    }

    pending.forEach((shop) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<p><strong>${shop.name}</strong> | ${shop.category} | ${shop.city} | @${shop.instaId} | PAN: ${shop.panNumber || "-"} | VAT: ${shop.vatNumber || "-"} | Doc: ${shop.documentUrl ? `<a href="${shop.documentUrl}" target="_blank" rel="noopener noreferrer">View</a>` : "-"}</p>`;

      const actions = document.createElement("div");
      actions.className = "inline-actions";

      const approve = document.createElement("button");
      approve.type = "button";
      approve.textContent = "Approve";
      approve.className = "ok";
      approve.addEventListener("click", () => {
        const shops = store.getShops();
        const idx = shops.findIndex((x) => x.id === shop.id);
        if (idx < 0) return;
        shops[idx].status = "approved";
        shops[idx].updatedAt = new Date().toISOString();
        store.setShops(shops);
        store.addActivity("shop_approve", `Approved shop ${shop.name}`, session.id);
        renderAll();
      });

      const reject = document.createElement("button");
      reject.type = "button";
      reject.textContent = "Reject";
      reject.className = "warn";
      reject.addEventListener("click", () => {
        const shops = store.getShops();
        const idx = shops.findIndex((x) => x.id === shop.id);
        if (idx < 0) return;
        shops[idx].status = "rejected";
        shops[idx].updatedAt = new Date().toISOString();
        store.setShops(shops);
        store.addActivity("shop_reject", `Rejected shop ${shop.name}`, session.id);
        renderAll();
      });

      actions.appendChild(approve);
      actions.appendChild(reject);
      row.appendChild(actions);
      els.pendingShopList.appendChild(row);
    });
  }

  function renderShopListings() {
    const shops = store.getShops();
    els.shopList.innerHTML = "";

    shops.forEach((shop) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<p><strong>${shop.name}</strong> | ${shop.category} | ${shop.city} | status: ${shop.status} | @${shop.instaId} | PAN: ${shop.panNumber || "-"} | VAT: ${shop.vatNumber || "-"}</p>`;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove Fake/Scam";
      remove.className = "danger";
      remove.addEventListener("click", () => {
        const next = store.getShops().filter((x) => x.id !== shop.id);
        store.setShops(next);
        store.addActivity("shop_remove", `Removed shop ${shop.name}`, session.id);
        renderAll();
      });

      row.appendChild(remove);
      els.shopList.appendChild(row);
    });
  }

  function renderUsers() {
    const users = store.getUsers();
    els.userList.innerHTML = "";

    users.forEach((u) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<p><strong>${u.name}</strong> | ${u.email} | role: ${roleLabel(u.role)}</p>`;

      if (u.id !== session.id) {
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "Delete User";
        del.className = "danger";
        del.addEventListener("click", () => {
          const next = store.getUsers().filter((x) => x.id !== u.id);
          store.setUsers(next);
          store.addActivity("user_delete", `Deleted user ${u.email}`, session.id);
          renderUsers();
        });
        row.appendChild(del);
      }

      els.userList.appendChild(row);
    });
  }

  function renderActivity() {
    const logs = store.getActivity();
    els.activityList.innerHTML = "";

    if (!logs.length) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = "<p>No activity yet.</p>";
      els.activityList.appendChild(row);
      return;
    }

    logs.slice(0, 25).forEach((log) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<p><strong>${log.action}</strong> | ${log.detail} | ${new Date(log.at).toLocaleString()}</p>`;
      els.activityList.appendChild(row);
    });
  }

  els.userForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "").trim();
    const role = String(fd.get("role") || "user").trim().toLowerCase();

    if (!name || !email || !password) {
      els.userStatus.textContent = "Please fill all user fields.";
      els.userStatus.style.color = "#b91c1c";
      return;
    }

    const users = store.getUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      els.userStatus.textContent = "Email already exists.";
      els.userStatus.style.color = "#b91c1c";
      return;
    }

    users.push({
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role: role === "admin" ? "admin" : role === "shop_owner" ? "shop_owner" : "user",
    });

    store.setUsers(users);
    store.addActivity("user_create", `Created user ${email}`, session.id);
    e.currentTarget.reset();
    els.userStatus.textContent = "User created.";
    els.userStatus.style.color = "#065f46";
    renderUsers();
    renderActivity();
  });

  els.logoutBtn.addEventListener("click", () => {
    store.addActivity("logout", `${session.name} logged out`, session.id);
    store.clearSession();
    window.location.replace("./index.html?logout=1");
  });

  function renderAll() {
    renderPendingShops();
    renderShopListings();
    renderUsers();
    renderActivity();
  }

  renderAll();
})();

