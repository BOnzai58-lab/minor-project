import requests
from app.core.config import settings


class WeatherService:
    WEATHERAPI_URL = "http://api.weatherapi.com/v1/forecast.json"
    OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    REGION_COORDS = {
        "Kathmandu": (27.7172, 85.3240),
        "Lalitpur": (27.6644, 85.3188),
        "Biratnagar": (26.4525, 87.2718),
    }

    WEATHER_CODE_MAP = {
        0: "Clear",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing Rime Fog",
        51: "Light Drizzle",
        53: "Moderate Drizzle",
        55: "Dense Drizzle",
        61: "Slight Rain",
        63: "Moderate Rain",
        65: "Heavy Rain",
        71: "Slight Snow",
        73: "Moderate Snow",
        75: "Heavy Snow",
        80: "Rain Showers",
        81: "Moderate Rain Showers",
        82: "Violent Rain Showers",
        95: "Thunderstorm",
    }

    def get_weather(self, location: str, date: str):
        # Primary provider: WeatherAPI (if key exists)
        if settings.WEATHERAPI_KEY:
            weatherapi_result = self._get_from_weatherapi(location, date)
            if weatherapi_result:
                return weatherapi_result

        # Fallback provider: Open-Meteo (no API key required)
        open_meteo_result = self._get_from_open_meteo(location, date)
        if open_meteo_result:
            return open_meteo_result

        return {
            "condition": "Moderate",
            "temp_c": None,
            "chance_of_rain": None,
            "humidity": None,
            "wind_kph": None,
        }

    def _get_from_weatherapi(self, location: str, date: str):
        params = {
            "key": settings.WEATHERAPI_KEY,
            "q": location,
            "dt": date,
        }
        try:
            response = requests.get(self.WEATHERAPI_URL, params=params, timeout=8)
            response.raise_for_status()
            data = response.json()
            day_data = data["forecast"]["forecastday"][0]["day"]
            return {
                "condition": day_data["condition"]["text"],
                "temp_c": day_data.get("avgtemp_c"),
                "chance_of_rain": int(day_data.get("daily_chance_of_rain"))
                if day_data.get("daily_chance_of_rain") is not None
                else None,
                "humidity": int(round(day_data.get("avghumidity")))
                if day_data.get("avghumidity") is not None
                else None,
                "wind_kph": float(day_data.get("maxwind_kph"))
                if day_data.get("maxwind_kph") is not None
                else None,
            }
        except Exception:
            return None

    def _get_from_open_meteo(self, location: str, date: str):
        coords = self._coords_for_location(location)
        if not coords:
            return None
        lat, lon = coords

        params = {
            "latitude": lat,
            "longitude": lon,
            "timezone": "auto",
            "start_date": date,
            "end_date": date,
            "daily": ",".join(
                [
                    "weather_code",
                    "temperature_2m_mean",
                    "precipitation_probability_max",
                    "relative_humidity_2m_mean",
                    "wind_speed_10m_max",
                ]
            ),
        }
        try:
            response = requests.get(self.OPEN_METEO_FORECAST_URL, params=params, timeout=8)
            response.raise_for_status()
            data = response.json()
            daily = data.get("daily", {})
            weather_code = self._first(daily.get("weather_code"))
            return {
                "condition": self.WEATHER_CODE_MAP.get(int(weather_code), "Moderate")
                if weather_code is not None
                else "Moderate",
                "temp_c": self._to_float(self._first(daily.get("temperature_2m_mean"))),
                "chance_of_rain": self._to_int(self._first(daily.get("precipitation_probability_max"))),
                "humidity": self._to_int(self._first(daily.get("relative_humidity_2m_mean"))),
                "wind_kph": self._to_float(self._first(daily.get("wind_speed_10m_max"))),
            }
        except Exception:
            return None

    def _coords_for_location(self, location: str):
        loc = (location or "").strip()
        if loc in self.REGION_COORDS:
            return self.REGION_COORDS[loc]
        return self.REGION_COORDS.get("Kathmandu")

    @staticmethod
    def _first(value):
        if isinstance(value, list) and value:
            return value[0]
        return value

    @staticmethod
    def _to_float(value):
        try:
            return float(value) if value is not None else None
        except Exception:
            return None

    @staticmethod
    def _to_int(value):
        try:
            return int(round(float(value))) if value is not None else None
        except Exception:
            return None
