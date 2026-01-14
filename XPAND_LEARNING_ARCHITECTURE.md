# Xpand Learning - Complete Architecture & Implementation Guide

## 🏗️ Project Structure

```
xpand-learning/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── videos/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── MobileNav.tsx
│   │   │
│   │   ├── home/
│   │   │   ├── Hero.tsx
│   │   │   ├── FeaturedCourses.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── TrustIndicators.tsx
│   │   │   └── CTASection.tsx
│   │   │
│   │   ├── courses/
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseGrid.tsx
│   │   │   ├── CourseFilters.tsx
│   │   │   ├── CourseSearch.tsx
│   │   │   ├── CourseDetails.tsx
│   │   │   ├── CourseCurriculum.tsx
│   │   │   ├── InstructorBio.tsx
│   │   │   ├── CourseReviews.tsx
│   │   │   └── EnrollmentForm.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── CourseProgress.tsx
│   │   │   ├── Certificates.tsx
│   │   │   └── PaymentHistory.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── CourseManagement.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   └── ContentEditor.tsx
│   │   │
│   │   ├── cart/
│   │   │   ├── ShoppingCart.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── Checkout.tsx
│   │   │   └── PaymentForm.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── shared/
│   │   │   ├── LanguageSwitcher.tsx
│   │   │   ├── CurrencyDisplay.tsx
│   │   │   ├── LoadingStates.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── SEO.tsx
│   │   │
│   │   └── ui/ (existing shadcn components)
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Courses.tsx
│   │   ├── CourseDetail.tsx
│   │   ├── About.tsx
│   │   ├── Blog.tsx
│   │   ├── BlogPost.tsx
│   │   ├── Contact.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Checkout.tsx
│   │   ├── Admin.tsx
│   │   └── NotFound.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── storage.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── api/
│   │   │   ├── courses.ts
│   │   │   ├── enrollments.ts
│   │   │   ├── users.ts
│   │   │   ├── payments.ts
│   │   │   └── reviews.ts
│   │   │
│   │   ├── payments/
│   │   │   ├── stripe.ts
│   │   │   ├── paymob.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   ├── locales/
│   │   │   │   ├── en.json
│   │   │   │   ├── ar.json
│   │   │   │   └── sv.json
│   │   │
│   │   ├── utils/
│   │   │   ├── currency.ts
│   │   │   ├── date.ts
│   │   │   ├── validation.ts
│   │   │   └── seo.ts
│   │   │
│   │   └── hooks/
│   │       ├── useAuth.ts
│   │       ├── useCourses.ts
│   │       ├── useCart.ts
│   │       ├── usePayment.ts
│   │       └── useLanguage.ts
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   │   └── languageStore.ts
│   │
│   ├── types/
│   │   ├── database.ts
│   │   ├── course.ts
│   │   ├── user.ts
│   │   ├── payment.ts
│   │   └── index.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── functions/
│   └── config.toml
│
├── public/
│   ├── locales/
│   └── images/
│
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🗄️ Database Schema (PostgreSQL via Supabase)

### Core Tables

#### users (extended from Supabase auth.users)
```sql
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('student', 'instructor', 'admin')),
  preferred_language TEXT DEFAULT 'en',
  country TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

#### courses
```sql
courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  long_description TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  category TEXT,
  format TEXT CHECK (format IN ('self-paced', 'live', 'hybrid')),
  duration_hours INTEGER,
  price_usd DECIMAL(10,2),
  price_egp DECIMAL(10,2),
  price_sek DECIMAL(10,2),
  instructor_id UUID REFERENCES profiles(id),
  thumbnail_url TEXT,
  video_preview_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  prerequisites TEXT[],
  learning_outcomes TEXT[],
  target_audience TEXT[],
  certificate_included BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'en',
  rating DECIMAL(3,2) DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

#### course_modules
```sql
course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
)
```

#### lessons
```sql
lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL,
  resources JSONB, -- downloadable materials
  is_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

