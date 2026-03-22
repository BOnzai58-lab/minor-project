import pandas as pd
import numpy as np
from typing import List, Dict
from app.core.config import settings

class FeatureEngineer:
    def __init__(self):
        self.lag_features = settings.LAG_FEATURES
        self.rolling_windows = settings.ROLLING_WINDOWS
        self.categorical_columns = ['product_id', 'region', 'weather', 'season']

    @staticmethod
    def _season_from_month(month: int) -> str:
        month = int(month or 1)
        if month in (12, 1, 2):
            return "Winter"
        if month in (3, 4, 5):
            return "Spring"
        if month in (6, 7, 8):
            return "Summer"
        return "Autumn"
        
    def create_lag_features(self, df: pd.DataFrame, group_cols: List[str]) -> pd.DataFrame:
        """Create lag features for specified columns."""
        for lag in self.lag_features:
            df[f'quantity_sold_lag_{lag}'] = df.groupby(group_cols)['quantity_sold'].shift(lag)
        return df
    
    def create_rolling_features(self, df: pd.DataFrame, group_cols: List[str]) -> pd.DataFrame:
        """Create rolling window features."""
        for window in self.rolling_windows:
            df[f'quantity_sold_rolling_mean_{window}'] = df.groupby(group_cols)['quantity_sold'].transform(
                lambda x: x.rolling(window=window, min_periods=1).mean()
            )
            df[f'quantity_sold_rolling_std_{window}'] = df.groupby(group_cols)['quantity_sold'].transform(
                lambda x: x.rolling(window=window, min_periods=1).std()
            )
        return df
    
    def encode_categorical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode categorical features using one-hot encoding."""
        for col in self.categorical_columns:
            if col in df.columns:
                dummies = pd.get_dummies(df[col], prefix=col)
                df = pd.concat([df, dummies], axis=1)
                df = df.drop(col, axis=1)
        return df
    
    def create_date_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create date-based features."""
        df['date'] = pd.to_datetime(df['date'])
        df['day_of_week'] = df['date'].dt.dayofweek
        df['month'] = df['date'].dt.month
        df['day_of_month'] = df['date'].dt.day
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        if 'season' not in df.columns:
            df['season'] = df['month'].apply(self._season_from_month)
        else:
            df['season'] = df['season'].fillna(df['month'].apply(self._season_from_month)).astype(str)
        return df
    
    def process_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process the entire dataset."""
        if 'is_holiday' not in df.columns:
            df['is_holiday'] = df.get('is_festival', False)
        if 'economic_index' not in df.columns:
            df['economic_index'] = 100.0
        if 'temp_c' not in df.columns:
            df['temp_c'] = 22.0
        if 'weather' not in df.columns:
            df['weather'] = "Moderate"
        if 'is_festival' not in df.columns:
            df['is_festival'] = False

        # Create date features
        df = self.create_date_features(df)
        
        # Create lag features
        group_cols = ['product_id', 'region']
        df = self.create_lag_features(df, group_cols)
        
        # Create rolling features
        df = self.create_rolling_features(df, group_cols)
        
        # Encode categorical features
        df = self.encode_categorical_features(df)
        
        # Fill missing values
        df = df.ffill()
        df = df.fillna(0)  # Fill any remaining NaNs with 0

        for col in ['is_weekend', 'is_holiday', 'is_festival']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

        if 'economic_index' in df.columns:
            df['economic_index'] = pd.to_numeric(df['economic_index'], errors='coerce').fillna(100.0)
        if 'temp_c' in df.columns:
            df['temp_c'] = pd.to_numeric(df['temp_c'], errors='coerce').fillna(22.0)
        
        return df
    
    def prepare_prediction_features(self, data: Dict) -> pd.DataFrame:
        """Prepare features for a single prediction."""
        # Convert input data to DataFrame
        df = pd.DataFrame([data])

        if 'weather' not in df.columns:
            df['weather'] = "Moderate"
        if 'temp_c' not in df.columns:
            df['temp_c'] = 22.0
        if 'is_festival' not in df.columns:
            df['is_festival'] = False
        if 'is_holiday' not in df.columns:
            df['is_holiday'] = False
        if 'economic_index' not in df.columns:
            df['economic_index'] = 100.0
        if 'current_stock' not in df.columns:
            df['current_stock'] = 0
        if 'restock_threshold' not in df.columns:
            df['restock_threshold'] = 0
        
        # Create date features
        df = self.create_date_features(df)

        if 'is_weekend' not in df.columns:
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        if 'season' not in df.columns:
            df['season'] = df['month'].apply(self._season_from_month)
        
        # Encode categorical features
        df = self.encode_categorical_features(df)

        for col in ['is_weekend', 'is_holiday', 'is_festival']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
        if 'economic_index' in df.columns:
            df['economic_index'] = pd.to_numeric(df['economic_index'], errors='coerce').fillna(100.0)
        if 'temp_c' in df.columns:
            df['temp_c'] = pd.to_numeric(df['temp_c'], errors='coerce').fillna(22.0)
        if 'current_stock' in df.columns:
            df['current_stock'] = pd.to_numeric(df['current_stock'], errors='coerce').fillna(0)
        if 'restock_threshold' in df.columns:
            df['restock_threshold'] = pd.to_numeric(df['restock_threshold'], errors='coerce').fillna(0)
        
        return df 
