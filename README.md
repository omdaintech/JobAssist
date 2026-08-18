# 🚀 One-CEFR Placement Test

AI-powered English placement assessment aligned with the CEFR framework.

An AI-powered web application for evaluating language proficiency according to the Common European Framework of Reference for Languages (CEFR) standards.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Purpose](#purpose)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

One-CEFR is a comprehensive language assessment platform that uses artificial intelligence to evaluate learners' proficiency across multiple CEFR levels (A1, A2, B1, B2) and various languages (German, French, Spanish, and more). Unlike traditional language learning apps, this is an **assessment-first** application focused on evaluating exam readiness.

## 🎓 Purpose

The platform serves three primary user groups:

1. **End Users (Students)**: Practice and assess their language skills through AI-powered exercises
2. **School Administrators**: Manage students, track progress, and allocate learning credits
3. **System Administrators**: Configure the platform, manage question banks, and oversee multiple schools

### Assessment Types

- **📖 Reading Comprehension**: Text-based comprehension exercises
- **👂 Hearing (Listening)**: Audio-based comprehension with AI-generated content
- **✍️ Writing**: Essay and composition evaluation
- **💬 Speaking**: Voice recording evaluation with AI feedback
- **📝 Grammar**: Targeted grammar practice and assessment

## ✨ Key Features

- **Multi-Domain Architecture**: Separate authentication and workflows for students, schools, and system admins
- **AI-Powered Evaluation**: Uses OpenAI GPT models for intelligent feedback and scoring
- **Credit-Based System**: Flexible credit allocation for different exercise types
- **Multi-Language Support**: German, French, Spanish with extensible language framework
- **Audio Generation**: Text-to-speech integration with ElevenLabs
- **Payment Integration**: PayPal integration for credit purchases
- **B2B & B2C Models**: Support for both direct student access and school-based deployments
- **Comprehensive Analytics**: Track student progress and performance metrics
- **Mobile-Friendly**: Responsive design for all devices

## 🛠️ Technology Stack

### Backend
- **Runtime**: Python 3.9+
- **Framework**: FastAPI 0.104+ (async REST API)
- **Database**: MySQL 8.0+ with SQLAlchemy 2.0+ ORM
- **AI/LLM**: OpenAI GPT-4/GPT-4o-mini, LangChain
- **Authentication**: JWT tokens, Firebase Admin, bcrypt
- **Async Support**: aiomysql, asyncio
- **Testing**: Pytest with async support

### Frontend
- **User Frontend**: React/TypeScript with Vite
- **Admin Frontend**: React/TypeScript with Vite
- **UI Framework**: Tailwind CSS
- **State Management**: React Query, Context API
- **Build Tool**: Vite

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Uvicorn (ASGI)
- **Storage**: AWS S3 (audio files via boto3)
- **CDN**: CloudFront (optional)
- **Caching**: Redis (optional)
- **Monitoring**: Sentry (error tracking)

### External Services
- **OpenAI API**: Language model for evaluation and content generation
- **ElevenLabs API**: Text-to-speech for audio generation
- **AWS S3**: Audio file storage
- **PayPal API**: Payment processing
- **Mailgun API**: Email notifications
- **reCAPTCHA**: Bot protection

## 📦 Prerequisites

Before setting up the project, ensure you have the following installed:

### Required
- **Python 3.9 or higher**: [Download Python](https://www.python.org/downloads/)
- **Node.js 18+ and npm**: [Download Node.js](https://nodejs.org/)
- **MySQL 8.0+**: [Download MySQL](https://dev.mysql.com/downloads/)
- **Docker and Docker Compose**: [Download Docker](https://www.docker.com/get-started)
- **Git**: [Download Git](https://git-scm.com/downloads)

### Required API Keys & Services

You'll need to obtain API keys for the following services:

1. **OpenAI API Key** (Required)
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Navigate to API Keys section
   - Create a new API key
   - Cost: Pay-as-you-go based on usage

2. **AWS Account** (Required for audio features)
   - Sign up at [AWS Console](https://aws.amazon.com/)
   - Create an IAM user with S3 access
   - Create an S3 bucket for audio storage
   - Note your Access Key ID and Secret Access Key

3. **ElevenLabs API Key** (Optional - for audio generation)
   - Sign up at [ElevenLabs](https://elevenlabs.io/)
   - Get your API key from dashboard
   - Cost: Free tier available, paid plans for production

4. **PayPal Developer Account** (Optional - for payments)
   - Sign up at [PayPal Developer](https://developer.paypal.com/)
   - Create a sandbox application
   - Note Client ID and Secret

5. **Mailgun Account** (Optional - for emails)
   - Sign up at [Mailgun](https://www.mailgun.com/)
   - Get API key and domain
   - Free tier available for development

6. **Google reCAPTCHA** (Optional - for bot protection)
   - Get keys at [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
   - Use reCAPTCHA v2 or v3

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/devpaulgit/Agentic-language-learning-app.git
cd Agentic-language-learning-app
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your actual credentials
# See Configuration section below for details
nano .env.local  # or use your preferred editor
```

### 3. Frontend Setup

#### User Frontend

```bash
cd x-frontend/frontend-v2
npm install
cd ../..
```

#### Admin Frontend

```bash
cd x-frontend/admin-frontend-v2
npm install
cd ../..
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start MySQL database
docker-compose -f docker-compose.dev.yml up -d mysql

# Wait for MySQL to be ready (about 10-15 seconds)
docker-compose -f docker-compose.dev.yml logs -f mysql
# Press Ctrl+C when you see "ready for connections"
```

#### Option B: Local MySQL Installation

If you have MySQL installed locally:

```bash
# Create database
mysql -u root -p
CREATE DATABASE cefr_practice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Import Database Schema

```bash
# Import the schema
mysql -u root -p cefr_practice < database/schema_dump.sql

# Import test seed data (optional, for development)
mysql -u root -p cefr_practice < database/test_seed_data.sql
```

#### Run Database Migrations

```bash
# Migrations are in database/migrations/
# Run them in numerical order (001, 002, etc.)
for file in database/migrations/*.sql; do
  echo "Running migration: $file"
  mysql -u root -p cefr_practice < "$file"
done
```

## ⚙️ Configuration

### Environment Variables

Edit your `.env.local` file with the following configuration:

#### Essential Configuration

```bash
# =================================================================
# APPLICATION SECURITY (REQUIRED)
# =================================================================
# Generate secure random keys:
# python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your_generated_secret_key_here
JWT_SECRET_KEY=your_generated_jwt_secret_here
JWT_ACCESS_TOKEN_EXPIRES=36000
JWT_ALGORITHM=HS256

# =================================================================
# DATABASE (REQUIRED)
# =================================================================
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=cefr_practice
MYSQL_CHARSET=utf8mb4
USE_MYSQL=true

# =================================================================
# OPENAI API (REQUIRED)
# =================================================================
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
OPENAI_MAX_TOKENS=6000
OPENAI_TEMPERATURE=0.5
OPENAI_MODEL=gpt-4o-mini

# =================================================================
# AWS S3 (REQUIRED for audio features)
# =================================================================
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-central-1
S3_BUCKET_NAME=your-audio-bucket-name
S3_HEARING_FOLDER=hearing
S3_SPEAKING_FOLDER=speaking-shortlived

# =================================================================
# APPLICATION URLS
# =================================================================
FRONTEND_URL=http://localhost:91
ADMIN_URL=http://localhost:92
BACKEND_API_URL=http://localhost:93

# =================================================================
# OPTIONAL SERVICES
# =================================================================
# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=your_elevenlabs_key

# Email (Mailgun)
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_mailgun_domain
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=One-CEFR Platform

# PayPal Payments
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
RECAPTCHA_SITE_KEY=your_recaptcha_site_key
ENABLE_CAPTCHA=false

# Sentry Error Tracking
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=development
```

### Generating Secret Keys

Generate secure random keys for production:

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 🏃 Running the Application

### Development Mode

#### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

#### Option 2: Running Services Individually

**Terminal 1 - Backend API:**
```bash
# Activate virtual environment if not already active
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run backend
cd /path/to/project
uvicorn app.api_main:app --host 0.0.0.0 --port 93 --reload
```

**Terminal 2 - User Frontend:**
```bash
cd x-frontend/frontend-v2
npm run dev
# Access at http://localhost:91
```

**Terminal 3 - Admin Frontend:**
```bash
cd x-frontend/admin-frontend-v2
npm run dev
# Access at http://localhost:92
```

### Access URLs

Once running, access the application at:

- **User Frontend**: http://localhost:91
- **Admin Frontend**: http://localhost:92
- **Backend API**: http://localhost:93
- **API Documentation**: http://localhost:93/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:93/redoc (ReDoc)

### Test Credentials

For development/testing, use credentials from `database/test_seed_data.sql`:

- **Test User**: `test@test.com` / `password123`
- Refer to the seed file for admin and school credentials

## 🏗️ Architecture

### Domain-Driven Design

The application follows a strict domain separation:

```
┌─────────────────────────────────────────────────────────────┐
│                    One-CEFR Platform                          │
├─────────────────┬─────────────────┬────────────────────────┤
│  System Admin   │  School Admin   │    End Users           │
│  Domain         │  Domain         │    Domain              │
│                 │                 │                        │
│ • Schools CRUD  │ • User Mgmt     │ • Authentication       │
│ • Questions     │ • Analytics     │ • Learning Sessions    │
│ • System Config │ • Templates     │ • Progress Tracking    │
│                 │                 │                        │
│ /api/admin/*    │ /api/school/*   │ /api/auth/*           │
│                 │                 │ /api/users/*          │
└─────────────────┴─────────────────┴────────────────────────┘
```

### Layered Architecture (Per Domain)

```
API Layer (Routers)     ← HTTP endpoints, validation
    ↓
Service Layer          ← Business logic orchestration  
    ↓
Repository Layer       ← Data access operations
    ↓
Infrastructure Layer   ← Database, external services
```

### Project Structure

```
Agentic-language-learning-app/
├── app/                          # Backend application
│   ├── admin/                    # System admin domain
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── models/              # Data models & repositories
│   │   └── dependencies.py      # Dependency injection
│   ├── school/                   # School admin domain
│   │   ├── routers/
│   │   ├── services/
│   │   └── models/
│   ├── user/                     # End user domain
│   │   ├── routers/
│   │   ├── services/
│   │   └── models/
│   ├── common/                   # Shared infrastructure
│   │   ├── services/            # MySQL, email, etc.
│   │   └── models/              # Base models
│   ├── credit/                   # Credit system
│   ├── llm/                      # AI/LLM integration
│   ├── public/                   # Public endpoints
│   ├── api_main.py              # FastAPI application
│   ├── config.py                # Configuration
│   └── dependencies.py          # Global dependencies
├── x-frontend/                   # Frontend applications
│   ├── frontend-v2/             # User frontend (React)
│   └── admin-frontend-v2/       # Admin frontend (React)
├── database/                     # Database files
│   ├── migrations/              # SQL migration files
│   ├── schema_dump.sql          # Database schema
│   └── test_seed_data.sql       # Test data
├── tests/                        # Test suite
├── scripts/                      # Utility scripts
├── jobs/                         # Background jobs
├── monitoring/                   # Logging configuration
├── docker-compose.*.yml         # Docker configurations
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## 📚 API Documentation

### Interactive API Documentation

When the backend is running, access:

- **Swagger UI**: http://localhost:93/docs
- **ReDoc**: http://localhost:93/redoc

### API Domains

#### User Domain (`/api/auth/*`, `/api/users/*`)
- User registration and authentication
- Profile management
- Learning sessions
- Progress tracking
- Credit management

#### School Domain (`/api/school/*`)
- School admin authentication
- Student management
- School analytics
- Credit allocation

#### Admin Domain (`/api/admin/*`)
- System configuration
- School management
- Question bank management
- System-wide analytics

#### Public Domain (`/api/public/*`)
- Health checks
- Language information
- Public content

### Authentication

All protected endpoints require JWT tokens in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

## 🧪 Testing

### Running Tests

```bash
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_user_auth.py

# Run with verbose output
pytest -v

# Run in parallel (faster)
pytest -n auto
```

### Test Database

Tests use a separate test database (`cefr_practice_test`):

```bash
# Set up test database
mysql -u root -p
CREATE DATABASE cefr_practice_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Import test schema and data
mysql -u root -p cefr_practice_test < database/schema_dump.sql
mysql -u root -p cefr_practice_test < database/test_seed_data.sql
```

## 🚢 Deployment

### Production Deployment

#### Using Docker Compose

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Environment Configuration

1. Create `.env.prod` from `.env.example`
2. Set production values for all variables
3. Use strong, unique secrets for `SECRET_KEY` and `JWT_SECRET_KEY`
4. Configure production database credentials
5. Set `DEBUG=false`
6. Configure production URLs and domains

#### Database Migrations

```bash
# Backup production database before migrations
mysqldump -u user -p cefr_practice > backup_$(date +%Y%m%d).sql

# Run migrations
for file in database/migrations/*.sql; do
  mysql -u user -p cefr_practice < "$file"
done
```

#### Security Checklist

- [ ] All `.env*` files are gitignored
- [ ] Strong secret keys generated and set
- [ ] Database credentials secured
- [ ] API keys not exposed in code
- [ ] HTTPS enabled (via reverse proxy)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error tracking configured (Sentry)
- [ ] Regular backups scheduled
- [ ] Monitoring in place

### Reverse Proxy Setup (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # User Frontend
    location / {
        proxy_pass http://localhost:91;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:93;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name admin.yourdomain.com;
    
    # Admin Frontend
    location / {
        proxy_pass http://localhost:92;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔒 Security

### Best Practices

1. **Never commit sensitive data**:
   - All `.env*` files are gitignored (except `.env.example`)
   - No API keys in code
   - No credentials in documentation

2. **Use environment variables**:
   - All secrets via environment variables
   - Different credentials for dev/test/prod

3. **Database security**:
   - No PII in test seed data
   - Regular backups
   - Encrypted connections in production

4. **Authentication**:
   - JWT tokens with expiration
   - bcrypt password hashing
   - Rate limiting on auth endpoints

5. **API Security**:
   - CORS configuration
   - Rate limiting
   - Input validation
   - reCAPTCHA on public forms

### Reporting Security Issues

If you discover a security vulnerability, please open a private issue or contact the maintainer directly. Do not open a public issue.

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards and architecture guidelines
4. Write tests for new features
5. Ensure all tests pass (`pytest`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Coding Standards

- **Python**: Follow PEP 8, use type hints
- **JavaScript/TypeScript**: Follow ESLint rules
- **Architecture**: Maintain domain separation
- **Testing**: Write tests for new features
- **Documentation**: Update docs for API changes

### Architecture Guidelines

Follow the domain-driven layered architecture described in the [Architecture](#architecture) section above.

## 📖 Additional Documentation

- **Database Schema**: [database/schema_dump.sql](database/schema_dump.sql)
- **Database Migrations**: [database/migrations/](database/migrations/)
- **Background Jobs**: [jobs/README.md](jobs/README.md)
- **Monitoring**: [monitoring/README.md](monitoring/README.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- FastAPI framework
- React and the frontend ecosystem
- All contributors and supporters

## 📞 Support

For support and questions:
- **Documentation**: Check the `docs/` directory
- **Issues**: Open a GitHub issue
- **Email**: Open a GitHub issue

---

**Made with ❤️ for language learners worldwide**
