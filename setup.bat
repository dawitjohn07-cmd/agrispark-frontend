@echo off
REM AgriSpark Web - Quick Setup Script for Windows

echo.
echo 🌾 AgriSpark Web Application - Setup
echo =====================================
echo.

REM Check Node.js
echo ✓ Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Node.js is not installed. Please install it from https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js version: %NODE_VERSION%

REM Check npm
echo ✓ Checking npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ npm is not installed
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm version: %NPM_VERSION%

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

REM Create .env.local if it doesn't exist
if not exist .env.local (
    echo.
    echo ⚙️ Creating .env.local...
    copy .env.example .env.local
    echo ⚠️ IMPORTANT: Edit .env.local and add your Supabase credentials:
    echo    NEXT_PUBLIC_SUPABASE_URL=...
    echo    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
)

echo.
echo ✓ Setup complete!
echo.
echo 📚 Next steps:
echo 1. Edit .env.local with your Supabase credentials
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo.
echo 📖 For detailed setup, see: SETUP.md
echo 📝 For more info, see: README.md
echo.
