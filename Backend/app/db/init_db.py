import time
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.database import Base, engine
from app.db.models import InventoryItem, Product, User
from app.services.auth_service import AuthService
from app.services.model_service import ModelService


def init_db():
    last_error = None
    for _ in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            last_error = None
            break
        except Exception as e:
            last_error = e
            time.sleep(2)
    if last_error:
        raise last_error
    auth_service = AuthService()
    db = Session(bind=engine)
    try:
        _ensure_product_columns(db)
        _ensure_user(db, auth_service, "admin", "admin123", "admin")
        _ensure_user(db, auth_service, "user", "user123", "user")
        _migrate_regions_to_nepal(db)
        _seed_inventory_domain_data(db)
        _backfill_product_prices(db)
        _backfill_product_codes(db)
        db.commit()
    finally:
        db.close()


def _ensure_user(db: Session, auth_service: AuthService, username: str, password: str, role: str):
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        return
    db.add(
        User(
            username=username,
            hashed_password=auth_service.hash_password(password),
            role=role,
            is_active=True,
        )
    )


def _seed_inventory_domain_data(db: Session):
    """Seed products and inventory records from dataset for first-run prototype setup."""
    existing_product = db.query(Product).first()
    if existing_product:
        _rename_store_products(db)
        return

    try:
        df = ModelService().load_data()
    except Exception:
        return

    product_by_name = {}
    products_df = (
        df[["product_name", "category"]]
        .dropna(subset=["product_name"])
        .drop_duplicates()
    )

    for _, row in products_df.iterrows():
        product = Product(
            name=str(row["product_name"]).strip(),
            product_code=f"SKU-{len(product_by_name) + 1:04d}",
            category=str(row.get("category") or "").strip() or None,
            unit_price_npr=_default_unit_price_npr(str(row["product_name"]).strip(), str(row.get("category") or "").strip() or None),
            shelf_life_days=_default_shelf_life_days(str(row.get("category") or "").strip() or None),
            is_active=True,
        )
        db.add(product)
        db.flush()
        product_by_name[product.name] = product

    latest_inventory = (
        df.sort_values("date")
        .groupby(["product_name", "region"], as_index=False)
        .last()
    )
    for _, row in latest_inventory.iterrows():
        product_name = str(row["product_name"]).strip()
        product = product_by_name.get(product_name)
        if not product:
            continue
        db.add(
            InventoryItem(
                product_id=product.id,
                region=str(row["region"]).strip(),
                current_stock=int(row.get("current_stock", 0) or 0),
                restock_threshold=int(row.get("restock_threshold", 0) or 0),
            )
        )


def _rename_store_products(db: Session):
    """Backfill readable product names for already-seeded Store N records."""
    product_map = ModelService.STORE_PRODUCT_MAP
    products = db.query(Product).all()
    for product in products:
        name = (product.name or "").strip()
        if not name.lower().startswith("store "):
            continue
        try:
            store_id = int(name.split(" ", 1)[1])
        except (ValueError, IndexError):
            continue
        mapped = product_map.get(store_id)
        if mapped:
            product.name = mapped[0]
            if not product.category or product.category == "General":
                product.category = mapped[1]


def _migrate_regions_to_nepal(db: Session):
    """Rename legacy sample regions to Nepal locations."""
    region_map = {
        "Delhi": "Kathmandu",
        "Mumbai": "Lalitpur",
        "Kochi": "Biratnagar",
    }

    inventory_items = db.query(InventoryItem).all()
    for item in inventory_items:
        mapped = region_map.get(item.region)
        if mapped:
            item.region = mapped

    from app.db.models import StockTransaction

    transactions = db.query(StockTransaction).all()
    for txn in transactions:
        mapped = region_map.get(txn.region)
        if mapped:
            txn.region = mapped


def _ensure_product_columns(db: Session):
    """Add product columns for older DBs created before pricing/metadata support."""
    try:
        db.execute(text("ALTER TABLE products ADD COLUMN unit_price_npr DOUBLE PRECISION DEFAULT 100"))
        db.commit()
    except Exception:
        db.rollback()
    try:
        db.execute(text("ALTER TABLE products ADD COLUMN shelf_life_days INTEGER"))
        db.commit()
    except Exception:
        db.rollback()
    try:
        db.execute(text("ALTER TABLE products ADD COLUMN product_code VARCHAR(64)"))
        db.commit()
    except Exception:
        db.rollback()
    try:
        db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_products_product_code ON products (product_code)"))
        db.commit()
    except Exception:
        db.rollback()


