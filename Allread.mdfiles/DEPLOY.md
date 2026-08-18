# Pulse — Docker & CI/CD deployment guide

Production-grade setup: **Dockerfiles per service**, **docker-compose** for local/staging, **GitHub Actions** to build and push images to **GHCR**.

## Architecture

| Service | Image name | Port |
|---------|------------|------|
| User API | `pulse-user` | 5000 |
| Chat API + Socket.IO | `pulse-chat` | 5082 |
| Mail worker | `pulse-mail` | 5001 |
| Frontend (Next.js) | `pulse-frontend` | 3000 |

Infrastructure (local compose only): **MongoDB**, **Redis**, **RabbitMQ**.

---

## 1. Local development with Docker

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
- Git

### Steps

```bash
# From repository root
cp .env.example .env
```

Edit `.env`:

- `JWT_SECRET` — long random string (same for all services)
- `Cloud_Name`, `Api_key`, `Api_Secret` — Cloudinary
- `SMTP_USER`, `SMTP_PASSWORD` — Gmail app password or SMTP provider

Start everything:

```bash
docker compose up --build
```

Open:

- App: http://localhost:3000
- User API health: http://localhost:5000/health
- Chat API health: http://localhost:5082/health
- RabbitMQ UI: http://localhost:15672 (user `pulse`, password `pulse` by default)

Stop:

```bash
docker compose down
```

Reset data volumes:

```bash
docker compose down -v
```

---

## 2. GitHub Actions (CI/CD)

Workflow: [`.github/workflows/docker-ci.yml`](.github/workflows/docker-ci.yml)

On every **pull request**:

1. Lint frontend (`npm run lint`)
2. Build all four Docker images (no push)

On push to **main** / **master**:

1. Lint + build
2. Push images to **GitHub Container Registry**:
   - `ghcr.io/<your-github-username>/pulse-user:latest`
   - `ghcr.io/<your-github-username>/pulse-chat:latest`
   - `ghcr.io/<your-github-username>/pulse-mail:latest`
   - `ghcr.io/<your-github-username>/pulse-frontend:latest`

### Enable GHCR packages

1. Repo → **Settings** → **Actions** → **General** → Workflow permissions: **Read and write**
2. After first push, packages appear under your profile/org **Packages**
3. If images are private, grant your server a PAT or make packages public

### Optional auto-deploy (SSH)

1. Repository → **Settings** → **Secrets and variables** → **Actions** → **Variables** → add `ENABLE_SSH_DEPLOY` = `true`
2. Add secrets:


| Secret | Example |
|--------|---------|
| `DEPLOY_HOST` | `203.0.113.10` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Private key (PEM) |
| `DEPLOY_PATH` | `/opt/pulse` |

On the server, clone the repo and create `.env` with **production** values (MongoDB Atlas URI, CloudAMQP, etc.).

---

## 3. Production server deployment

### 3.1 Provision managed services

Use cloud providers (not bundled in `docker-compose.prod.yml`):

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | `MONGO_URI` |
| Redis Cloud / Upstash | `REDIS_URL` |
| CloudAMQP | `Rabbitmq_Host`, credentials |
| Cloudinary | Media |
| SMTP | `SMTP_USER`, `SMTP_PASSWORD` |

### 3.2 Prepare the server

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Clone project:

```bash
sudo mkdir -p /opt/pulse && sudo chown $USER:$USER /opt/pulse
git clone https://github.com/YOUR_USER/whatsApp.git /opt/pulse
cd /opt/pulse
cp .env.example .env
nano .env   # production values
```

Set in `.env`:

```env
GHCR_IMAGE_PREFIX=ghcr.io/your-github-username
IMAGE_TAG=latest
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_USER_SERVICE_URL=https://api.yourdomain.com   # or same domain /api/user
NEXT_PUBLIC_CHAT_SERVICE_URL=https://chat.yourdomain.com
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://...
Rabbitmq_Host=...
JWT_SECRET=...
```

Login to GHCR on the server:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USER --password-stdin
```

### 3.3 Pull and run

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Check:

```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:5000/health
```

### 3.4 HTTPS reverse proxy (recommended)

Enable bundled nginx profile:

```bash
docker compose -f docker-compose.prod.yml --profile proxy up -d
```

Point DNS to the server. Add TLS with [Caddy](https://caddyserver.com/) or Certbot in front of nginx.

For a **single domain** (cookies + CORS):

- `https://app.example.com` → frontend
- `https://app.example.com/api/user/` → user service (see `deploy/nginx.conf`)
- `https://app.example.com/socket.io/` → chat WebSockets

Update `FRONTEND_URL` and rebuild frontend with matching `NEXT_PUBLIC_*` URLs.

---

## 4. Build images locally (without CI)

```bash
docker build -t pulse-user ./backend/user
docker build -t pulse-chat ./backend/chat
docker build -t pulse-mail ./backend/mail
docker build -t pulse-frontend ./frontend \
  --build-arg NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:5000 \
  --build-arg NEXT_PUBLIC_CHAT_SERVICE_URL=http://localhost:5082
```

---

## 5. Important production notes

1. **JWT_SECRET** must be identical on **user** and **chat** services.
2. **SMTP**: use `SMTP_USER` / `SMTP_PASSWORD` (not `USER` — conflicts with Linux env in Docker).
3. **HTTPS** required for camera verification and WebRTC.
4. **WebRTC calls** need a TURN server for many real-world networks.
5. **Face models** are baked into the frontend image via `npm run face-models` during build.
6. Rebuild frontend when changing any `NEXT_PUBLIC_*` variable (they are compile-time).

---

## 6. Troubleshooting

| Issue | Check |
|-------|--------|
| OTP not sent | `docker compose logs mail`, RabbitMQ queue `send-otp`, SMTP creds |
| Login cookie missing | `FRONTEND_URL` matches browser origin; HTTPS + `secure` cookies |
| Socket disconnects | `NEXT_PUBLIC_CHAT_SERVICE_URL` reachable from browser; proxy WebSocket headers |
| Verify says no profile photo | Redeploy user service; refresh after `/me` DB fix |
| Chat cannot load users | `USER_SERVICE_URL=http://user:5000` inside Docker network |

---

## File reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Full local stack |
| `docker-compose.prod.yml` | Production apps from GHCR |
| `.env.example` | Environment template |
| `deploy/nginx.conf` | Optional reverse proxy |
| `.github/workflows/docker-ci.yml` | CI/CD pipeline |
