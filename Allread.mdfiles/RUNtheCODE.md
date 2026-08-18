# WhatsApp Clone

This project consists of a Next.js Frontend and a microservices-based backend architecture containing three main services:
- **Frontend** (Next.js, React, TailwindCSS)
- **User Service** (Authentication, User Management)
- **Chat Service** (Real-time Messaging via Socket.io)
- **Mail Service** (Email notifications and communication)

This guide provides the complete step-by-step process required to set up and run the entire application successfully.

---

## 🛠️ Prerequisites

Before you begin, make sure you have the following installed on your machine:
- **Node.js** (v18+ recommended)
- **Docker** (for running RabbitMQ locally)
- A **MongoDB Atlas** account (or local MongoDB)
- An **Upstash** account (for managed Redis)
- A **Cloudinary** account (for media storage)

---

## 🚀 Step 1: Clone the Repository & Install Dependencies

Open your terminal and install dependencies for all parts of the application:

```bash
# Install Frontend dependencies
cd frontend
npm install

# Download face-api.js AI models (required for Identity Check)
npm run face-models

# Install User Service dependencies
cd ../backend/user
npm install

# Install Mail Service dependencies
cd ../mail
npm install

# Install Chat Service dependencies
cd ../chat
npm install
```

---

## 🐇 Step 2: Set up RabbitMQ (Local with Docker)

The Mail and User services communicate using RabbitMQ. We will spin up a local RabbitMQ instance using Docker.

Run the following command to start a RabbitMQ container in the background with the Management UI enabled:

```bash
docker run -d \
  --name rabbitmq-whatsapp \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management
```
*Note: You can access the RabbitMQ Management Dashboard at `http://localhost:15672` using `admin` / `admin123`.*

---

## 🔴 Step 3: Set up Redis (Upstash)

The User service requires Redis. Instead of running it locally, we use Upstash for a Serverless Redis instance.

1. Go to [Upstash](https://upstash.com/) and log in/sign up.
2. Click on **Create Database**. Give it a name, select a region, and choose the free tier.
3. Once created, scroll down to the **Connect to your database** section.
4. Copy the **Node.js (ioredis/redis)** connection string (it should look like `rediss://...upstash.io:6379`). You will use this in the User service `.env`.

---

## 🔐 Step 4: Configure Environment Variables

You need to create a `.env` file in the frontend and each of the three microservice directories:

### 1. Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend` folder (if you haven't already) to point your Next.js app to your backend APIs:
```env
NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:5000
NEXT_PUBLIC_CHAT_SERVICE_URL=http://localhost:5082
```

### 2. User Service (`backend/user/.env`)
```env
PORT=5000
MONGO_URI=mongodb+srv://<your_db_user>:<your_db_password>@cluster0...mongodb.net/?appName=Cluster0
REDIS_URL=<your_upstash_redis_url>
Rabbitmq_Host=localhost
Rabbitmq_Username=admin
Rabbitmq_Password=admin123
JWT_SECRET=<your_secure_jwt_secret>
```

### 3. Mail Service (`backend/mail/.env`)
```env
PORT=5001
Rabbitmq_Host=localhost
Rabbitmq_Username=admin
Rabbitmq_Password=admin123
USER=<your_email_address>
PASSWORD=<your_email_app_password>
```
*Note: If using Gmail, you must generate an "App Password" from your Google Account settings.*

### 4. Chat Service (`backend/chat/.env`)
```env
PORT=5082
MONGO_URI=mongodb+srv://<your_db_user>:<your_db_password>@cluster0...mongodb.net/?appName=Cluster0
JWT_SECRET=<your_secure_jwt_secret>
USER_SERVICE_URL=http://localhost:5000
Cloud_Name=<your_cloudinary_cloud_name>
Api_key=<your_cloudinary_api_key>
Api_Secret=<your_cloudinary_api_secret>
```

---

## 🏃 Step 5: Start the Application

Once RabbitMQ is running and all `.env` files are configured, you can start the entire stack. It is recommended to use a separate terminal window for each service.

### Start the Backend Microservices
```bash
# Terminal 1: User Service
cd backend/user
npm run dev

# Terminal 2: Mail Service
cd backend/mail
npm run dev

# Terminal 3: Chat Service
cd backend/chat
npm run dev
```

### Start the Next.js Frontend
```bash
# Terminal 4: Frontend
cd frontend
npm run dev
```

Your Next.js frontend will now be accessible at `http://localhost:3000`, communicating with your fully operational backend microservices!
