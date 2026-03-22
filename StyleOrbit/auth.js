(function () {
  const store = window.StyleOrbitStore;
  if (!store) return;
  store.bootstrap();

  const params = new URLSearchParams(window.location.search);
  if (params.get("logout") === "1") {
    store.clearSession();
  }

  const session = store.getSession();
  if (session && session.role === "admin") {
    window.location.href = "./admin.html";
    return;
  }
  if (session && session.role === "shop_owner") {
    window.location.href = "./owner.html";
    return;
  }
  if (session && session.role === "user") {
    window.location.href = "./user.html";
    return;
  }

  const loginSection = document.getElementById("loginSection");
  const createSection = document.getElementById("createSection");
  const showSignupBtn = document.getElementById("showSignupBtn");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");

  const form = document.getElementById("loginForm");
  const createForm = document.getElementById("createAccountForm");
  const createRoleSelect = document.getElementById("createRoleSelect");
  const ownerDocFields = document.getElementById("ownerDocFields");
  const statusText = document.getElementById("statusText");
  const createStatusText = document.getElementById("createStatusText");
  const resetBtn = document.getElementById("resetDemoBtn");

  function redirectByRole(role) {
    if (role === "admin") window.location.href = "./admin.html";
    else if (role === "shop_owner") window.location.href = "./owner.html";
    else window.location.href = "./user.html";
  }

  function showCreate() {
    if (!loginSection || !createSection) return;
    loginSection.classList.add("hidden");
    createSection.classList.remove("hidden");
    statusText.textContent = "";
  }

  function showLogin() {
    if (!loginSection || !createSection) return;
    createSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    createStatusText.textContent = "";
  }

  function isValidPanVat(value) {
    const v = String(value || "").trim();
    return /^\d{9,11}$/.test(v);
  }

  function isLikelyUrl(value) {
    const v = String(value || "").trim();
    if (!v) return false;
    return /^https?:\/\//i.test(v);
  }

  function isValidCitizenship(value) {
    const v = String(value || "").trim();
    return /^[A-Za-z0-9-]{6,20}$/.test(v);
  }

  function toggleOwnerDocFields() {
    if (!createRoleSelect || !ownerDocFields) return;
    const isOwner = createRoleSelect.value === "shop_owner";
    ownerDocFields.classList.toggle("hidden", !isOwner);
  }

  if (showSignupBtn) {
    showSignupBtn.addEventListener("click", showCreate);
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", showLogin);
  }

  if (createRoleSelect) {
    createRoleSelect.addEventListener("change", toggleOwnerDocFields);
    toggleOwnerDocFields();
  }

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", () => {
      const emailInput = prompt("Enter your Google email:");
      const email = String(emailInput || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        statusText.textContent = "Please enter a valid Google email.";
        return;
      }

      const users = store.getUsers();
      let user = users.find((u) => String(u.email || "").toLowerCase() === email);

      if (!user) {
        user = {
          id: crypto.randomUUID(),
          name: email.split("@")[0] || "Google User",
          email,
          password: "",
          role: "user",
        };
        users.push(user);
        store.setUsers(users);
        store.addActivity("user_create_google", `Account created with Google: ${email}`, user.id);
      }

      store.setSession({ id: user.id, role: user.role, name: user.name, email: user.email });
      store.addActivity("login_google", `${user.name} signed in with Google`, user.id);
      statusText.textContent = "Google login successful. Redirecting...";
      redirectByRole(user.role);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "").trim();

    const user = store.getUsers().find((u) => u.email.toLowerCase() === email && u.password === password);

    if (!user) {
      statusText.textContent = "Invalid email or password. Use demo credentials or reset demo data.";
      return;
    }

    store.setSession({ id: user.id, role: user.role, name: user.name, email: user.email });
    store.addActivity("login", `${user.name} signed in as ${user.role}`, user.id);
    statusText.textContent = "Login successful. Redirecting...";
    redirectByRole(user.role);
  });

  if (createForm) {
    createForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(createForm);
      const name = String(fd.get("name") || "").trim();
      const email = String(fd.get("email") || "").trim().toLowerCase();
      const password = String(fd.get("password") || "").trim();
      const rawRole = String(fd.get("role") || "user").trim().toLowerCase();
      const role = rawRole === "shop_owner" ? "shop_owner" : "user";
      const panNumber = String(fd.get("panNumber") || "").trim();
      const vatNumber = String(fd.get("vatNumber") || "").trim();
      const citizenshipNumber = String(fd.get("citizenshipNumber") || "").trim();
      const contactPhone = String(fd.get("contactPhone") || "").trim();
      const documentUrl = String(fd.get("documentUrl") || "").trim();

      if (!name || !email || !password) {
        createStatusText.textContent = "Please fill all create account fields.";
        return;
      }

      if (role === "shop_owner") {
        if ((!panNumber && !vatNumber) || !citizenshipNumber || !contactPhone || !documentUrl) {
          createStatusText.textContent = "Shop Owner registration requires PAN/VAT, citizenship number, contact phone, and document URL.";
          return;
        }
        if ((panNumber && !isValidPanVat(panNumber)) || (vatNumber && !isValidPanVat(vatNumber))) {
          createStatusText.textContent = "PAN/VAT must be 9 to 11 digits.";
          return;
        }
        if (!isValidCitizenship(citizenshipNumber)) {
          createStatusText.textContent = "Citizenship number should be 6-20 letters/numbers.";
          return;
        }
        if (!isLikelyUrl(documentUrl)) {
          createStatusText.textContent = "Please enter a valid document URL starting with http or https.";
          return;
        }
      }

      const users = store.getUsers();
      if (users.some((u) => u.email.toLowerCase() === email)) {
        createStatusText.textContent = "This email is already registered. Please sign in.";
        return;
      }

      const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password,
        role,
        ownerDocs: role === "shop_owner"
          ? {
              panNumber,
              vatNumber,
              citizenshipNumber,
              contactPhone,
              documentUrl,
            }
          : null,
      };

      users.push(newUser);
      store.setUsers(users);
      store.addActivity("user_create_self", `Account created: ${email} (${role})`, newUser.id);

      store.setSession({ id: newUser.id, role: newUser.role, name: newUser.name, email: newUser.email });
      createStatusText.textContent = "Account created. Redirecting...";
      redirectByRole(newUser.role);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      store.resetDemoData();
      statusText.textContent = "Demo data reset done. You can login now.";
      if (createStatusText) createStatusText.textContent = "";
      showLogin();
    });
  }
})();
