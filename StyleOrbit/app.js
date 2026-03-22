const categories = [
  { id: "c1", name: "Sneakers", image: "https://placehold.co/160x160?text=Sneakers" },
  { id: "c2", name: "Bags", image: "https://placehold.co/160x160?text=Bags" },
  { id: "c3", name: "Accessories", image: "https://placehold.co/160x160?text=Accessories" },
  { id: "c4", name: "Beauty", image: "https://placehold.co/160x160?text=Beauty" },
  { id: "c5", name: "Phone Cases", image: "https://placehold.co/160x160?text=Phone+Cases" },
  { id: "c6", name: "Watches", image: "https://placehold.co/160x160?text=Watches" },
  { id: "c7", name: "Streetwear", image: "https://placehold.co/160x160?text=Streetwear" },
  { id: "c8", name: "Perfumes", image: "https://placehold.co/160x160?text=Perfumes" },
  { id: "c9", name: "Hoodies", image: "https://placehold.co/160x160?text=Hoodies" },
  { id: "c10", name: "Jewelry", image: "https://placehold.co/160x160?text=Jewelry" },
  { id: "c11", name: "Skincare", image: "https://placehold.co/160x160?text=Skincare" },
  { id: "c12", name: "Travel", image: "https://placehold.co/160x160?text=Travel" },
  { id: "c13", name: "Caps", image: "https://placehold.co/160x160?text=Caps" },
  { id: "c14", name: "Belts", image: "https://placehold.co/160x160?text=Belts" },
  { id: "c15", name: "Gift Sets", image: "https://placehold.co/160x160?text=Gift+Sets" },
  { id: "c16", name: "Wallets", image: "https://placehold.co/160x160?text=Wallets" },
];

const products = [
  {
    id: "p1",
    name: "Chunky Street Sneaker",
    category: "sneakers",
    price: 3899,
    oldPrice: 4999,
    instaId: "urbanstep.np",
    image: "https://placehold.co/480x480?text=Chunky+Sneaker",
    description: "Comfort daily sneaker with grip sole and lightweight cushion.",
    sizes: ["39", "40", "41", "42", "43"],
  },
  {
    id: "p2",
    name: "Minimal Leather Tote",
    category: "bags",
    price: 2499,
    oldPrice: 3199,
    instaId: "bagcraftstudio",
    image: "https://placehold.co/480x480?text=Leather+Tote",
    description: "Office + travel tote with zipper and internal organizer pocket.",
    sizes: ["One Size"],
  },
  {
    id: "p3",
    name: "Daily Ring Stack Set",
    category: "accessories",
    price: 899,
    oldPrice: 1399,
    instaId: "auraa.acc",
    image: "https://placehold.co/480x480?text=Ring+Set",
    description: "Gold-tone stackable ring set with anti-tarnish finish.",
    sizes: ["S", "M", "L"],
  },
  {
    id: "p4",
    name: "Hydra Glow Skin Kit",
    category: "beauty",
    price: 1599,
    oldPrice: 2199,
    instaId: "skinly.nepal",
    image: "https://placehold.co/480x480?text=Skin+Kit",
    description: "Hydrating cleanser, toner, and cream kit for daily routine.",
    sizes: ["Standard"],
  },
  {
    id: "p5",
    name: "Retro Runner Shoes",
    category: "sneakers",
    price: 4299,
    oldPrice: 5799,
    instaId: "sneakverse.np",
    image: "https://placehold.co/480x480?text=Retro+Runner",
    description: "Retro style sneaker with premium upper and soft insole.",
    sizes: ["39", "40", "41", "42", "43", "44"],
  },
  {
    id: "p6",
    name: "Mini Crossbody Bag",
    category: "bags",
    price: 1899,
    oldPrice: 2599,
    instaId: "loopbags.np",
    image: "https://placehold.co/480x480?text=Crossbody",
    description: "Compact mini bag for essentials, adjustable strap included.",
    sizes: ["One Size"],
  },
  {
    id: "p7",
    name: "Pearl Hoop Pair",
    category: "accessories",
    price: 699,
    oldPrice: 1099,
    instaId: "glowmix.np",
    image: "https://placehold.co/480x480?text=Pearl+Hoops",
    description: "Lightweight pearl hoops, suitable for daily and party wear.",
    sizes: ["Standard"],
  },
  {
    id: "p8",
    name: "Velvet Matte Lip Set",
    category: "beauty",
    price: 1199,
    oldPrice: 1699,
    instaId: "charmcosmetics.np",
    image: "https://placehold.co/480x480?text=Lip+Set",
    description: "Long-lasting matte lip shades in 4 trending colors.",
    sizes: ["4-shade set"],
  },
  {
    id: "p9",
    name: "Classic White Sneaker",
    category: "sneakers",
    price: 3599,
    oldPrice: 4599,
    instaId: "solewave.nepal",
    image: "https://placehold.co/480x480?text=White+Sneaker",
    description: "Clean look classic white sneaker for everyday outfits.",
    sizes: ["38", "39", "40", "41", "42"],
  },
  {
    id: "p10",
    name: "Weekender Duffel",
    category: "bags",
    price: 2799,
    oldPrice: 3599,
    instaId: "northcarry.nepal",
    image: "https://placehold.co/480x480?text=Duffel",
    description: "Spacious duffel bag perfect for gym and weekend trips.",
    sizes: ["One Size"],
  },
];

