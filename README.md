# Smart Inventory Management System

A full-stack application for intelligent inventory management and demand forecasting.

---

## Tools & Technologies Used

### Backend
- **Python 3.9**: Core backend language.
- **FastAPI**: High-performance API framework for auth, prediction, inventory, and admin endpoints.
- **XGBoost**: Primary gradient boosting model for demand forecasting.
- **Pandas**: Dataset loading, preprocessing, and feature transformation.
- **NumPy**: Numerical operations for feature engineering and metrics.
- **Scikit-learn**: Linear/Ridge/Lasso/DecisionTree/RandomForest models, metrics, and train/test split.
- **Pydantic & pydantic-settings**: API data validation and environment-driven configuration.
- **Joblib**: Model artifact persistence (`.joblib`, `.columns`, `.meta`).
- **Requests**: Integration with weather and holiday APIs.
- **Python-dotenv**: `.env` loading for API keys and app secrets.
- **Uvicorn**: ASGI server for running FastAPI.
- **SQLAlchemy**: ORM and DB session handling for users/products/inventory/logs.
- **python-jose + passlib + bcrypt**: JWT token handling and password hashing.

### Frontend
- **React**: SPA frontend architecture.
- **Material-UI (MUI)**: UI components and responsive layout.
- **@mui/x-date-pickers**: Date input controls for prediction and weather forms.
- **Chart.js + react-chartjs-2**: Forecast and training visualizations.
- **Axios**: API communication layer with token support.
- **react-router-dom**: Role-based route navigation.

### DevOps & Deployment
- **Docker**: Containerization of backend and frontend.
- **Docker Compose**: Multi-service orchestration (Postgres, backend, frontend).
- **Nginx**: Serves frontend and proxies API requests.
- **PostgreSQL**: Primary runtime database for inventory operations and logs.

### Other
- **Git & GitHub**: Source control and collaboration.
- **VSCode** (recommended): Development IDE.

---

## Step-by-Step Setup & Development Process

### 1. Project Initialization
- Set up project directories for backend and frontend.
- Initialize Git and create `.gitignore` rules.

### 2. Backend Setup
- Structured FastAPI modules (`api`, `core`, `db`, `models`, `services`).
- Added backend dependencies in `Backend/requirements.txt`.
- Implemented environment-driven settings with `pydantic-settings` + `.env`.
- Built feature engineering pipeline:
  - lag features
  - rolling statistics
  - categorical encoding
  - date/weekend/season features
  - economic/context factors
- Implemented model training + loading with feature alignment.
- Exposed REST APIs for:
  - auth/session
  - demand prediction
  - inventory recommendation
  - model training
  - admin management
- Integrated WeatherAPI/Open-Meteo and Calendarific.
- Added backend Dockerfile.

### 3. Frontend Setup
- Built React UI with MUI and Chart.js.
- Implemented pages:
  - Login
  - Dashboard
  - Predictions
  - Inventory
  - Admin Panel
- Added API service layer with Axios and auth token handling.
- Added frontend Dockerfile and Nginx config.

### 4. Data & Model
- Uses CSV dataset for sales/inventory forecasting baseline.
- Supports schema normalization for Walmart-style sample datasets.
- Stores model files and metadata for consistent inference.
- Training window configured to prioritize **last 1 year** data.

### 5. Deployment
- `docker-compose.yml` orchestrates database, backend, and frontend.
- Volume mapping is used for model/data persistence.
- External API key support via environment variables.

### 6. Testing & Debugging
- FastAPI docs (`/docs`) for endpoint testing.
- Validation and type coercion for robust prediction payloads.
- Frontend error handling for API failures and invalid inputs.

### 7. Version Control
- Git-based workflow for commit history and branch management.
- Ignore rules for generated files and environment artifacts.

---

## Features

### Inventory Management
- Product management with metadata:
  - Product Name
  - Product ID / Code
  - Product Category
  - Pricing
  - Shelf Life
