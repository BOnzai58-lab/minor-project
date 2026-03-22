import json
import sqlite3
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "styleorbit.db"


def utc_now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL,
              name TEXT NOT NULL,
              role TEXT NOT NULL,
              password TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS shops (
              id TEXT PRIMARY KEY,
              owner_id TEXT NOT NULL,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              legal_owner_name TEXT,
              contact_phone TEXT,
              pan_number TEXT,
              vat_number TEXT,
              citizenship_number TEXT,
              document_url TEXT,
              city TEXT NOT NULL,
              insta_id TEXT NOT NULL,
              page_url TEXT,
              image TEXT,
              description TEXT,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS favorites (
              user_id TEXT NOT NULL,
              shop_id TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              PRIMARY KEY (user_id, shop_id)
            );

            CREATE TABLE IF NOT EXISTS reviews (
              id TEXT PRIMARY KEY,
              shop_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              rating INTEGER NOT NULL,
              comment TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
              id TEXT PRIMARY KEY,
              action TEXT NOT NULL,
              detail TEXT NOT NULL,
              actor_id TEXT,
              at_ts TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            """
        )

        cols = {row["name"] for row in conn.execute("PRAGMA table_info(shops)").fetchall()}
        if "page_url" not in cols:
            conn.execute("ALTER TABLE shops ADD COLUMN page_url TEXT")
        if "legal_owner_name" not in cols:
            conn.execute("ALTER TABLE shops ADD COLUMN legal_owner_name TEXT")
        if "contact_phone" not in cols:
            conn.execute("ALTER TABLE shops ADD COLUMN contact_phone TEXT")
        if "pan_number" not in cols:
            conn.execute("ALTER TABLE shops ADD COLUMN pan_number TEXT")
        if "vat_number" not in cols:
            conn.execute("ALTER TABLE shops ADD COLUMN vat_number TEXT")
        if "citizenship_number" not in cols:
            conn.execute("ALTER TABLE shops ADD COLUMN citizenship_number TEXT")
        if "document_url" not in cols:
            conn.execute("ALTER TABLE shops ADD COLUMN document_url TEXT")


def upsert_snapshot(payload: dict) -> None:
    users = payload.get("users", [])
    shops = payload.get("shops", [])
    favorites = payload.get("favorites", {})
    reviews = payload.get("reviews", {})
    activity = payload.get("activity", [])

    now = utc_now()

    with get_conn() as conn:
        for u in users:
            conn.execute(
                """
                INSERT INTO users (id, email, name, role, password, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  email = excluded.email,
                  name = excluded.name,
                  role = excluded.role,
                  password = excluded.password,
                  updated_at = excluded.updated_at
                """,
                (
                    str(u.get("id", "")),
                    str(u.get("email", "")),
                    str(u.get("name", "")),
                    str(u.get("role", "")),
                    str(u.get("password", "")),
                    now,
                ),
            )

        for s in shops:
            conn.execute(
                """
                INSERT INTO shops
                  (id, owner_id, name, category, legal_owner_name, contact_phone, pan_number, vat_number, citizenship_number, document_url, city, insta_id, page_url, image, description, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  owner_id = excluded.owner_id,
                  name = excluded.name,
                  category = excluded.category,
                  legal_owner_name = excluded.legal_owner_name,
                  contact_phone = excluded.contact_phone,
                  pan_number = excluded.pan_number,
                  vat_number = excluded.vat_number,
                  citizenship_number = excluded.citizenship_number,
                  document_url = excluded.document_url,
                  city = excluded.city,
                  insta_id = excluded.insta_id,
                  page_url = excluded.page_url,
                  image = excluded.image,
                  description = excluded.description,
                  status = excluded.status,
                  created_at = excluded.created_at,
                  updated_at = excluded.updated_at
                """,
                (
                    str(s.get("id", "")),
                    str(s.get("ownerId", "")),
                    str(s.get("name", "")),
                    str(s.get("category", "")),
                    str(s.get("legalOwnerName", "")),
                    str(s.get("contactPhone", "")),
                    str(s.get("panNumber", "")),
                    str(s.get("vatNumber", "")),
                    str(s.get("citizenshipNumber", "")),
                    str(s.get("documentUrl", "")),
                    str(s.get("city", "")),
                    str(s.get("instaId", "")),
                    str(s.get("pageUrl", "")),
                    str(s.get("image", "")),
                    str(s.get("description", "")),
                    str(s.get("status", "")),
                    str(s.get("createdAt", now)),
                    str(s.get("updatedAt", now)),
                ),
            )

        conn.execute("DELETE FROM favorites")
        if isinstance(favorites, dict):
            for user_id, shop_ids in favorites.items():
                for shop_id in shop_ids or []:
                    conn.execute(
                        "INSERT OR REPLACE INTO favorites (user_id, shop_id, updated_at) VALUES (?, ?, ?)",
                        (str(user_id), str(shop_id), now),
                    )

        conn.execute("DELETE FROM reviews")
        if isinstance(reviews, dict):
            for shop_id, items in reviews.items():
                for r in items or []:
                    rid = str(r.get("id") or f"{shop_id}-{r.get('userId', 'unknown')}-{r.get('at', now)}")
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO reviews (id, shop_id, user_id, rating, comment, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            rid,
                            str(shop_id),
                            str(r.get("userId", "")),
                            int(r.get("rating", 0)),
                            str(r.get("comment", "")),
                            str(r.get("at", now)),
                        ),
                    )

        for a in activity[-200:]:
            conn.execute(
                """
                INSERT OR IGNORE INTO activity_logs (id, action, detail, actor_id, at_ts, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(a.get("id", "")),
                    str(a.get("action", "")),
                    str(a.get("detail", "")),
                    str(a.get("actorId", "")),
                    str(a.get("at", now)),
                    now,
                ),
            )


def insert_log(payload: dict) -> None:
    now = utc_now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO activity_logs (id, action, detail, actor_id, at_ts, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                str(payload.get("id") or f"log-{now}"),
                str(payload.get("action", "unknown")),
                str(payload.get("detail", "")),
                str(payload.get("actorId", "")),
                str(payload.get("at") or now),
                now,
            ),
        )


def fetch_logs(limit: int) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, action, detail, actor_id, at_ts, created_at FROM activity_logs ORDER BY at_ts DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            self._send_json(200, {"ok": True, "db": str(DB_PATH)})
            return

        if parsed.path == "/api/logs":
            params = parse_qs(parsed.query or "")
            limit = int((params.get("limit") or ["50"])[0])
            limit = max(1, min(limit, 500))
            self._send_json(200, {"ok": True, "logs": fetch_logs(limit)})
            return

        self._send_json(404, {"ok": False, "error": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"

        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._send_json(400, {"ok": False, "error": "Invalid JSON"})
            return

        if parsed.path == "/api/snapshot":
            upsert_snapshot(payload if isinstance(payload, dict) else {})
            self._send_json(200, {"ok": True})
            return

        if parsed.path == "/api/logs":
            insert_log(payload if isinstance(payload, dict) else {})
            self._send_json(200, {"ok": True})
            return

        self._send_json(404, {"ok": False, "error": "Not found"})


def main() -> None:
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", 8001), Handler)
    print(f"StyleOrbit DB API running at http://127.0.0.1:8001 (db: {DB_PATH})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
