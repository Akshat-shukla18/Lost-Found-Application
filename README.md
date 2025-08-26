# On-Spot Assessment of RTRWH and Artificial Recharge Potential

Tech: React (Vite) + Node/Express + MongoDB (MERN)

## Quickstart

1. Create a MongoDB Atlas database and get the connection string.
2. Copy `server/.env.example` to `server/.env` and fill values.
3. Install deps:

```bash
npm run install:all
```

4. Run locally:

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5000

## Deployment
- Frontend: Vercel (set `VITE_API_BASE_URL` env to your Render backend URL)
- Backend: Render (set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`)
- Database: MongoDB Atlas