- Inventory records by region
- Stock adjustment with transaction logs
- Threshold-based replenishment control

### Demand Forecasting
- Prediction horizons:
  - Daily
  - Monthly
  - Yearly
- External factors considered:
  - Temperature
  - Seasons
  - Holidays/Festivals
  - Weekends
  - Economic indicators

### Model Ecosystem
- **Primary models**:
  - Linear Regression
  - Ridge Regression
  - Lasso Regression
  - XGBoost
- **Non-primary models**:
  - Decision Tree Regressor
  - Random Forest Regressor
  - LSTM-style neural surrogate in current stack

### Analytics & Operations
- Recommendation output (`Restock`, `Overstock`, `Stock OK`)
- Dashboard KPIs and visual trend charts
- Admin control plane for users, products, stock, and training

---

## Tech Stack (Quick View)

### Backend
- Python 3.9
- FastAPI
- SQLAlchemy
- XGBoost
- Scikit-learn
- Pandas / NumPy

### Frontend
- React
- Material-UI
- Chart.js
- Axios

### Infra
- Docker
- Docker Compose
- Nginx
- PostgreSQL

---

## Prerequisites

- Docker and Docker Compose
- Python 3.9+ (for local backend development)
- Node.js 16+ (for local frontend development)
- API keys for:
  - WeatherAPI
  - Calendarific

---

## Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd smart_inventory_management_system-main
```

### 2. Create `.env` in root
```env
WEATHERAPI_KEY=your_weatherapi_key
CALENDARIFIC_API_KEY=your_calendarific_api_key
SECRET_KEY=your_secret_key
```

### 3. Ensure dataset exists
Expected path:
```bash
Backend/app/data/smart_inventory_stock_dataset.csv
```

### 4. Build and run with Docker Compose
```bash
docker-compose up --build
```

Application endpoints:
- Frontend: `http://localhost`
- Backend API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

---

## Development

### Backend Development

1. Create virtual environment:
```bash
cd Backend
python -m venv .venv
```

2. Activate virtual environment:
```bash
# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run backend server:
```bash
uvicorn app.main:app --reload
```

### Frontend Development

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start development server:
```bash
npm start
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Forecasting & Context
- `POST /api/predict` - Demand prediction with daily/monthly/yearly horizon
- `GET /api/recommend` - Inventory recommendations
- `GET /api/metadata` - Product/region/weather/horizon metadata
- `GET /api/weather` - Weather fetch
- `GET /api/calendar` - Holiday/festival fetch

### Training
- `POST /api/train` - Train selected forecasting model (admin)
- `GET /api/train/options` - Available training models (admin)

### Inventory & Product Management
- `GET /api/products`
- `POST /api/products` (admin)
- `GET /api/inventory/records`
- `POST /api/inventory/adjust` (admin)
- `GET /api/inventory/transactions` (admin)

### Admin
- `GET /api/admin/users` (admin)
- `POST /api/admin/users` (admin)
- `GET /api/admin/auth-logs` (admin)

---

## Testing

### Backend Tests
```bash
cd Backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## Deployment

The application is containerized and can be deployed to any cloud platform supporting Docker.

### Build images
```bash
docker-compose build
```

### Example push to container registry
```bash
docker tag smart-inventory-management_backend your-registry/backend:latest
docker tag smart-inventory-management_frontend your-registry/frontend:latest
docker push your-registry/backend:latest
docker push your-registry/frontend:latest
```

### Deploy
Use the provided `docker-compose.yml` or equivalent orchestrator manifests.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

---

## License

This project is licensed under the MIT License (add `LICENSE` file if not present in your repo).

---

## Purpose Summary

This system is built as a practical bridge between:
- **inventory operations** (what stock exists, what needs replenishment), and
- **predictive intelligence** (what demand is expected next by day/month/year).

It is designed for teams that need both operational control and forecasting in one workflow.
