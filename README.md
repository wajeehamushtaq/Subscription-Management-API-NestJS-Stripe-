# NestJS Subscription Management API

A production-ready subscription management system built with NestJS, MongoDB, Stripe, and JWT authentication. Features role-based access control (RBAC), webhook handling, and Docker deployment.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [API Endpoints](#-api-endpoints)
- [Stripe Integration](#-stripe-integration)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Business Rules](#-business-rules)

---

## ✨ Features

- **JWT Authentication** with access tokens (15 min) and refresh tokens (7 days)
- **Role-Based Access Control (RBAC)** - Admin and User roles
- **Stripe Integration** - Subscription checkout and webhook handling
- **MongoDB** persistence with Mongoose ODM
- **Docker Deployment** with multi-stage builds
- **Automatic Role Seeding** on startup
- **Comprehensive Error Handling** with global exception filter
- **Swagger API Documentation** at `/api/docs`
- **Password Security** with bcrypt (10 salt rounds)

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.x | Backend framework |
| TypeScript | 5.1+ | Programming language |
| MongoDB | 7.x | Database |
| Mongoose | 8.x | ODM |
| Stripe | 20.x | Payment processing |
| JWT | 11.x | Authentication |
| bcryptjs | 3.x | Password hashing |
| Docker | Latest | Containerization |
| pnpm | Latest | Package manager |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (Install: `npm install -g pnpm`)
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/))
- **Stripe CLI** ([Download](https://stripe.com/docs/stripe-cli))
- **Stripe Account** (Test mode)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/wajeehamushtaq/Subscription-Management-API-NestJS-Stripe-.git
cd Subscription-Management-API-NestJS-Stripe
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# ======================
# Stripe Configuration (Test Mode)
# ======================
STRIPE_PUBLIC_KEY=<your_stripe_publishable_key>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# ======================
# MongoDB
# ======================
MONGODB_URI=mongodb://mongo:27017/nest

# ======================
# JWT Configuration
# ======================
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRATION=900          # 15 minutes (in seconds)
JWT_REFRESH_EXPIRATION=604800  # 7 days (in seconds)

# ======================
# Application
# ======================
NODE_ENV=development
PORT=3000
```

### Getting Your Stripe API Keys

You'll need to get your own Stripe test keys:

1. **Sign up for Stripe** (if you haven't already): https://dashboard.stripe.com/register
2. **Switch to Test Mode** (toggle in the dashboard)
3. **Get your API keys**: Go to [Developers → API keys](https://dashboard.stripe.com/test/apikeys)
4. Copy the following keys to your `.env` file:
   - **Publishable key** (test keys typically start with `pk_test_`)
   - **Secret key** (test keys typically start with `sk_test_`) - Click "Reveal test key"
5. **Webhook secret**: You'll get this when you run `stripe listen` (see Step 4 in Running the Application)

⚠️ **Important**: Never commit your actual API keys to version control, even test keys. Keep them in your `.env` file which should be gitignored.

### Stripe Test Cards

Use these test card numbers for testing payments:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | Requires authentication |
| `4000 0000 0000 9995` | Declined payment |

- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

---

## 🏃 Running the Application

### Option 1: Docker (Recommended)

Start the entire application stack with Docker Compose:

```bash
# Build and start containers
docker compose up

# Run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop containers
docker compose down
```

The API will be available at `http://localhost:3000`

### Option 2: Local Development

#### Step 1: Start MongoDB

```bash
docker run -d -p 27017:27017 --name nest-mongo mongo:7
```

#### Step 2: Update `.env`

Change `MONGODB_URI` to:
```env
MONGODB_URI=mongodb://localhost:27017/nest
```

#### Step 3: Start the Application

```bash
# Development mode (watch mode)
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

### Step 4: Set Up Stripe Webhooks

In a **separate terminal**, forward Stripe webhook events:

```bash
stripe listen --forward-to localhost:3000/stripe/webhook
```

This command will output a webhook secret like:
```
whsec_xxxxxxxxxxxxxxxxxxxxx
```

Copy this secret and update `STRIPE_WEBHOOK_SECRET` in your `.env` file, then restart the application.

### Verify Setup

Check that the application is running:

```bash
curl http://localhost:3000
```

View Swagger documentation:
```
http://localhost:3000/api/docs
```

---

## 📚 API Documentation

### Swagger UI

Interactive API documentation is available at:

```
http://localhost:3000/api/docs
```

### Authentication

Most endpoints require a JWT token. Include it in the Authorization header:

```bash
Authorization: Bearer <your_access_token>
```

### Default Admin User

The system automatically seeds an admin user on startup:

| Field | Value |
|-------|-------|
| **Email** | `admin@example.com` |
| **Password** | `Admin@123` |
| **Role** | `admin` |

---

## 🔌 API Endpoints

### Authentication

#### Sign Up
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}

Response: 201 Created
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "stripeCustomerId": "cus_xxxxxxxxxxxxx"
  }
}
```

#### Log In
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Plans

#### Get Available Plans
```http
GET /plans
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "prod_xxxxxxxxxxxxx",
    "name": "Basic Plan",
    "description": "Basic subscription features",
    "prices": [
      {
        "id": "price_xxxxxxxxxxxxx",
        "unit_amount": 999,
        "currency": "usd",
        "recurring": {
          "interval": "month"
        }
      }
    ]
  }
]
```

### Subscriptions

#### Create Checkout Session
```http
POST /subscription/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "priceId": "price_xxxxxxxxxxxxx"
}

Response: 200 OK
{
  "sessionId": "cs_test_xxxxxxxxxxxxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxxxxxxxxxx"
}
```

#### Get Current Subscription
```http
GET /subscription
Authorization: Bearer <token>

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "planId": "prod_xxxxxxxxxxxxx",
  "priceId": "price_xxxxxxxxxxxxx",
  "stripeSubscriptionId": "sub_xxxxxxxxxxxxx",
  "status": "active",
  "current_period_end": "2025-12-21T00:00:00.000Z",
  "createdAt": "2025-11-21T00:00:00.000Z"
}
```

#### Cancel Subscription
```http
POST /subscription/cancel
Authorization: Bearer <token>

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "cancelled",
  "cancelledAt": "2025-11-21T12:00:00.000Z"
}
```

### Admin Endpoints

#### Get All Users (Admin Only)
```http
GET /admin/users
Authorization: Bearer <admin_token>

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": {
      "name": "user",
      "status": "active"
    },
    "stripeCustomerId": "cus_xxxxxxxxxxxxx",
    "isActive": true,
    "createdAt": "2025-11-21T00:00:00.000Z"
  }
]
```

#### Get All Subscriptions (Admin Only)
```http
GET /admin/subscriptions
Authorization: Bearer <admin_token>

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": {
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "planId": "prod_xxxxxxxxxxxxx",
    "status": "active",
    "current_period_end": "2025-12-21T00:00:00.000Z"
  }
]
```

### Webhooks

#### Stripe Webhook (Internal)
```http
POST /stripe/webhook
Content-Type: application/json
Stripe-Signature: t=xxxxx,v1=xxxxx

(Stripe automatically sends events to this endpoint)
```

Supported events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`

---

## 💳 Stripe Integration

### Setting Up Stripe Products

1. **Log in to Stripe Dashboard** (Test Mode): https://dashboard.stripe.com/test/products

2. **Create Products**:
   - Go to **Products** → **Add product**
   - Create 3 products:
     - **Basic Plan**: $9.99/month
     - **Standard Plan**: $19.99/month
     - **Premium Plan**: $29.99/month

3. **Get Price IDs**:
   - Click on each product
   - Copy the **Price ID** (starts with `price_`)
   - Users will use these Price IDs when creating checkout sessions

### Webhook Configuration

#### Local Development

Use Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/stripe/webhook
```

Copy the webhook secret (starts with `whsec_`) to `.env` as `STRIPE_WEBHOOK_SECRET`.

#### Production Deployment

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your production URL: `https://yourdomain.com/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
5. Copy the **Signing secret** to your production `.env`

### Testing Payments

1. **Create a checkout session**:
```bash
curl -X POST http://localhost:3000/subscription/checkout \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_xxxxxxxxxxxxx"}'
```

2. **Open the returned URL** in your browser

3. **Use test card**: `4242 4242 4242 4242`

4. **Complete payment** and verify webhook received

---

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:cov
```

### End-to-End Tests

```bash
# Run e2e tests
pnpm run test:e2e
```

### Manual Testing with cURL

#### Sign Up
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123",
    "full_name": "Test User"
  }'
```

#### Log In
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123"
  }'
```

#### Get Plans
```bash
curl -X GET http://localhost:3000/plans \
  -H "Authorization: Bearer <your_access_token>"
```

---

## 📁 Project Structure

```
nest-app/
├── shared/                      # Shared resources (schemas, DTOs)
│   ├── dto/                     # Data Transfer Objects
│   │   ├── auth.dto.ts
│   │   ├── subscription.dto.ts
│   │   └── index.ts
│   └── schemas/                 # MongoDB schemas
│       ├── user.schema.ts
│       ├── role.schema.ts
│       ├── subscription.schema.ts
│       └── index.ts
├── src/
│   ├── auth/                    # Authentication module
│   │   ├── guards/              # JWT auth guard
│   │   ├── strategies/          # JWT strategy
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/                   # User management
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── roles/                   # Role management & seeding
│   │   ├── roles.service.ts
│   │   └── roles.module.ts
│   ├── subscriptions/           # Subscription logic
│   │   ├── subscriptions.controller.ts
│   │   ├── subscriptions.service.ts
│   │   └── subscriptions.module.ts
│   ├── plans/                   # Stripe plans fetching
│   │   ├── plans.controller.ts
│   │   ├── plans.service.ts
│   │   └── plans.module.ts
│   ├── stripe/                  # Stripe integration
│   │   ├── stripe.controller.ts (webhooks)
│   │   ├── stripe.service.ts
│   │   └── stripe.module.ts
│   ├── common/                  # Shared utilities
│   │   ├── decorators/          # Custom decorators (@Roles)
│   │   ├── filters/             # Exception filters
│   │   └── guards/              # RBAC guards
│   ├── app.module.ts            # Root module
│   └── main.ts                  # Application entry point
├── test/                        # E2E tests
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Multi-stage build
├── .env                         # Environment variables
└── package.json
```

---

## 📜 Business Rules

### Subscription Management

- **Single Subscription per User**: Users can only have one active subscription at a time
- **Immediate Cancellation**: Cancellations are processed immediately (soft delete, status = 'cancelled')
- **Plan Changes**: Users can upgrade or downgrade between plans
- **Webhook-Driven Updates**: All subscription changes are synced via Stripe webhooks

### User Roles

- **Admin Role**: Full access to all endpoints, including user/subscription management
- **User Role**: Access to own profile, plans, and subscription management
- **Role Seeding**: Roles are automatically created on application startup

### Authentication

- **JWT Tokens**: 
  - Access token expires in 15 minutes
  - Refresh token expires in 7 days
- **Password Security**: bcrypt hashing with 10 salt rounds
- **Protected Routes**: Most endpoints require valid JWT authentication

### Payment Processing

- **Test Mode**: Application uses Stripe test keys for development
- **One-Time Checkout**: Users are redirected to Stripe Checkout for payment
- **Webhook Verification**: All webhook events are signature-verified for security

---

## 🔧 Development Commands

```bash
# Format code
pnpm run format

# Lint code
pnpm run lint

# Build for production
pnpm run build

# Start production server
pnpm run start:prod

# View Docker logs
docker compose logs -f

# Rebuild Docker containers
docker compose up --build

# Clean Docker volumes
docker compose down -v
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB container
docker restart nest-mongo
```

### Stripe Webhook Not Receiving Events

1. Ensure Stripe CLI is running:
   ```bash
   stripe listen --forward-to localhost:3000/stripe/webhook
   ```

2. Check webhook secret in `.env` matches CLI output

3. Verify application is running and accessible

### JWT Token Expired

- Access tokens expire in 15 minutes
- Use the refresh token endpoint to get a new access token
- Refresh tokens expire in 7 days

### Docker Build Errors

```bash
# Clean Docker cache and rebuild
docker compose down -v
docker system prune -a
docker compose up --build
```

---

## 📄 License

This project is [MIT licensed](LICENSE).

---

## 🤝 Support

For issues or questions:
- Check the [Swagger documentation](http://localhost:3000/api/docs)
- Review the [NestJS documentation](https://docs.nestjs.com)
- Consult the [Stripe API reference](https://stripe.com/docs/api)

---

**Built with ❤️ using NestJS, MongoDB, and Stripe**
