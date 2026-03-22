from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Smart Inventory Management System"
    
    # External API Keys
    WEATHERAPI_KEY: Optional[str] = os.getenv("WEATHERAPI_KEY")
    CALENDARIFIC_API_KEY: Optional[str] = os.getenv("CALENDARIFIC_API_KEY")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app/data/sims.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    
    # Model Settings
    MODEL_PATH: str = "app/models/xgboost_model.joblib"
    DATA_PATH: str = "app/data/smart_inventory_stock_dataset.csv"
    
    # Feature Engineering Settings
    LAG_FEATURES: list = [1, 3, 7]  # Days to look back
    ROLLING_WINDOWS: list = [3, 7, 14]  # Rolling window sizes
    
    class Config:
        case_sensitive = True

settings = Settings() 
