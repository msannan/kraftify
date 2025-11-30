# Quick Start Guide - Running Kraftify

## Prerequisites Installation

### 1. Install Node.js and npm

**Option A: Using Homebrew (Recommended for macOS)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm)
brew install node
```

**Option B: Download from Official Website**
1. Visit https://nodejs.org/
2. Download the LTS version for macOS
3. Run the installer
4. Verify installation: `node --version` and `npm --version`

### 2. Install PostgreSQL

**Using Homebrew:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Or download from:**
https://www.postgresql.org/download/macosx/

### 3. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE kraftify;

# Exit
\q
```

## Running the Project

### Step 1: Install Dependencies

```bash
# In the project root
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### Step 2: Configure Environment

The `.env` file has been created. Update it with your database credentials:

```bash
# Edit .env file
nano .env

# Update these values:
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=kraftify
```

### Step 3: Start the Project

```bash
# Start both backend and frontend
npm run dev

# Or start separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Step 4: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## Troubleshooting

### Node.js not found
- Install Node.js using one of the methods above
- Restart your terminal after installation

### PostgreSQL connection error
- Make sure PostgreSQL is running: `brew services list`
- Check your database credentials in `.env`
- Verify database exists: `psql -U postgres -l`

### Port already in use
- Change PORT in `.env` for backend
- Kill process using port: `lsof -ti:5000 | xargs kill`

### Module not found errors
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Do the same in `client/` directory

## First Time Setup Checklist

- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL installed and running
- [ ] Database `kraftify` created
- [ ] `.env` file configured
- [ ] Root dependencies installed (`npm install`)
- [ ] Client dependencies installed (`cd client && npm install`)
- [ ] Server starts without errors
- [ ] Frontend loads at http://localhost:3000

## Testing the Setup

Once running, test the API:

```bash
# Health check
curl http://localhost:5000/api/health

# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "customer",
    "firstName": "Test",
    "lastName": "User"
  }'
```

If you see a response, everything is working! 🎉