#### enrollments
```sql
enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  progress_percentage INTEGER DEFAULT 0,
  certificate_url TEXT,
  payment_id UUID REFERENCES payments(id),
  UNIQUE(user_id, course_id)
)
```

#### lesson_progress
```sql
lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  time_spent_minutes INTEGER DEFAULT 0,
  UNIQUE(enrollment_id, lesson_id)
)
```

#### payments
```sql
payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'paymob')),
  provider_payment_id TEXT,
  course_id UUID REFERENCES courses(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
)
```

#### reviews
```sql
reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, user_id)
)
```

#### blog_posts
```sql
blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  author_id UUID REFERENCES profiles(id),
  thumbnail_url TEXT,
  category TEXT,
  tags TEXT[],
  language TEXT DEFAULT 'en',
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

#### cart_items
```sql
cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
)
```

#### discount_codes
```sql
discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percentage INTEGER,
  discount_amount DECIMAL(10,2),
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  applicable_courses UUID[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## 🔌 API Endpoints Structure

### Public Endpoints
```
GET  /api/courses - List all published courses (with filters)
GET  /api/courses/:slug - Get course details
GET  /api/courses/:id/reviews - Get course reviews
GET  /api/blog - List blog posts
GET  /api/blog/:slug - Get blog post
```

### Protected Endpoints (Require Auth)
```
POST /api/enrollments - Enroll in a course
GET  /api/enrollments/:id/progress - Get enrollment progress
POST /api/reviews - Submit a review
GET  /api/dashboard/courses - Get user's enrolled courses
GET  /api/dashboard/certificates - Get user's certificates
POST /api/cart/add - Add course to cart
DELETE /api/cart/:id - Remove from cart
POST /api/payments/create-intent - Create payment intent
POST /api/payments/verify - Verify payment
```

### Admin Endpoints
```
POST /api/admin/courses - Create course
PUT  /api/admin/courses/:id - Update course
DELETE /api/admin/courses/:id - Delete course
GET  /api/admin/analytics - Get analytics data
POST /api/admin/discount-codes - Create discount code
```

## 🌍 Multi-Language Support

### i18n Structure
```typescript
// Language keys structure
{
  "nav": {
    "home": "Home",
    "courses": "Courses",
    "about": "About Us",
    "blog": "Blog",
    "contact": "Contact"
  },
  "hero": {
    "title": "Upskill in AI & Tech",
    "subtitle": "For Non-Techies",
    "cta": "Browse Courses"
  },
  "courses": {
    "filters": {
      "level": "Skill Level",
      "category": "Category",
      "format": "Format"
    }
  }
  // ... more keys
}
```

## 💳 Payment Integration

### Stripe (International)
- Payment intents for card payments
- Support for EUR, USD, SEK
- Webhooks for payment confirmation

### Paymob (Egypt)
- Integration for EGP
- Support for cards, mobile wallets, installments
- Webhook handling

## 🚀 Deployment Strategy

### Phase 1 (MVP) - Week 1-2
- [ ] Database setup
- [ ] Authentication
- [ ] Homepage
- [ ] Course catalog
- [ ] Course detail pages
- [ ] Basic enrollment
- [ ] Stripe payment integration

### Phase 2 - Week 3-4
- [ ] Student dashboard
- [ ] Progress tracking
- [ ] Multi-language support
- [ ] Admin panel
- [ ] Paymob integration

### Phase 3 - Week 5+
- [ ] Blog/Resources
- [ ] Advanced analytics
- [ ] Email notifications
- [ ] Certificate generation
- [ ] Mobile optimizations

## 🔒 Security Considerations

- Row Level Security (RLS) in Supabase
- API rate limiting
- Input validation with Zod
- XSS prevention
- CSRF protection
- Secure payment handling (PCI compliance via Stripe/Paymob)
- GDPR compliance (data export, deletion)

## 📊 Analytics Events to Track

- Page views
- Course views
- Enrollment starts
- Enrollment completions
- Lesson completions
- Payment success/failure
- Search queries
- Filter usage
- Cart additions/removals