const els = {
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  categoryFilter: document.getElementById("categoryFilter"),
  categoryGrid: document.getElementById("categoryGrid"),
  productGrid: document.getElementById("productGrid"),
  emptyState: document.getElementById("emptyState"),
  dealsStrip: document.getElementById("dealsStrip"),
  categoryTemplate: document.getElementById("categoryTemplate"),
  productTemplate: document.getElementById("productTemplate"),
  modal: document.getElementById("productModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  modalImage: document.getElementById("modalImage"),
  modalTitle: document.getElementById("modalTitle"),
  modalPrice: document.getElementById("modalPrice"),
  modalOld: document.getElementById("modalOld"),
  modalDesc: document.getElementById("modalDesc"),
  modalInsta: document.getElementById("modalInsta"),
  sizeSelect: document.getElementById("sizeSelect"),
  qtyInput: document.getElementById("qtyInput"),
  buyLink: document.getElementById("buyLink"),
};

const state = {
  query: "",
  category: "all",
};

function formatPrice(value) {
  return `Rs.${Number(value).toLocaleString("en-IN")}`;
}

function discountPercent(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function toInstagramUrl(handle) {
  return `https://instagram.com/${String(handle || "").replace(/^@+/, "").trim()}`;
}

function renderDeals() {
  els.dealsStrip.innerHTML = "";
  products.slice(0, 7).forEach((item) => {
    const d = document.createElement("article");
    d.className = "deal-item";
    const off = discountPercent(item.price, item.oldPrice);
    d.innerHTML = `<p>${item.name}</p><p class="deal-price">${formatPrice(item.price)}</p><p>${off}% OFF</p>`;
    els.dealsStrip.appendChild(d);
  });
}

function renderCategories() {
  els.categoryGrid.innerHTML = "";
  categories.forEach((category) => {
    const node = els.categoryTemplate.content.cloneNode(true);
    node.querySelector(".category-image").src = category.image;
    node.querySelector(".category-image").alt = category.name;
    node.querySelector(".category-name").textContent = category.name;
    els.categoryGrid.appendChild(node);
  });
}

function getFilteredProducts() {
  const q = state.query.toLowerCase().trim();

  return products.filter((product) => {
    const text = `${product.name} ${product.instaId} ${product.category}`.toLowerCase();
    const queryMatch = !q || text.includes(q);
    const categoryMatch = state.category === "all" || product.category === state.category;
    return queryMatch && categoryMatch;
  });
}

function openProductModal(product) {
  const off = discountPercent(product.price, product.oldPrice);

  els.modalImage.src = product.image;
  els.modalImage.alt = product.name;
  els.modalTitle.textContent = product.name;
  els.modalPrice.textContent = `${formatPrice(product.price)}${off ? `   (-${off}%)` : ""}`;
  els.modalOld.textContent = product.oldPrice ? formatPrice(product.oldPrice) : "";
  els.modalDesc.textContent = product.description;
  els.modalInsta.textContent = `Instagram page: @${product.instaId.replace(/^@+/, "")}`;

  els.sizeSelect.innerHTML = "";
  (product.sizes || ["Standard"]).forEach((size) => {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = size;
    els.sizeSelect.appendChild(option);
  });

  els.qtyInput.value = "1";
  els.buyLink.href = toInstagramUrl(product.instaId);

  els.modal.classList.remove("hidden");
}

function closeModal() {
  els.modal.classList.add("hidden");
}

function renderProducts() {
  const list = getFilteredProducts();
  els.productGrid.innerHTML = "";

  list.forEach((product) => {
    const node = els.productTemplate.content.cloneNode(true);
    const card = node.querySelector(".product-card");

    node.querySelector(".product-image").src = product.image;
    node.querySelector(".product-image").alt = product.name;
    node.querySelector(".product-title").textContent = product.name;
    node.querySelector(".product-price").textContent = formatPrice(product.price);
    node.querySelector(".product-old").textContent = product.oldPrice ? formatPrice(product.oldPrice) : "";

    card.addEventListener("click", () => openProductModal(product));
    els.productGrid.appendChild(node);
  });

  els.emptyState.classList.toggle("hidden", list.length > 0);
}

function bindEvents() {
  els.searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    renderProducts();
  });

  els.searchBtn.addEventListener("click", () => {
    state.query = els.searchInput.value;
    renderProducts();
  });

  els.categoryFilter.addEventListener("change", (e) => {
    state.category = String(e.target.value).toLowerCase();
    renderProducts();
  });

  els.closeModalBtn.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

renderDeals();
renderCategories();
renderProducts();
bindEvents();
