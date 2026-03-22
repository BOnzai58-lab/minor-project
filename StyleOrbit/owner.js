(function () {
  const store = window.StyleOrbitStore;
  if (!store) return;
  store.bootstrap();

  const session = store.getSession();
  if (!session || session.role !== "shop_owner") {
    window.location.replace("./index.html?logout=1");
    return;
  }

  const els = {
    ownerName: document.getElementById("ownerName"),
    logoutBtn: document.getElementById("logoutBtn"),
    shopForm: document.getElementById("shopForm"),
    shopStatus: document.getElementById("shopStatus"),
    shopList: document.getElementById("shopList"),
    otherShopList: document.getElementById("otherShopList"),
  };

  els.ownerName.textContent = `${session.name} (${session.email})`;

  function showStatus(message, color) {
    if (!els.shopStatus) return;
    els.shopStatus.textContent = message;
    if (color) els.shopStatus.style.color = color;
  }

  function normalizePageUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function normalizeDocUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function isValidPanVat(value) {
    const v = String(value || "").trim();
    if (!v) return false;
    return /^\d{9,11}$/.test(v);
  }

  function isValidCitizenship(value) {
    const v = String(value || "").trim();
    if (!v) return false;
    return /^[A-Za-z0-9-]{6,20}$/.test(v);
  }

  function validateOwnerDocs(data) {
    if (!data.legalOwnerName || !data.contactPhone || !data.citizenshipNumber || !data.documentUrl) {
      return "Legal owner name, contact phone, citizenship number, and document URL are required.";
    }
    if (!data.panNumber && !data.vatNumber) {
      return "At least one of PAN or VAT is required.";
    }
    if (!isValidCitizenship(data.citizenshipNumber)) {
      return "Citizenship number should be 6-20 letters/numbers.";
    }
    if ((data.panNumber && !isValidPanVat(data.panNumber)) || (data.vatNumber && !isValidPanVat(data.vatNumber))) {
      return "PAN/VAT must be 9 to 11 digits.";
    }
    if (!/^https?:\/\//i.test(data.documentUrl)) {
      return "Document URL must start with http or https.";
    }
    return "";
  }

  function myShops() {
    return store.getShops().filter((s) => s.ownerId === session.id);
  }

  function otherShops() {
    return store.getShops().filter((s) => s.ownerId !== session.id);
  }

  function isImageValue(value) {
    const v = String(value || "").trim();
    return /^https?:\/\//i.test(v) || /^data:image\//i.test(v);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });
  }

  function enhanceImageInput(input, statusFn) {
    if (!input || input.dataset.imageEnhanced === "1") return;
    input.dataset.imageEnhanced = "1";

    input.placeholder = "Paste image URL (or drag/drop/upload below)";

    const tools = document.createElement("div");
    tools.className = "image-tools";
    tools.innerHTML = `
      <div class="image-drop-zone" tabindex="0">Drag & drop image URL or image file here</div>
      <div class="image-tool-actions">
        <button type="button" class="image-upload-btn">Upload File</button>
        <button type="button" class="image-clear-btn">Clear</button>
        <input type="file" accept="image/*" class="image-file-input" hidden />
      </div>
      <div class="image-preview-wrap hidden">
        <img class="image-preview" alt="Image preview" />
      </div>
    `;

    input.insertAdjacentElement("afterend", tools);

    const dropZone = tools.querySelector(".image-drop-zone");
    const uploadBtn = tools.querySelector(".image-upload-btn");
    const clearBtn = tools.querySelector(".image-clear-btn");
    const fileInput = tools.querySelector(".image-file-input");
    const previewWrap = tools.querySelector(".image-preview-wrap");
    const previewImg = tools.querySelector(".image-preview");

    function setImageValue(value) {
      input.value = String(value || "").trim();
      if (isImageValue(input.value)) {
        previewImg.src = input.value;
        previewWrap.classList.remove("hidden");
      } else {
        previewImg.removeAttribute("src");
        previewWrap.classList.add("hidden");
      }
    }

    function setFromText(text) {
      const value = String(text || "").trim();
      if (!isImageValue(value)) return false;
      setImageValue(value);
      return true;
    }

    async function setFromFile(file) {
      if (!file) return;
      if (!String(file.type || "").startsWith("image/")) {
        if (statusFn) statusFn("Please upload an image file.", "#b91c1c");
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setImageValue(dataUrl);
        if (statusFn) statusFn("Image file added.", "#065f46");
      } catch {
        if (statusFn) statusFn("Failed to read image file.", "#b91c1c");
      }
    }

    input.addEventListener("input", () => {
      setImageValue(input.value);
    });

    previewImg.addEventListener("error", () => {
      previewWrap.classList.add("hidden");
    });

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      setFromFile(file);
      fileInput.value = "";
    });

    clearBtn.addEventListener("click", () => {
      setImageValue("");
      if (statusFn) statusFn("Image cleared.", "#065f46");
    });

    ["dragenter", "dragover"].forEach((evt) => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((evt) => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("drag-over");
      });
    });

    dropZone.addEventListener("drop", async (e) => {
      const dt = e.dataTransfer;
      if (!dt) return;

      const file = dt.files && dt.files[0];
      if (file) {
        await setFromFile(file);
        return;
      }

      const uriList = dt.getData("text/uri-list");
      const plain = dt.getData("text/plain");
      const accepted = setFromText(uriList) || setFromText(plain);

      if (accepted) {
        if (statusFn) statusFn("Image URL added.", "#065f46");
      } else if (statusFn) {
        statusFn("Drop a valid image URL or image file.", "#b91c1c");
      }
    });

    setImageValue(input.value);
  }

  function renderShops() {
    const own = myShops();
    els.shopList.innerHTML = "";

    if (!own.length) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = "<p>You have not registered a shop yet.</p>";
      els.shopList.appendChild(row);
      return;
    }

    own.forEach((shop) => {
      const row = document.createElement("div");
      row.className = "row";
      const pageUrl = normalizePageUrl(shop.pageUrl);
      row.innerHTML = `<p><strong>${shop.name}</strong> | ${shop.category} | ${shop.city} | status: ${shop.status}${pageUrl ? ` | <a href="${pageUrl}" target="_blank" rel="noopener noreferrer">Visit Page</a>` : ""}</p>`;

      const form = document.createElement("form");
      form.innerHTML = `
        <input name="name" value="${shop.name}" required />
        <select name="category" required>
          <option value="clothes" ${shop.category === "clothes" ? "selected" : ""}>Clothes</option>
          <option value="accessories" ${shop.category === "accessories" ? "selected" : ""}>Accessories</option>
          <option value="beauty" ${shop.category === "beauty" ? "selected" : ""}>Beauty</option>
        </select>
        <input name="legalOwnerName" value="${shop.legalOwnerName || ""}" placeholder="Legal Owner Name" required />
        <input name="contactPhone" value="${shop.contactPhone || ""}" placeholder="Contact Phone" required />
        <input name="panNumber" value="${shop.panNumber || ""}" placeholder="PAN Number" />
        <input name="vatNumber" value="${shop.vatNumber || ""}" placeholder="VAT Number" />
        <input name="citizenshipNumber" value="${shop.citizenshipNumber || ""}" placeholder="Citizenship Number" required />
        <input name="documentUrl" value="${shop.documentUrl || ""}" placeholder="Document URL" required />
        <input name="city" value="${shop.city}" required />
        <input name="instaId" value="${shop.instaId}" required />
        <input name="pageUrl" value="${shop.pageUrl || ""}" placeholder="Shop Page URL" />
        <input name="image" value="${shop.image || ""}" placeholder="Image URL" />
        <textarea name="description" rows="2">${shop.description || ""}</textarea>
        <button type="submit">Save Changes</button>
      `;

      const editImageInput = form.querySelector('input[name="image"]');
      enhanceImageInput(editImageInput, null);

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const docs = {
          legalOwnerName: String(fd.get("legalOwnerName") || "").trim(),
          contactPhone: String(fd.get("contactPhone") || "").trim(),
          panNumber: String(fd.get("panNumber") || "").trim(),
          vatNumber: String(fd.get("vatNumber") || "").trim(),
          citizenshipNumber: String(fd.get("citizenshipNumber") || "").trim(),
          documentUrl: normalizeDocUrl(fd.get("documentUrl")),
        };
        const validationError = validateOwnerDocs(docs);
        if (validationError) {
          showStatus(validationError, "#b91c1c");
          return;
        }

        const shops = store.getShops();
        const idx = shops.findIndex((x) => x.id === shop.id && x.ownerId === session.id);
        if (idx < 0) return;

        shops[idx] = {
          ...shops[idx],
          name: String(fd.get("name") || "").trim(),
          category: String(fd.get("category") || "").trim().toLowerCase(),
          city: String(fd.get("city") || "").trim(),
          instaId: String(fd.get("instaId") || "").replace(/^@+/, "").trim(),
          pageUrl: normalizePageUrl(fd.get("pageUrl")),
          legalOwnerName: docs.legalOwnerName,
          contactPhone: docs.contactPhone,
          panNumber: docs.panNumber,
          vatNumber: docs.vatNumber,
          citizenshipNumber: docs.citizenshipNumber,
          documentUrl: docs.documentUrl,
          image: String(fd.get("image") || "").trim(),
          description: String(fd.get("description") || "").trim(),
          status: "pending",
          updatedAt: new Date().toISOString(),
        };

        store.setShops(shops);
        store.addActivity("shop_edit", `Shop updated and sent for re-approval: ${shops[idx].name}`, session.id);
        renderShops();
      });

      row.appendChild(form);
      els.shopList.appendChild(row);
    });
  }

  function renderOtherShops() {
    if (!els.otherShopList) return;
    const others = otherShops();
    els.otherShopList.innerHTML = "";

    if (!others.length) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = "<p>No other shop listings available.</p>";
      els.otherShopList.appendChild(row);
      return;
    }

    others.forEach((shop) => {
      const row = document.createElement("div");
      row.className = "row row-readonly";
      const pageUrl = normalizePageUrl(shop.pageUrl);
      row.innerHTML = `<p><strong>${shop.name}</strong> | ${shop.category} | ${shop.city} | status: ${shop.status}${pageUrl ? ` | <a href="${pageUrl}" target="_blank" rel="noopener noreferrer">Visit Page</a>` : ""}</p>`;
      els.otherShopList.appendChild(row);
    });
  }

  const registerImageInput = els.shopForm.querySelector('input[name="image"]');
  enhanceImageInput(registerImageInput, showStatus);

  els.shopForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (myShops().length >= 3) {
      showStatus("You can register up to 3 shops from this owner account. Edit your existing shops below.", "#b91c1c");
      return;
    }

    const fd = new FormData(e.currentTarget);

    const shop = {
      id: crypto.randomUUID(),
      ownerId: session.id,
      name: String(fd.get("name") || "").trim(),
      category: String(fd.get("category") || "").trim().toLowerCase(),
      legalOwnerName: String(fd.get("legalOwnerName") || "").trim(),
      contactPhone: String(fd.get("contactPhone") || "").trim(),
      panNumber: String(fd.get("panNumber") || "").trim(),
      vatNumber: String(fd.get("vatNumber") || "").trim(),
      citizenshipNumber: String(fd.get("citizenshipNumber") || "").trim(),
      documentUrl: normalizeDocUrl(fd.get("documentUrl")),
      city: String(fd.get("city") || "").trim(),
      instaId: String(fd.get("instaId") || "").replace(/^@+/, "").trim(),
      pageUrl: normalizePageUrl(fd.get("pageUrl")),
      image: String(fd.get("image") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!shop.name || !shop.category || !shop.city || !shop.instaId) {
      showStatus("Fill all required fields.", "#b91c1c");
      return;
    }
    const validationError = validateOwnerDocs(shop);
    if (validationError) {
      showStatus(validationError, "#b91c1c");
      return;
    }

    const shops = store.getShops();
    shops.unshift(shop);
    store.setShops(shops);
    store.addActivity("shop_register", `Shop submitted: ${shop.name}`, session.id);

    e.currentTarget.reset();
    if (registerImageInput) {
      registerImageInput.dispatchEvent(new Event("input"));
    }
    showStatus("Shop submitted for admin approval.", "#065f46");
    renderShops();
    renderOtherShops();
  });

  els.logoutBtn.addEventListener("click", () => {
    store.addActivity("logout", `${session.name} logged out`, session.id);
    store.clearSession();
    window.location.replace("./index.html?logout=1");
  });

  renderShops();
  renderOtherShops();
})();
