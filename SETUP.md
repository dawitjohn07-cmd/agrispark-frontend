# 🚀 AgriSpark Web App - Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

## Installation Steps

### 1. Copy Environment File
```bash
cp .env.example .env.local
```

### 2. Add Supabase Credentials
Edit `.env.local` and add your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## 📝 Getting Supabase Credentials

1. Go to https://supabase.com and create a new project
2. Navigate to **Project Settings** → **API**
3. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 🗄️ Database Setup

Run these SQL commands in your Supabase dashboard to create the required tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  business_name TEXT,
  location TEXT,
  role TEXT CHECK(role IN ('farmer', 'buyer')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  price NUMERIC(10, 2),
  description TEXT,
  image_url TEXT,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  total_price NUMERIC(10, 2),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create storage bucket
INSERT INTO storage.buckets (id, name) VALUES ('product-images', 'product-images');

-- Set bucket policies
ALTER POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
ALTER POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
```

## 🧪 Testing Credentials (for development)

Create a test user:
1. Go to **Authentication** in Supabase dashboard
2. Create a new user with email/password
3. Use these credentials to log in to the web app

## 🏃 Running the App

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build

# Run production server
npm start

# Linting
npm run lint
```

## 🎯 First Steps

1. **Register as Farmer**: Complete the registration with your farm details
2. **Create Products**: Add your farm products with prices and quantities
3. **Register as Buyer**: In another browser/session, register as a buyer
4. **Browse Products**: See products listed and create orders

## 📱 Responsive Design

The web app is fully responsive:
- **Desktop**: Full-featured dashboard layout
- **Tablet**: Optimized for touch
- **Mobile**: Mobile-friendly with bottom tab navigation

## 🐛 Troubleshooting

### Port 3000 already in use?
```bash
npm run dev -- -p 3001
```

### Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Supabase connection fails?
- Check `.env.local` has correct credentials
- Verify Supabase project is active
- Check network connectivity

## 📖 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Icons](https://react-icons.github.io/react-icons/)

## 💡 Features Overview

### Farmer Dashboard
- View statistics and recent products
- Manage product inventory
- Track incoming orders
- Chat with buyers
- Profile management

### Buyer Interface
- Browse products by category
- Search and filter products
- Create and track orders
- Communication with farmers
- Account management

## 🚢 Deployment

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### Deploy with Docker
```bash
docker build -t agrispark .
docker run -p 3000:3000 agrispark
```

## 📞 Support

For issues or questions, refer to the main README.md file or check Supabase documentation.

---

**Happy Farming! 🌾**
