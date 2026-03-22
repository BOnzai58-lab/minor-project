# StyleOrbit

StyleOrbit is a role-based web app for discovering Instagram shops.

## Roles and use cases
- Visitor/User: browse shops, search/filter, view details, visit Instagram, favorite shops, rate/review shops.
- Shop Owner: register shop, edit shop details, upload shop image URL, wait for admin approval.
- Admin: approve/reject shops, remove fake/scam shops, manage users, monitor activity logs.

## Database (new)
A SQLite database now stores logs and app records using a lightweight local API.

- API server file: `backend/api_server.py`
- DB file: `backend/data/styleorbit.db`
- API base URL used by frontend: `http://127.0.0.1:8001`

## Run
1. Start frontend static server:
```bash
cd StyleOrbit
python -m http.server 5501
```

2. Start database API server in another terminal:
```bash
cd StyleOrbit
python backend/api_server.py
```

3. Open:
- App: `http://localhost:5501/`
- API health: `http://127.0.0.1:8001/health`

## Demo logins
- Admin: `admin@sims.com` / `admin123`
- Owner: `owner@sims.com` / `owner123`
- User: `user@sims.com` / `user123`

## Notes
- If login/data seems broken, click **Reset Demo Data** on sign-in page.
- Frontend still works without API, but DB logging/storage sync requires the API server running.
