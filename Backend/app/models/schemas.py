from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class PredictionRequest(BaseModel):
    date: date
    product_id: int
    region: str
    weather: Optional[str] = None
    temp_c: Optional[float] = None
    season: Optional[str] = None
    is_festival: Optional[bool] = None
    is_holiday: Optional[bool] = None
    is_weekend: Optional[bool] = None
    economic_index: Optional[float] = None
    current_stock: Optional[int] = None
    horizon: str = "daily"
    periods: int = 1


class ForecastPoint(BaseModel):
    period_label: str
    date: date
    predicted_demand: float
    recommendation: str

class PredictionResponse(BaseModel):
    predicted_demand: float
    recommendation: str
    confidence_score: float
    horizon: str
    periods: int
    forecasts: List[ForecastPoint] = Field(default_factory=list)

class StockRecommendation(BaseModel):
    product_id: int
    product_name: str
    product_category: Optional[str] = None
    unit_price_npr: Optional[float] = None
    shelf_life_days: Optional[int] = None
    region: str
    current_stock: int
    predicted_demand: float
    recommendation: str
    restock_threshold: int
    stock_gap: float
    stock_cover_days: Optional[float] = None
    risk_score: int
    suggested_order_qty: int

class InventoryStatus(BaseModel):
    items: List[StockRecommendation]
    total_items: int
    low_stock_count: int
    overstock_count: int

class WeatherResponse(BaseModel):
    location: str
    date: date
    condition: str
    temp_c: Optional[float] = None
    chance_of_rain: Optional[int] = None
    humidity: Optional[int] = None
    wind_kph: Optional[float] = None

class CalendarResponse(BaseModel):
    country: str
    date: date
    is_festival: bool
    festivals: List[str] = Field(default_factory=list)

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    username: str
    role: str
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool


class AdminCreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


class ProductCreateRequest(BaseModel):
    name: str
    product_code: Optional[str] = None
    category: Optional[str] = None
    unit_price_npr: Optional[float] = None
    shelf_life_days: Optional[int] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    product_code: Optional[str] = None
    category: Optional[str] = None
    unit_price_npr: float
    shelf_life_days: Optional[int] = None
    is_active: bool


class InventoryRecordResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_code: Optional[str] = None
    product_category: Optional[str] = None
    unit_price_npr: float = 0.0
    shelf_life_days: Optional[int] = None
    region: str
    current_stock: int
    restock_threshold: int


class InventoryAdjustRequest(BaseModel):
    product_id: int
    region: str
    quantity_delta: int
    restock_threshold: Optional[int] = None
    reason: str = "manual_adjustment"
    notes: Optional[str] = None


class StockTransactionResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    region: str
    quantity_delta: int
    previous_stock: int
    new_stock: int
    reason: str
    notes: Optional[str] = None
    performed_by_user_id: Optional[int] = None
    created_at: datetime


class AuthLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: str
    event: str
    success: bool
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime


class TrainModelRequest(BaseModel):
    model_type: str = "xgboost"