def _default_unit_price_npr(product_name: str, category: str = None) -> float:
    product_prices = {
        "Rice 5kg Pack": 850,
        "Wheat Flour 10kg": 980,
        "Cooking Oil 1L": 340,
        "Milk 1L": 120,
        "Bread Loaf": 65,
        "Eggs 12 Pack": 220,
        "Sugar 1kg": 140,
        "Salt 1kg": 35,
        "Toor Dal 1kg": 210,
        "Chana Dal 1kg": 190,
        "Basmati Rice 1kg": 260,
        "Tea 500g": 430,
        "Coffee 200g": 360,
        "Biscuits Family Pack": 180,
        "Instant Noodles 6 Pack": 160,
        "Tomato Ketchup 500g": 190,
        "Bath Soap 4 Pack": 240,
        "Shampoo 340ml": 390,
        "Toothpaste 150g": 150,
        "Laundry Detergent 1kg": 290,
        "Dishwash Liquid 750ml": 230,
        "Floor Cleaner 1L": 260,
        "Toilet Cleaner 1L": 240,
        "Tissue Roll 6 Pack": 320,
        "Packaged Water 1L": 30,
        "Orange Juice 1L": 240,
        "Cola 2L": 185,
        "Potato Chips 200g": 120,
        "Chocolate Bar 100g": 95,
        "Baby Diapers M 30s": 780,
        "Baby Wipes 80s": 260,
        "Hand Sanitizer 250ml": 180,
        "Face Wash 100ml": 260,
        "Body Lotion 200ml": 360,
        "Notebook A4 200 Pages": 180,
        "Ball Pen 10 Pack": 140,
        "LED Bulb 9W": 230,
        "Extension Cord": 520,
        "Aluminum Foil 72m": 230,
        "Garbage Bags 30s": 180,
        "Pet Food 1kg": 480,
        "Handwash 250ml": 170,
        "Dry Fruits Mix 500g": 780,
        "Oats 1kg": 330,
        "Cornflakes 500g": 360,
    }
    if product_name in product_prices:
        return float(product_prices[product_name])

    category_defaults = {
        "Staples": 450,
        "Grocery": 260,
        "Dairy": 180,
        "Bakery": 90,
        "Pulses": 230,
        "Beverages": 190,
        "Snacks": 140,
        "Condiments": 180,
        "Personal Care": 260,
        "Home Care": 250,
        "Baby Care": 540,
        "Stationery": 160,
        "Electrical": 390,
        "Kitchen": 230,
        "Pet Care": 440,
        "Breakfast": 320,
    }
    return float(category_defaults.get(category or "", 200))


def _default_shelf_life_days(category: str = None) -> int:
    category_defaults = {
        "Staples": 180,
        "Grocery": 120,
        "Dairy": 10,
        "Bakery": 5,
        "Pulses": 150,
        "Beverages": 120,
        "Snacks": 90,
        "Condiments": 180,
        "Personal Care": 365,
        "Home Care": 365,
        "Baby Care": 180,
        "Stationery": 720,
        "Electrical": 1095,
        "Kitchen": 540,
        "Pet Care": 180,
        "Breakfast": 180,
    }
    return int(category_defaults.get(category or "", 180))


def _backfill_product_prices(db: Session):
    products = db.query(Product).all()
    for product in products:
        if (
            product.unit_price_npr is None
            or float(product.unit_price_npr) <= 0
            or float(product.unit_price_npr) == 100.0
        ):
            product.unit_price_npr = _default_unit_price_npr(product.name, product.category)
        if product.shelf_life_days is None or int(product.shelf_life_days) <= 0:
            product.shelf_life_days = _default_shelf_life_days(product.category)


def _backfill_product_codes(db: Session):
    products = db.query(Product).order_by(Product.id.asc()).all()
    used = set()
    for product in products:
        code = (product.product_code or "").strip()
        if not code or code in used:
            code = f"SKU-{int(product.id):04d}"
            suffix = 1
            while code in used:
                code = f"SKU-{int(product.id):04d}-{suffix}"
                suffix += 1
            product.product_code = code
        used.add(product.product_code)
