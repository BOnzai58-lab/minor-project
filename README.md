# Smart Inventory Management System (SIMS)

A production-style full-stack application for **inventory management + demand forecasting**.

This project is built to help operations teams answer two practical questions every day:

1. **What do we currently have?** (stock, thresholds, transactions, product metadata)
2. **What will we need next?** (daily/monthly/yearly demand forecasts with risk-aware recommendations)

---

## Why This Project Exists

Most inventory tools stop at dashboards. Most ML demos stop at charts.

SIMS combines both:
- A usable inventory workflow (products, stock adjustments, threshold control, logs, audit)
- Forecasting that considers business context (seasonality, weather, holidays, weekends, economic pressure)

Result: operations and analytics in one system.

---

## What SIMS Delivers

### 1) Inventory Management (Operational Layer)
- Product catalog management (name, code/ID, category, unit price, shelf life)
- Region-wise stock records
- Stock increment/decrement transactions
- Restock threshold updates
- Full stock transaction history
- Admin auth log monitoring

### 2) Forecasting & Decision Support (Intelligence Layer)
- Demand prediction with multiple horizons:
  - `daily`
  - `monthly`
  - `yearly`
- Uses external and temporal factors:
  - Temperature
  - Seasons
  - Holidays
  - Festivals
  - Weekends
  - Economic index
- Risk-based recommendation output:
  - `Restock`
  - `Overstock`
  - `Stock OK`

### 3) Training Pipeline
- Training window uses **last 365 days** (latest year of data)
- Model training from UI (admin panel)
- Model metrics and charts exposed after training

---

## Primary and Secondary Models

### Primary models
- Linear Regression
- Ridge Regression
- Lasso Regression
- XGBoost

### Non-primary models
- Decision Tree Regressor
- Random Forest Regressor
- LSTM-style neural fallback (implemented as a neural surrogate in current sklearn stack)

> Note: In this codebase, the LSTM slot is served by a neural regressor (`MLPRegressor`) to keep deployment simple in the existing dependency profile.

---

## Tech Stack

### Backend
- Python 3.9+
- FastAPI
- SQLAlchemy
- PostgreSQL (Docker) / SQLite fallback option in config
- scikit-learn
- XGBoost
- Pandas, NumPy
- Joblib
- python-jose (JWT)
- passlib+bcrypt (password hashing)

### Frontend
- React 18
- MUI (Material UI)
- MUI DataGrid
- Chart.js + react-chartjs-2
- Axios
- react-router-dom

### Deployment / Runtime
- Docker
- Docker Compose
- Nginx (frontend serving + API proxy)

### External Data Providers
- WeatherAPI (primary weather)
- Open-Meteo (weather fallback)
- Calendarific (festival/holiday context)

---

## High-Level Architecture

```text
React Frontend  --->  FastAPI Backend  --->  PostgreSQL
       |                     |                  |
       |                     |                  +-- users/products/inventory/logs
       |                     |
       |                     +-- ML service (train + predict)
       |                     +-- CSV dataset ingestion
       |                     +-- model artifacts (.joblib/.columns/.meta)
       |                     +-- weather + calendar integrations
       |
       +-- dashboards, forms, admin workflows, forecasting UX
```

---

## Repository Structure

```text
Backend/
  app/
    api/            # Route layer and auth dependencies
    core/           # Settings / config
    db/             # DB engine, models, startup seeding/migration
    data/           # Dataset CSV
    models/         # Pydantic schemas + persisted model artifacts
    services/       # Auth, model, feature engineering, weather, calendar

frontend/
  src/
    components/     # Layout and route protection
    context/        # Auth state provider
    pages/          # Login, Dashboard, Inventory, Predictions, AdminPanel
    services/       # API client wrappers
  nginx.conf        # Frontend serving + API reverse proxy

docker-compose.yml  # Full stack orchestration
README.md
```

---

## Core Business Data Model

