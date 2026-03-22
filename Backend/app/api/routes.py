from fastapi import APIRouter, Depends, HTTPException, Query, Request
import app.models.schemas
from app.services.model_service import ModelService
from app.services.weather_service import WeatherService
from app.services.calendar_service import CalendarService
from app.services.auth_service import AuthService
from typing import Optional
import pandas as pd
import math
from datetime import date
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.deps import get_current_user, require_admin
from app.db.models import AuthLog, InventoryItem, Product, StockTransaction, User

router = APIRouter()
model_service = ModelService()
weather_service = WeatherService()
calendar_service = CalendarService()
auth_service = AuthService()

@router.post("/auth/register", response_model=app.models.schemas.UserResponse)
async def register(request: app.models.schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Register a standard user account."""
    try:
        user = auth_service.create_user(db, request.username.strip(), request.password, role="user")
        return app.models.schemas.UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/login", response_model=app.models.schemas.LoginResponse)
async def login(
    request: app.models.schemas.LoginRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """Role-based login endpoint backed by database users."""
    user = auth_service.authenticate_user(db, request.username.strip(), request.password)
    if not user:
        auth_service.log_auth_event(
            db,
            username=request.username.strip(),
            event="login",
            success=False,
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent"),
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")
    access_token = auth_service.create_access_token(user.username, user.role)
    auth_service.log_auth_event(
        db,
        username=user.username,
        user_id=user.id,
        event="login",
        success=True,
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
    )
    return app.models.schemas.LoginResponse(
        username=user.username,
        role=user.role,
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/auth/me", response_model=app.models.schemas.UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return app.models.schemas.UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        is_active=current_user.is_active,
    )

@router.post("/predict", response_model=app.models.schemas.PredictionResponse)
async def predict_demand(
    request: app.models.schemas.PredictionRequest,
    current_user: User = Depends(get_current_user),
):
    """Predict demand for given input parameters."""
    try:
        data = request.dict()

        horizon = (request.horizon or "daily").strip().lower()
        if horizon not in {"daily", "monthly", "yearly"}:
            raise HTTPException(status_code=400, detail="horizon must be daily, monthly, or yearly")

        if request.periods < 1:
            raise HTTPException(status_code=400, detail="periods must be >= 1")

        if (not data.get("weather") or data.get("temp_c") is None) and data.get("region") and data.get("date"):
            weather_info = weather_service.get_weather(data["region"], str(data["date"]))
            data["weather"] = data.get("weather") or weather_info.get("condition")
            if data.get("temp_c") is None:
                data["temp_c"] = weather_info.get("temp_c")

        if data.get("is_festival") is None or data.get("is_holiday") is None:
            festival_info = calendar_service.get_festivals(str(data["date"]))
            if data.get("is_festival") is None:
                data["is_festival"] = festival_info["is_festival"]
            if data.get("is_holiday") is None:
                data["is_holiday"] = festival_info["is_festival"]

        if data.get("is_festival") is None:
            data["is_festival"] = False
        if data.get("is_holiday") is None:
            data["is_holiday"] = False

        forecasts, confidence_score = model_service.predict_series(
            data,
            horizon=horizon,
            periods=request.periods,
        )

        first = forecasts[0]
        recommendation = first["recommendation"]
        if request.current_stock is None:
            recommendation = "N/A"

        return app.models.schemas.PredictionResponse(
            predicted_demand=float(first["predicted_demand"]),
            recommendation=recommendation,
            confidence_score=float(confidence_score),
            horizon=horizon,
            periods=len(forecasts),
            forecasts=forecasts,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather", response_model=app.models.schemas.WeatherResponse)
async def get_weather(
    region: str = Query(..., description="Region/city name, e.g. Kathmandu"),
    date_value: date = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
):
    """Fetch weather details from WeatherAPI with graceful fallback."""
    try:
        weather_info = weather_service.get_weather(region, str(date_value))
        return app.models.schemas.WeatherResponse(
            location=region,
            date=date_value,
            condition=weather_info["condition"],
            temp_c=weather_info.get("temp_c"),
            chance_of_rain=weather_info.get("chance_of_rain"),
            humidity=weather_info.get("humidity"),
            wind_kph=weather_info.get("wind_kph"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calendar", response_model=app.models.schemas.CalendarResponse)
async def get_calendar_events(
    date_value: date = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    country: str = Query("IN", min_length=2, max_length=2, description="Country code, e.g. IN"),
    current_user: User = Depends(get_current_user),
):
    """Fetch festival/holiday details from Calendarific with graceful fallback."""
    try:
        festival_info = calendar_service.get_festivals(str(date_value), country.upper())
        return app.models.schemas.CalendarResponse(
            country=country.upper(),
            date=date_value,
            is_festival=festival_info["is_festival"],
            festivals=festival_info["festivals"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommend", response_model=app.models.schemas.InventoryStatus)
async def get_inventory_recommendations(
    region: Optional[str] = Query(default=None),
    recommendation_filter: Optional[str] = Query(default=None, alias="recommendation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get stock recommendations for all products."""
    try:
        inventory_rows = (
            db.query(InventoryItem, Product)
            .join(Product, Product.id == InventoryItem.product_id)
            .filter(Product.is_active.is_(True))
            .all()
        )

        latest_data = []
        if inventory_rows:
            for item, product in inventory_rows:
                latest_data.append(
                    {
                        "product_id": int(product.id),
                        "product_name": product.name,
                        "category": product.category,
                        "unit_price_npr": float(product.unit_price_npr or 0),
                        "shelf_life_days": product.shelf_life_days,
                        "region": item.region,
                        "current_stock": int(item.current_stock),
                        "restock_threshold": int(item.restock_threshold),
                        "weather": "Moderate",
                        "is_festival": False,
                    }
                )
            latest_data = pd.DataFrame(latest_data)
        else:
            df = model_service.load_data()
            latest_data = df.sort_values("date").groupby(["product_id", "region"]).last().reset_index()

        recommendations = []
        low_stock_count = 0
        overstock_count = 0

        for _, row in latest_data.iterrows():
            weather = row.get("weather", "Moderate")
            target_date = str(pd.Timestamp.now().date())
            if pd.isna(weather) or weather is None or str(weather).strip() == "":
                weather_info = weather_service.get_weather(row["region"], target_date)
                weather = weather_info.get("condition", "Moderate")
                temp_c = weather_info.get("temp_c")
            else:
                weather_info = weather_service.get_weather(row["region"], target_date)
                temp_c = weather_info.get("temp_c")

            festival_info = calendar_service.get_festivals(target_date)
            data = {
                "date": pd.Timestamp.now().date(),
                "product_id": int(row["product_id"]),
                "region": row["region"],
                "weather": weather,
                "temp_c": temp_c,
                "is_festival": bool(row.get("is_festival", False) or festival_info["is_festival"]),
                "is_holiday": bool(festival_info["is_festival"]),
                "is_weekend": bool(pd.Timestamp.now().dayofweek in [5, 6]),
                "economic_index": model_service._default_economic_index_for_date(pd.Timestamp.now()),
            }
            predicted_demand, _ = model_service.predict(data)
            predicted_demand_value = float(predicted_demand)
            current_stock_value = int(row["current_stock"])
            restock_threshold_value = int(row["restock_threshold"])

            stock_recommendation = model_service.get_stock_recommendation(
                predicted_demand_value,
                current_stock_value,
                restock_threshold_value
            )

            stock_gap = round(predicted_demand_value - current_stock_value, 2)
            stock_cover_days = None
            if predicted_demand_value > 0:
                stock_cover_days = round(current_stock_value / predicted_demand_value, 2)

            shortage_ratio = max(0.0, stock_gap / max(predicted_demand_value, 1.0))
            overstock_ratio = max(0.0, (current_stock_value - predicted_demand_value) / max(predicted_demand_value, 1.0))
            base_risk = min(100, int(round(shortage_ratio * 100)))

            if stock_recommendation == "Restock":
                risk_score = min(100, max(55, base_risk))
            elif stock_recommendation == "Overstock":
                risk_score = min(85, max(35, int(round(overstock_ratio * 45))))
            else:
                risk_score = min(40, base_risk // 2)

            suggested_order_qty = max(
                0,
                int(math.ceil(predicted_demand_value + restock_threshold_value - current_stock_value)),
            )

            if stock_recommendation == "Restock":
                low_stock_count += 1
            elif stock_recommendation == "Overstock":
                overstock_count += 1
            rec = app.models.schemas.StockRecommendation(
                product_id=int(row["product_id"]),
                product_name=str(row["product_name"]),
                product_category=(
                    str(row.get("category"))
                    if row.get("category") is not None and pd.notna(row.get("category"))
                    else None
                ),
                unit_price_npr=(
                    float(row.get("unit_price_npr"))
                    if row.get("unit_price_npr") is not None and pd.notna(row.get("unit_price_npr"))
                    else None
                ),
                shelf_life_days=(
                    int(row.get("shelf_life_days"))
                    if row.get("shelf_life_days") is not None and pd.notna(row.get("shelf_life_days"))
                    else None
                ),
                region=str(row["region"]),
                current_stock=current_stock_value,
                predicted_demand=predicted_demand_value,
                recommendation=stock_recommendation,
                restock_threshold=restock_threshold_value,
                stock_gap=stock_gap,
                stock_cover_days=stock_cover_days,
                risk_score=risk_score,
                suggested_order_qty=suggested_order_qty,
            )
            recommendations.append(rec)

        if region:
            recommendations = [r for r in recommendations if r.region == region]
        if recommendation_filter:
            recommendations = [r for r in recommendations if r.recommendation == recommendation_filter]

        low_stock_count = sum(1 for r in recommendations if r.recommendation == "Restock")
        overstock_count = sum(1 for r in recommendations if r.recommendation == "Overstock")
        return app.models.schemas.InventoryStatus(
            items=recommendations,
            total_items=len(recommendations),
            low_stock_count=low_stock_count,
            overstock_count=overstock_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metadata")
async def get_inventory_metadata(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get metadata required to build dynamic frontend controls."""
    try:
        products = (
            db.query(Product)
            .filter(Product.is_active.is_(True))
            .order_by(Product.name.asc())
            .all()
        )
        product_records = [
            {
                "product_id": int(p.id),
                "product_name": p.name,
                "product_code": p.product_code,
                "category": p.category,
                "unit_price_npr": float(p.unit_price_npr or 0),
                "shelf_life_days": p.shelf_life_days,
            }
            for p in products
        ]
        if not product_records:
            df = model_service.load_data()
            product_records = (
                df[["product_id", "product_name", "category"]]
                .dropna()
                .drop_duplicates()
                .sort_values(["product_name", "product_id"])
                .assign(
                    product_code=lambda x: x["product_id"].apply(lambda v: f"SKU-{int(v):04d}"),
                    unit_price_npr=0.0,
                    shelf_life_days=None,
                )
                .to_dict(orient="records")
            )

        regions = [r[0] for r in db.query(InventoryItem.region).distinct().order_by(InventoryItem.region.asc()).all()]
        if not regions:
            df = model_service.load_data()
            regions = sorted(df["region"].dropna().astype(str).unique().tolist())

        weather_conditions = ["Cold", "Moderate", "Hot", "Rainy", "Windy"]
        return {
            "products": product_records,
            "regions": regions,
            "weather_conditions": weather_conditions,
            "seasons": ["Winter", "Spring", "Summer", "Autumn"],
            "horizons": ["daily", "monthly", "yearly"],
            "recommendations": ["Restock", "Overstock", "Stock OK"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train")
async def train_model(
    request: app.models.schemas.TrainModelRequest = app.models.schemas.TrainModelRequest(),
    current_user: User = Depends(require_admin),
):
    """Train the demand forecasting model."""
    try:
        training_result = model_service.train_model(model_type=request.model_type)
        return {"message": "Model trained successfully", "training": training_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/train/options")
async def get_train_options(current_user: User = Depends(require_admin)):
    return {"models": model_service.get_supported_models()}


@router.get("/admin/users", response_model=list[app.models.schemas.UserResponse])
async def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        app.models.schemas.UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
        )
        for user in users
    ]


@router.post("/admin/users", response_model=app.models.schemas.UserResponse)
async def create_user_by_admin(
    request: app.models.schemas.AdminCreateUserRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        role = request.role.strip().lower()
        if role not in {"admin", "user"}:
            raise HTTPException(status_code=400, detail="Role must be either 'admin' or 'user'")
        user = auth_service.create_user(db, request.username.strip(), request.password, role=role)
        return app.models.schemas.UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/products", response_model=list[app.models.schemas.ProductResponse])
async def list_products(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products = db.query(Product).order_by(Product.name.asc()).all()
    return [
        app.models.schemas.ProductResponse(
            id=product.id,
            name=product.name,
            product_code=product.product_code,
            category=product.category,
            unit_price_npr=float(product.unit_price_npr or 0),
            shelf_life_days=product.shelf_life_days,
            is_active=product.is_active,
        )
        for product in products
    ]


@router.post("/products", response_model=app.models.schemas.ProductResponse)
async def create_product(
    request: app.models.schemas.ProductCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Product name is required")
    existing = db.query(Product).filter(Product.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists")
    product_code = request.product_code.strip() if request.product_code else None
    if product_code:
        existing_code = db.query(Product).filter(Product.product_code == product_code).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="Product code already exists")
    product = Product(
        name=name,
        product_code=product_code,
        category=request.category.strip() if request.category else None,
        unit_price_npr=float(request.unit_price_npr) if request.unit_price_npr is not None else 200.0,
        shelf_life_days=int(request.shelf_life_days) if request.shelf_life_days is not None else 180,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return app.models.schemas.ProductResponse(
        id=product.id,
        name=product.name,
        product_code=product.product_code,
        category=product.category,
        unit_price_npr=float(product.unit_price_npr or 0),
        shelf_life_days=product.shelf_life_days,
        is_active=product.is_active,
    )


@router.get("/inventory/records", response_model=list[app.models.schemas.InventoryRecordResponse])
async def list_inventory_records(
    region: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryItem, Product).join(Product, Product.id == InventoryItem.product_id)
    if region:
        query = query.filter(InventoryItem.region == region)
    rows = query.order_by(Product.name.asc(), InventoryItem.region.asc()).all()
    return [
        app.models.schemas.InventoryRecordResponse(
            id=item.id,
            product_id=product.id,
            product_name=product.name,
            product_code=product.product_code,
            product_category=product.category,
            unit_price_npr=float(product.unit_price_npr or 0),
            shelf_life_days=product.shelf_life_days,
            region=item.region,
            current_stock=item.current_stock,
            restock_threshold=item.restock_threshold,
        )
        for item, product in rows
    ]


@router.post("/inventory/adjust", response_model=app.models.schemas.InventoryRecordResponse)
async def adjust_inventory(
    request: app.models.schemas.InventoryAdjustRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    region = request.region.strip()
    if not region:
        raise HTTPException(status_code=400, detail="Region is required")

    record = (
        db.query(InventoryItem)
        .filter(InventoryItem.product_id == request.product_id, InventoryItem.region == region)
        .first()
    )
    if not record:
        record = InventoryItem(
            product_id=request.product_id,
            region=region,
            current_stock=0,
            restock_threshold=0,
        )
        db.add(record)
        db.flush()

    previous_stock = int(record.current_stock)
    new_stock = previous_stock + int(request.quantity_delta)
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")

    record.current_stock = new_stock
    if request.restock_threshold is not None:
        if int(request.restock_threshold) < 0:
            raise HTTPException(status_code=400, detail="restock_threshold cannot be negative")
        record.restock_threshold = int(request.restock_threshold)
    db.add(
        StockTransaction(
            product_id=request.product_id,
            region=region,
            quantity_delta=int(request.quantity_delta),
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=request.reason.strip() or "manual_adjustment",
            notes=request.notes.strip() if request.notes else None,
            performed_by_user_id=current_user.id,
        )
    )
    db.commit()
    db.refresh(record)

    return app.models.schemas.InventoryRecordResponse(
        id=record.id,
        product_id=product.id,
        product_name=product.name,
        product_code=product.product_code,
        product_category=product.category,
        unit_price_npr=float(product.unit_price_npr or 0),
        shelf_life_days=product.shelf_life_days,
        region=record.region,
        current_stock=record.current_stock,
        restock_threshold=record.restock_threshold,
    )


@router.get("/inventory/transactions", response_model=list[app.models.schemas.StockTransactionResponse])
async def list_stock_transactions(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(StockTransaction, Product)
        .join(Product, Product.id == StockTransaction.product_id)
        .order_by(StockTransaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        app.models.schemas.StockTransactionResponse(
            id=txn.id,
            product_id=txn.product_id,
            product_name=product.name,
            region=txn.region,
            quantity_delta=txn.quantity_delta,
            previous_stock=txn.previous_stock,
            new_stock=txn.new_stock,
            reason=txn.reason,
            notes=txn.notes,
            performed_by_user_id=txn.performed_by_user_id,
            created_at=txn.created_at,
        )
        for txn, product in rows
    ]


@router.get("/admin/auth-logs", response_model=list[app.models.schemas.AuthLogResponse])
async def list_auth_logs(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    logs = db.query(AuthLog).order_by(AuthLog.created_at.desc()).limit(limit).all()
    return [
        app.models.schemas.AuthLogResponse(
            id=log.id,
            user_id=log.user_id,
            username=log.username,
            event=log.event,
            success=log.success,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            created_at=log.created_at,
        )
        for log in logs
    ]
