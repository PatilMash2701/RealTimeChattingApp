# Pulse — Real-time chat (microservices)

WhatsApp-style app: Next.js frontend, User / Chat / Mail services, Socket.IO, WebRTC calls, face verification.

## Quick start (Docker — recommended)

```bash
cp .env.example .env
# Edit .env (JWT, Cloudinary, SMTP)
docker compose up --build
```

- App: http://localhost:3000  
- Full deployment guide: **[DEPLOY.md](./DEPLOY.md)**

## Quick start (manual)

See [DEPLOY.md](./DEPLOY.md) § manual, or run each service:

| Service | Command | Port |
|---------|---------|------|
| MongoDB, Redis, RabbitMQ | Docker infra or cloud | — |
| User | `cd backend/user && npm run dev` | 5000 |
| Chat | `cd backend/chat && npm run dev` | 5082 |
| Mail | `cd backend/mail && npm run dev` | 5001 |
| Frontend | `cd frontend && npm run dev` | 3000 |

```bash
cd frontend && npm run face-models   # once, for identity verification
```

## CI/CD

Push to `main` → GitHub Actions builds and publishes images to `ghcr.io/<user>/pulse-*`.
