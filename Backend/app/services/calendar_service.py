import requests
from app.core.config import settings


class CalendarService:
    BASE_URL = "https://calendarific.com/api/v2/holidays"

    def get_festivals(self, date: str, country: str = "IN"):
        if not settings.CALENDARIFIC_API_KEY:
            return {"is_festival": False, "festivals": []}

        year, month, day = date.split("-")
        params = {
            "api_key": settings.CALENDARIFIC_API_KEY,
            "country": country,
            "year": int(year),
            "month": int(month),
            "day": int(day),
        }

        try:
            response = requests.get(self.BASE_URL, params=params, timeout=8)
            response.raise_for_status()
            data = response.json()
            holidays = data.get("response", {}).get("holidays", [])
            festivals = [holiday.get("name") for holiday in holidays if holiday.get("name")]
            return {"is_festival": len(festivals) > 0, "festivals": festivals}
        except Exception:
            return {"is_festival": False, "festivals": []}
