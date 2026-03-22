import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_percentage_error
import joblib
from typing import Tuple, Dict, List
from datetime import datetime
from app.core.config import settings
from app.services.feature_engineering import FeatureEngineer


class ModelService:
    STORE_PRODUCT_MAP = {
        1: ("Rice 5kg Pack", "Staples"),
        2: ("Wheat Flour 10kg", "Staples"),
        3: ("Cooking Oil 1L", "Grocery"),
        4: ("Milk 1L", "Dairy"),
        5: ("Bread Loaf", "Bakery"),
        6: ("Eggs 12 Pack", "Dairy"),
        7: ("Sugar 1kg", "Grocery"),
        8: ("Salt 1kg", "Grocery"),
        9: ("Toor Dal 1kg", "Pulses"),
        10: ("Chana Dal 1kg", "Pulses"),
        11: ("Basmati Rice 1kg", "Staples"),
        12: ("Tea 500g", "Beverages"),
        13: ("Coffee 200g", "Beverages"),
        14: ("Biscuits Family Pack", "Snacks"),
        15: ("Instant Noodles 6 Pack", "Snacks"),
        16: ("Tomato Ketchup 500g", "Condiments"),
        17: ("Bath Soap 4 Pack", "Personal Care"),
        18: ("Shampoo 340ml", "Personal Care"),
        19: ("Toothpaste 150g", "Personal Care"),
        20: ("Laundry Detergent 1kg", "Home Care"),
        21: ("Dishwash Liquid 750ml", "Home Care"),
        22: ("Floor Cleaner 1L", "Home Care"),
        23: ("Toilet Cleaner 1L", "Home Care"),
        24: ("Tissue Roll 6 Pack", "Home Care"),
        25: ("Packaged Water 1L", "Beverages"),
        26: ("Orange Juice 1L", "Beverages"),
        27: ("Cola 2L", "Beverages"),
        28: ("Potato Chips 200g", "Snacks"),
        29: ("Chocolate Bar 100g", "Snacks"),
        30: ("Baby Diapers M 30s", "Baby Care"),
        31: ("Baby Wipes 80s", "Baby Care"),
        32: ("Hand Sanitizer 250ml", "Personal Care"),
        33: ("Face Wash 100ml", "Personal Care"),
        34: ("Body Lotion 200ml", "Personal Care"),
        35: ("Notebook A4 200 Pages", "Stationery"),
        36: ("Ball Pen 10 Pack", "Stationery"),
        37: ("LED Bulb 9W", "Electrical"),
        38: ("Extension Cord", "Electrical"),
        39: ("Aluminum Foil 72m", "Kitchen"),
        40: ("Garbage Bags 30s", "Home Care"),
        41: ("Pet Food 1kg", "Pet Care"),
        42: ("Handwash 250ml", "Personal Care"),
        43: ("Dry Fruits Mix 500g", "Grocery"),
        44: ("Oats 1kg", "Breakfast"),
        45: ("Cornflakes 500g", "Breakfast"),
    }

    def __init__(self):
        self.model = None
        self.feature_engineer = FeatureEngineer()
        self.feature_names = None
        self.model_info = None

    @staticmethod
    def _season_from_date(value) -> str:
        dt = pd.to_datetime(value, errors="coerce")
        month = int(dt.month) if pd.notna(dt) else 1
        if month in (12, 1, 2):
            return "Winter"
        if month in (3, 4, 5):
            return "Spring"
        if month in (6, 7, 8):
            return "Summer"
        return "Autumn"

    @staticmethod
    def _derive_economic_index(fuel, cpi, unemployment) -> pd.Series:
        fuel_s = pd.to_numeric(fuel, errors="coerce")
        cpi_s = pd.to_numeric(cpi, errors="coerce")
        unemp_s = pd.to_numeric(unemployment, errors="coerce")

        fuel_med = float(fuel_s.dropna().median()) if fuel_s.notna().any() else 3.0
        cpi_med = float(cpi_s.dropna().median()) if cpi_s.notna().any() else 220.0
        unemp_med = float(unemp_s.dropna().median()) if unemp_s.notna().any() else 7.0

        fuel_norm = fuel_s.fillna(fuel_med) / max(fuel_med, 0.1)
        cpi_norm = cpi_s.fillna(cpi_med) / max(cpi_med, 0.1)
        unemp_norm = unemp_s.fillna(unemp_med) / max(unemp_med, 0.1)

        economic = 100 + ((cpi_norm - 1.0) * 25) + ((fuel_norm - 1.0) * 15) - ((unemp_norm - 1.0) * 20)
        return economic.clip(lower=50, upper=170)

    @staticmethod
    def _default_economic_index_for_date(value) -> float:
        dt = pd.to_datetime(value, errors="coerce")
        if pd.isna(dt):
            return 100.0
        month = int(dt.month)
        seasonal_delta = {
            1: -2,
            2: -1,
            3: 0,
            4: 1,
            5: 2,
            6: 3,
            7: 3,
            8: 2,
            9: 1,
            10: 1,
            11: 0,
            12: -1,
        }
        return float(100 + seasonal_delta.get(month, 0))

    def load_data(self) -> pd.DataFrame:
        """Load and normalize dataset into the expected inventory schema."""
        df = pd.read_csv(settings.DATA_PATH)
        return self._normalize_dataset(df)

    def _normalize_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """Support both native inventory schema and Walmart-style sample datasets."""
        expected_cols = {
            "date",
            "product_id",
            "product_name",
            "category",
            "region",
            "weather",
            "is_festival",
            "quantity_sold",
            "current_stock",
            "restock_threshold",
        }
        if expected_cols.issubset(set(df.columns)):
            return self._coerce_inventory_schema(df.copy())

        walmart_cols = {"Store", "Date", "Weekly_Sales", "Holiday_Flag", "Temperature"}
        if walmart_cols.issubset(set(df.columns)):
            normalized = pd.DataFrame()
            normalized["date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
            normalized["product_id"] = pd.to_numeric(df["Store"], errors="coerce").fillna(0).astype(int)
            normalized["product_name"] = normalized["product_id"].map(
                lambda store_id: self.STORE_PRODUCT_MAP.get(int(store_id), (f"Product {int(store_id)}", "General"))[0]
            )
            normalized["category"] = normalized["product_id"].map(
                lambda store_id: self.STORE_PRODUCT_MAP.get(int(store_id), (f"Product {int(store_id)}", "General"))[1]
            )

            region_map = {0: "Kathmandu", 1: "Lalitpur", 2: "Biratnagar"}
            normalized["region"] = normalized["product_id"].mod(3).map(region_map)

            temp_f = pd.to_numeric(df["Temperature"], errors="coerce").fillna(70)
            normalized["temp_c"] = (temp_f - 32) * 5.0 / 9.0
            normalized["weather"] = np.select(
                [normalized["temp_c"] >= 29, normalized["temp_c"] <= 10],
                ["Hot", "Cold"],
                default="Moderate",
            )

            holiday_flag = pd.to_numeric(df["Holiday_Flag"], errors="coerce").fillna(0).astype(int)
            normalized["is_festival"] = holiday_flag.astype(bool)
            normalized["is_holiday"] = holiday_flag.astype(bool)
            normalized["quantity_sold"] = pd.to_numeric(df["Weekly_Sales"], errors="coerce").fillna(0.0)

            normalized["economic_index"] = self._derive_economic_index(
                df.get("Fuel_Price"),
                df.get("CPI"),
                df.get("Unemployment"),
            )

            normalized["restock_threshold"] = np.maximum(
                (normalized["quantity_sold"] * 0.7).round().astype(int),
                10,
            )
            normalized["current_stock"] = np.maximum(
                (normalized["quantity_sold"] * 1.1).round().astype(int),
                normalized["restock_threshold"] + 1,
            )
            normalized["season"] = normalized["date"].apply(self._season_from_date)
            normalized["is_weekend"] = normalized["date"].dt.dayofweek.isin([5, 6]).astype(int)
            normalized["recommendation"] = "Stock OK"
            return self._coerce_inventory_schema(normalized)

        raise ValueError(
            "Dataset schema is unsupported. Please provide either inventory columns "
            "or Walmart sample columns (Store, Date, Weekly_Sales, Holiday_Flag, Temperature)."
        )

    def _coerce_inventory_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize types for downstream feature engineering and API responses."""
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["product_id"] = pd.to_numeric(df["product_id"], errors="coerce").fillna(0).astype(int)
        df["product_name"] = df["product_name"].astype(str)
        df["category"] = df["category"].astype(str)
        df["region"] = df["region"].fillna("Kathmandu").astype(str)
        df["weather"] = df.get("weather", "Moderate").fillna("Moderate").astype(str)
        df["temp_c"] = pd.to_numeric(df.get("temp_c", 22.0), errors="coerce").fillna(22.0)

        df["is_festival"] = df.get("is_festival", False).fillna(False).astype(bool)
        df["is_holiday"] = df.get("is_holiday", df["is_festival"]).fillna(False).astype(bool)

        if "season" not in df.columns:
            df["season"] = df["date"].apply(self._season_from_date)
        else:
            df["season"] = df["season"].fillna(df["date"].apply(self._season_from_date)).astype(str)

        if "is_weekend" not in df.columns:
            df["is_weekend"] = df["date"].dt.dayofweek.isin([5, 6]).astype(int)
        else:
            df["is_weekend"] = pd.to_numeric(df["is_weekend"], errors="coerce").fillna(0).astype(int)

        if "economic_index" not in df.columns:
            df["economic_index"] = df["date"].apply(self._default_economic_index_for_date)
        else:
            df["economic_index"] = pd.to_numeric(df["economic_index"], errors="coerce").fillna(
                df["date"].apply(self._default_economic_index_for_date)
            )

        df["quantity_sold"] = pd.to_numeric(df["quantity_sold"], errors="coerce").fillna(0.0)
        df["current_stock"] = pd.to_numeric(df["current_stock"], errors="coerce").fillna(0).astype(int)
        df["restock_threshold"] = pd.to_numeric(df["restock_threshold"], errors="coerce").fillna(0).astype(int)

        if "recommendation" not in df.columns:
            df["recommendation"] = "Stock OK"
        return df

    def prepare_training_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features and target for training."""
        df_processed = self.feature_engineer.process_data(df)
        y = df_processed["quantity_sold"]

        X = df_processed.drop(
            ["quantity_sold", "product_name", "category", "recommendation"],
            axis=1,
            errors="ignore",
        )
        X = X.loc[:, ~X.columns.str.lower().isin(["date"])]
        X = X.select_dtypes(exclude=["datetime64[ns]", "datetime64[ns, UTC]"])
        return X, y

    def get_supported_models(self) -> Dict[str, str]:
        """Return supported model keys with display names."""
        return {
            "xgboost": "XGBoost [Primary]",
            "linear_regression": "Linear Regression [Primary]",
            "ridge_regression": "Ridge Regression [Primary]",
            "lasso_regression": "Lasso Regression [Primary]",
            "decision_tree": "Decision Tree Regressor [Non-Primary]",
            "random_forest": "Random Forest Regressor [Non-Primary]",
            "lstm": "LSTM (Neural Surrogate) [Non-Primary]",
        }

    def _build_model(self, model_type: str):
        model_type = (model_type or "xgboost").strip().lower()
        if model_type == "xgboost":
            return XGBRegressor(
                n_estimators=240,
                learning_rate=0.06,
                max_depth=5,
                subsample=0.9,
                colsample_bytree=0.9,
                random_state=42,
            )
        if model_type == "linear_regression":
            return LinearRegression()
        if model_type == "ridge_regression":
            return Ridge(alpha=1.0, random_state=42)
        if model_type == "lasso_regression":
            return Lasso(alpha=0.001, random_state=42, max_iter=5000)
        if model_type == "decision_tree":
            return DecisionTreeRegressor(max_depth=12, min_samples_leaf=2, random_state=42)
        if model_type == "random_forest":
            return RandomForestRegressor(
                n_estimators=260,
                max_depth=15,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            )
        if model_type == "lstm":
            # Neural non-linear fallback in sklearn runtime (lightweight in this stack).
            return MLPRegressor(
                hidden_layer_sizes=(128, 64),
                activation="relu",
                solver="adam",
                alpha=0.0005,
                learning_rate_init=0.001,
                max_iter=500,
                random_state=42,
            )
        raise ValueError(
            f"Unsupported model_type '{model_type}'. Supported: {', '.join(self.get_supported_models().keys())}"
        )

    def _extract_feature_importance(self, model, feature_names):
        if hasattr(model, "feature_importances_"):
            values = np.asarray(model.feature_importances_, dtype=float)
        elif hasattr(model, "coef_"):
            values = np.asarray(model.coef_, dtype=float)
            if values.ndim > 1:
                values = values[0]
            values = np.abs(values)
        else:
            values = np.zeros(len(feature_names), dtype=float)

        if len(values) != len(feature_names):
            values = np.resize(values, len(feature_names))

        pairs = sorted(
            (
                {"feature": feature_names[i], "importance": float(values[i])}
                for i in range(len(feature_names))
            ),
            key=lambda x: x["importance"],
            reverse=True,
        )
        return pairs[:10]

    def _build_learning_curve(self, X_train, y_train, X_test, y_test, model_type: str):
        train_rmse = []
        val_rmse = []
        steps = []

        n_train = len(X_train)
        if n_train < 20:
            return {"steps": [n_train], "train_rmse": [None], "val_rmse": [None]}

        fractions = np.linspace(0.15, 1.0, 8)
        unique_sizes = sorted({max(10, int(n_train * frac)) for frac in fractions})

        for size in unique_sizes:
            model_snapshot = self._build_model(model_type)
            model_snapshot.fit(X_train.iloc[:size], y_train.iloc[:size])
            train_pred = model_snapshot.predict(X_train.iloc[:size])
            test_pred = model_snapshot.predict(X_test)
            train_rmse.append(float(np.sqrt(mean_squared_error(y_train.iloc[:size], train_pred))))
            val_rmse.append(float(np.sqrt(mean_squared_error(y_test, test_pred))))
            steps.append(int(size))

        return {"steps": steps, "train_rmse": train_rmse, "val_rmse": val_rmse}

    def train_model(self, model_type: str = "xgboost") -> Dict:
        """Train selected model and return metrics + graph data."""
        df = self.load_data().copy()

        if "date" in df.columns and df["date"].notna().any():
            max_date = df["date"].max()
            one_year_back = max_date - pd.Timedelta(days=365)
            recent_df = df[df["date"] >= one_year_back]
            if len(recent_df) >= 30:
                df = recent_df

        X, y = self.prepare_training_data(df)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model_key = (model_type or "xgboost").strip().lower()
        self.model = self._build_model(model_key)
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)

        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_test, y_pred)
        mape = mean_absolute_percentage_error(y_test, y_pred)
        learning_curve = self._build_learning_curve(X_train, y_train, X_test, y_test, model_key)
        feature_importance = self._extract_feature_importance(self.model, list(X.columns))

        residuals = (y_test - y_pred).to_numpy()
        hist_counts, hist_edges = np.histogram(residuals, bins=10)
        residual_distribution = [
            {
                "range": f"{round(hist_edges[i], 2)} to {round(hist_edges[i + 1], 2)}",
                "count": int(hist_counts[i]),
            }
            for i in range(len(hist_counts))
        ]

        actual_vs_predicted = [
            {"actual": float(a), "predicted": float(p)}
            for a, p in zip(y_test.head(40).tolist(), y_pred[:40].tolist())
        ]

        joblib.dump(self.model, settings.MODEL_PATH)
        joblib.dump(list(X.columns), settings.MODEL_PATH + ".columns")
        self.model_info = {
            "model_type": model_key,
            "model_name": self.get_supported_models()[model_key],
            "trained_at": datetime.utcnow().isoformat() + "Z",
            "training_window": "last_365_days",
            "metrics": {
                "mse": float(mse),
                "rmse": float(rmse),
                "r2": float(r2),
                "mape": float(mape),
            },
        }
        joblib.dump(self.model_info, settings.MODEL_PATH + ".meta")

        return {
            "model_type": model_key,
            "model_name": self.get_supported_models()[model_key],
            "trained_at": self.model_info["trained_at"],
            "training_window": "last_365_days",
            "metrics": {
                "mse": float(mse),
                "rmse": float(rmse),
                "r2": float(r2),
                "mape": float(mape),
            },
            "charts": {
                "learning_curve": learning_curve,
                "feature_importance": feature_importance,
                "residual_distribution": residual_distribution,
                "actual_vs_predicted": actual_vs_predicted,
            },
        }

    def load_model(self):
        """Load the trained model and feature names."""
        try:
            self.model = joblib.load(settings.MODEL_PATH)
            try:
                self.feature_names = joblib.load(settings.MODEL_PATH + ".columns")
            except Exception:
                self.feature_names = None
            try:
                self.model_info = joblib.load(settings.MODEL_PATH + ".meta")
            except Exception:
                self.model_info = {"model_type": "xgboost", "model_name": "XGBoost [Primary]"}
        except FileNotFoundError:
            raise Exception("Model not found. Please train the model first.")

    def _get_model_expected_feature_names(self):
        """Prefer model-native feature names to avoid stale .columns mismatch."""
        if self.model is not None and hasattr(self.model, "feature_names_in_"):
            names = list(getattr(self.model, "feature_names_in_"))
            if names:
                return names

        if self.model is not None and hasattr(self.model, "get_booster"):
            try:
                booster_names = self.model.get_booster().feature_names
                if booster_names:
                    return list(booster_names)
            except Exception:
                pass

        if self.feature_names:
            return list(self.feature_names)
        return None

    def _prepare_point_data(self, data: Dict) -> Dict:
        payload = dict(data)
        payload_date = pd.to_datetime(payload.get("date"), errors="coerce")
        if pd.isna(payload_date):
            payload_date = pd.Timestamp.now().normalize()
        payload["date"] = payload_date

        payload["season"] = payload.get("season") or self._season_from_date(payload_date)
        if payload.get("is_weekend") is None:
            payload["is_weekend"] = bool(payload_date.dayofweek in [5, 6])
        if payload.get("is_holiday") is None:
            payload["is_holiday"] = bool(payload.get("is_festival", False))
        if payload.get("economic_index") is None:
            payload["economic_index"] = self._default_economic_index_for_date(payload_date)
        if payload.get("temp_c") is None:
            payload["temp_c"] = 22.0
        if payload.get("weather") is None:
            payload["weather"] = "Moderate"
        return payload

    def predict(self, data: Dict) -> Tuple[float, float]:
        """Make a prediction for given input data."""
        if self.model is None or self.feature_names is None:
            self.load_model()

        prepared = self._prepare_point_data(data)
        features = self.feature_engineer.prepare_prediction_features(prepared)

        features = features.loc[:, ~features.columns.str.lower().isin(["date"])]
        features = features.select_dtypes(exclude=["datetime64[ns]", "datetime64[ns, UTC]"])

        expected_feature_names = self._get_model_expected_feature_names()
        if expected_feature_names:
            features = features.reindex(expected_feature_names, axis=1, fill_value=0)
        elif self.feature_names:
            features = features.reindex(self.feature_names, axis=1, fill_value=0)

        features = features.apply(pd.to_numeric, errors="coerce").fillna(0)

        prediction = float(self.model.predict(features)[0])

        if hasattr(self.model, "feature_importances_"):
            feature_values = np.abs(np.asarray(self.model.feature_importances_, dtype=float))
        elif hasattr(self.model, "coef_"):
            coef = np.asarray(self.model.coef_, dtype=float)
            if coef.ndim > 1:
                coef = coef[0]
            feature_values = np.abs(coef)
        else:
            feature_values = np.array([0.35], dtype=float)
        confidence_score = float(np.clip(np.mean(feature_values), 0.05, 0.99))

        return max(0.0, prediction), confidence_score

    @staticmethod
    def _advance_date(base_date: pd.Timestamp, horizon: str, step: int) -> pd.Timestamp:
        h = (horizon or "daily").strip().lower()
        if h == "monthly":
            return base_date + pd.DateOffset(months=step)
        if h == "yearly":
            return base_date + pd.DateOffset(years=step)
        return base_date + pd.Timedelta(days=step)

    @staticmethod
    def _period_label(value: pd.Timestamp, horizon: str) -> str:
        h = (horizon or "daily").strip().lower()
        if h == "monthly":
            return value.strftime("%Y-%m")
        if h == "yearly":
            return value.strftime("%Y")
        return value.strftime("%Y-%m-%d")

    def predict_series(self, data: Dict, horizon: str = "daily", periods: int = 1) -> Tuple[List[Dict], float]:
        h = (horizon or "daily").strip().lower()
        if h not in {"daily", "monthly", "yearly"}:
            h = "daily"

        max_periods = {"daily": 366, "monthly": 60, "yearly": 15}[h]
        periods = max(1, min(int(periods or 1), max_periods))

        base = self._prepare_point_data(data)
        base_date = pd.to_datetime(base["date"], errors="coerce")
        if pd.isna(base_date):
            base_date = pd.Timestamp.now().normalize()

        running_stock = int(base.get("current_stock") or 0)
        restock_threshold = int(base.get("restock_threshold") or 60)

        forecast = []
        confidence_values = []

        for step in range(periods):
            point_date = self._advance_date(base_date, h, step)
            point_data = dict(base)
            point_data["date"] = point_date
            point_data["season"] = self._season_from_date(point_date)
            point_data["is_weekend"] = bool(point_date.dayofweek in [5, 6])

            pred, conf = self.predict(point_data)
            confidence_values.append(conf)
            recommendation = self.get_stock_recommendation(pred, running_stock, restock_threshold)

            forecast.append(
                {
                    "period_label": self._period_label(point_date, h),
                    "date": point_date.date(),
                    "predicted_demand": float(pred),
                    "recommendation": recommendation,
                }
            )

            running_stock = max(0, running_stock - int(round(pred)))

        avg_confidence = float(np.mean(confidence_values)) if confidence_values else 0.5
        return forecast, avg_confidence

    def get_stock_recommendation(self, predicted_demand: float, current_stock: int, restock_threshold: int) -> str:
        """Generate stock recommendation based on predicted demand and current stock."""
        if current_stock <= restock_threshold:
            return "Restock"
        if current_stock > predicted_demand * 2:
            return "Overstock"
        return "Stock OK"
