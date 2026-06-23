# AgriSpark Web Application

A fully-functional web application converting the React Native mobile app to a Next.js web platform. This version preserves all UI/UX design, navigation logic, and features of the original mobile app while making it accessible through modern web browsers.

## 🚀 Features

### For Farmers
- ✅ Farmer Dashboard with real-time statistics
- ✅ Product Management (Create, Edit, Delete)
- ✅ Order Tracking and History
- ✅ Direct Communication with Buyers
- ✅ Inventory Management with Stock Alerts
- ✅ Profile Management

### For Buyers
- ✅ Browse Products by Category
- ✅ Search and Filter Functionality
- ✅ Product Details and Reviews
- ✅ Order Management
- ✅ Order History
- ✅ Direct Chat with Farmers
- ✅ Profile Management

### Core Features
- ✅ Secure Supabase Authentication
- ✅ Email/Password Login and Registration
- ✅ Password Reset Functionality
- ✅ Role-based Access Control (Farmer/Buyer)
- ✅ Real-time Database Sync
- ✅ Image Upload Support
- ✅ Responsive Design (Desktop & Mobile Web)
- ✅ Local Storage for Sessions

## 📋 Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (for images)
- **Deployment Ready**: Vercel/Railway

## 🔧 Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- npm or yarn
- A Supabase account and project
- Git (for cloning)

## 📦 Installation

### 1. Clone and Navigate
```bash
cd web-app
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

Then update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## 🗂️ Project Structure

```
web-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with auth logic
│   │   ├── page.tsx                # Landing page
│   │   ├── login/
│   │   │   └── page.tsx            # Login & Registration
│   │   ├── reset-password/
│   │   │   └── page.tsx            # Password reset
│   │   ├── farmer/
│   │   │   ├── page.tsx            # Farmer dashboard
│   │   │   ├── products/
│   │   │   │   └── page.tsx        # Product list
│   │   │   ├── create/
│   │   │   │   └── page.tsx        # Create product
│   │   │   ├── orders/
│   │   │   │   └── page.tsx        # Orders list
│   │   │   └── chat/
│   │   │       └── page.tsx        # Chat interface
│   │   └── buyer/
│   │       ├── page.tsx            # Buyer home
│   │       ├── orders/
│   │       │   └── page.tsx        # My orders
│   │       ├── chat/
│   │       │   └── page.tsx        # Chat with farmers
│   │       └── profile/
│   │           └── page.tsx        # User profile
│   ├── components/
│   │   ├── Header.tsx              # Navigation header
│   │   └── TabBar.tsx              # Bottom tab navigation
│   ├── lib/
│   │   ├── supabaseClient.ts       # Supabase initialization
│   │   ├── utils.ts                # Utility functions
│   │   └── storage.ts              # Local storage utilities
│   └── styles/
│       └── globals.css             # Global styles & Tailwind
├── public/                         # Static assets
├── .env.example                    # Environment template
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── next.config.js                  # Next.js config
├── tailwind.config.js              # Tailwind config
└── postcss.config.js               # PostCSS config
```

## 🔐 Authentication Flow

1. **Registration**: Users sign up as Farmer or Buyer
   - Basic details (name, email, password)
   - Farmers: Farm name and location
   - Buyers: Company info (optional)

2. **Login**: Email/Password authentication via Supabase
   - Session persisted in localStorage
   - Auto-redirect based on user role

3. **Password Reset**: Email-based password recovery

4. **Session Management**: Auto-logout on session expiry

## 🗄️ Database Schema

### Required Supabase Tables

#### users
```sql
- id (uuid, primary key)
- email (text)
- full_name (text)
- phone_number (text)
- business_name (text)
- location (text)
- role (text: farmer/buyer)
- created_at (timestamp)
```

#### products
```sql
- id (uuid, primary key)
- farmer_id (uuid, foreign key)
- name (text)
- category (text)
- quantity (integer)
- price (numeric)
- description (text)
- image_url (text)
- location (text)
- created_at (timestamp)
```

#### orders
```sql
- id (uuid, primary key)
- product_id (uuid, foreign key)
- buyer_id (uuid, foreign key)
- quantity (integer)
- total_price (numeric)
- status (text: pending/completed/cancelled)
- created_at (timestamp)
```

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run linter
npm run lint
```

## 🌐 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Docker
```bash
docker build -t agrispark-web .
docker run -p 3000:3000 agrispark-web
```

### Environment Variables
Set these on your hosting platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 🎨 Customization

### Colors
Update in `tailwind.config.js`:
- `farmer-green`: Farmer theme color (#0F9D58)
- `buyer-blue`: Buyer theme color (#0E698C)

### Fonts
Modify `src/styles/globals.css` to use custom fonts

### Images
Place static images in `public/` folder

## 🔗 API Integration

### Supabase Setup
1. Create a new Supabase project
2. Create tables as per schema above
3. Enable authentication (Email provider)
4. Set up storage bucket for images
5. Get your credentials from Settings > API

### Image Upload
Images are stored in Supabase Storage bucket `product-images`

## 🚨 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` has correct variables
- Restart dev server after changing env

### "User profile not found"
- Ensure user exists in `users` table
- Check role is set correctly

### "Authentication failed"
- Verify email/password
- Check Supabase auth settings
- Ensure user email is verified

### Images not loading
- Check image URLs are correct
- Verify Supabase Storage bucket permissions
- Ensure image_url field in database is populated

## 📝 Migration Notes

This web version preserves:
- ✅ Exact UI/UX layout from React Native app
- ✅ All navigation structure (farmer/buyer routes)
- ✅ Complete feature set
- ✅ Supabase backend integration
- ✅ Authentication flow
- ✅ Data models and database schema

Changes from React Native:
- React Native components → HTML/React web components
- React Navigation → Next.js App Router
- AsyncStorage → localStorage
- Expo Router → Next.js routing
- React Native StyleSheet → Tailwind CSS
- Expo packages → web equivalents

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review Supabase documentation: https://supabase.com/docs
3. Check Next.js documentation: https://nextjs.org/docs

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**AgriSpark Web** - Connecting Farmers & Buyers Directly 🌾
