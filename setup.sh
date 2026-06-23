#!/bin/bash

# AgriSpark Web - Quick Setup Script

echo "🌾 AgriSpark Web Application - Setup"
echo "===================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "✗ Node.js is not installed. Please install it from https://nodejs.org"
    exit 1
fi
echo "✓ Node.js version: $(node --version)"

# Check npm
echo "✓ Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "✗ npm is not installed"
    exit 1
fi
echo "✓ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo ""
    echo "⚙️ Creating .env.local..."
    cp .env.example .env.local
    echo "⚠️ IMPORTANT: Edit .env.local and add your Supabase credentials:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=..."
    echo "   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=..."
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env.local with your Supabase credentials"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "📖 For detailed setup, see: SETUP.md"
echo "📝 For more info, see: README.md"