### Product
- `name`
- `product_code` (ID/code)
- `category`
- `unit_price_npr`
- `shelf_life_days`
- `is_active`

### InventoryItem
- `product_id`
- `region`
- `current_stock`
- `restock_threshold`

### StockTransaction
- `product_id`, `region`
- `quantity_delta`
- `previous_stock`, `new_stock`
- `reason`, `notes`
- `performed_by_user_id`

### User / AuthLog
- role-based access (`admin`, `user`)
- login attempt auditing

---

## External Factors Used in Forecasting

Forecast input can include:
- `temp_c`
- `season`
- `is_holiday`
- `is_festival`
- `is_weekend`
- `economic_index`

If some fields are not provided:
- weather is fetched from provider
- holiday/festival is inferred from calendar API
- season/weekend/economic defaults are generated from date context

---

## API Reference (SIMS)

All APIs are prefixed by `/api`.

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Forecasting and Insights
- `POST /predict` (supports `daily`, `monthly`, `yearly` + `periods`)
- `GET /recommend`
- `GET /metadata`
- `GET /weather`
- `GET /calendar`

### Model Management
- `POST /train` (admin)
- `GET /train/options` (admin)

### Inventory + Product Management
- `GET /products`
- `POST /products` (admin)
- `GET /inventory/records`
- `POST /inventory/adjust` (admin)
- `GET /inventory/transactions` (admin)

### Admin Management / Audit
- `GET /admin/users` (admin)
- `POST /admin/users` (admin)
- `GET /admin/auth-logs` (admin)

---

## Frontend Pages and Purpose

- **Login**: authentication and account onboarding
- **Dashboard**: KPI monitoring, demand trends, weather insights
- **Predictions**: configurable forecasting (daily/monthly/yearly, custom factors)
- **Inventory**: risk table and action prioritization
- **Admin Panel**: users/products/stock operations + model training

---

## Run with Docker (Recommended)

### Prerequisites
- Docker
- Docker Compose

### 1) Configure environment
Create `.env` in project root:

```env
WEATHERAPI_KEY=your_weatherapi_key
CALENDARIFIC_API_KEY=your_calendarific_api_key
SECRET_KEY=your_secret_key
```

### 2) Start stack
```bash
docker-compose up --build
```

### 3) Open
- Frontend: `http://localhost`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

---

## Run Locally (Development)

### Backend
```bash
cd Backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

Frontend dev server runs at `http://localhost:3000` by default.

---

## Typical Workflow (Admin)

1. Login as admin
2. Create products with metadata (code, category, price, shelf life)
3. Adjust inventory and restock thresholds by region
4. Train model (choose primary/non-primary algorithm)
5. Validate metrics and charts
6. Use Inventory and Predictions pages for daily operations and planning

---

## Typical Workflow (Operations/User)

1. Login
2. Monitor low-stock and overstock risks in Inventory
3. Run horizon-specific forecast from Predictions
4. Use recommendation output to plan purchase/replenishment

---

## Current Notes

- Dataset normalization supports both native inventory schema and Walmart-style sample schema.
- Weather and holiday calls fail gracefully; system uses defaults when APIs are unavailable.
- Forecasting returns both a summary and per-period forecast points.

---

## Security and Access

- JWT-based authentication
- Role-based authorization
- Password hashing with bcrypt
- Admin-only controls for training and master data writes

---

## Future Enhancements

- Native deep learning LSTM training pipeline
- Automated retraining scheduler
- Multi-warehouse balancing optimization
- Vendor lead-time aware replenishment planning
- Cost/profit simulation on forecast outputs

---

## License

This repository currently does not include a formal license file.
Add one (e.g., MIT/Apache-2.0) before public redistribution.

---

## Authoring Note

This README is intentionally written in a practical, human-readable format so both technical and non-technical stakeholders can understand how SIMS is built, why it exists, and how to operate it end-to-end.
