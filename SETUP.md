# Kraftify Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Database Setup

1. **Install PostgreSQL** (if not already installed)
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create Database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres

   # Create database
   CREATE DATABASE kraftify;

   # Exit
   \q
   ```

3. **Configure Environment Variables**
   ```bash
   # Copy example file
   cp env.example .env

   # Edit .env with your database credentials
   # Update DB_USER, DB_PASSWORD, etc.
   ```

### 3. Start the Application

```bash
# Start both backend and frontend
npm run dev

# Or start separately:
# Backend only
npm run server

# Frontend only (in another terminal)
npm run client
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## Database Tables

The database tables are automatically created when you start the server for the first time. The schema includes:

- `users` - User accounts
- `tradesperson_profiles` - Professional profiles
- `skills` - Skills and expertise
- `certifications` - Professional certifications
- `portfolio_projects` - Past work showcase
- `bookings` - Service bookings
- `reviews` - Customer reviews
- `payments` - Payment records

## Testing the API

### Register a Tradesperson
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tradesperson@example.com",
    "password": "password123",
    "role": "tradesperson",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Register a Customer
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123",
    "role": "customer",
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tradesperson@example.com",
    "password": "password123"
  }'
```

## Next Steps

1. **Set up Stripe** (for payments)
   - Create a Stripe account
   - Get your API keys
   - Add them to `.env`

2. **Configure Email** (optional)
   - Set up email service for notifications
   - Update email configuration

3. **Deploy**
   - Choose hosting platform (Heroku, AWS, etc.)
   - Set up production database
   - Configure environment variables

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists: `psql -U postgres -l`

### Port Already in Use
- Change PORT in `.env` for backend
- Change port in `client/package.json` for frontend

### Module Not Found
- Run `npm install` in root directory
- Run `npm install` in `client` directory

## Development Tips

1. **Database Reset**: Drop and recreate database to reset all data
2. **Logs**: Check server console for API logs
3. **API Testing**: Use Postman or curl for API testing
4. **Frontend**: Hot reload is enabled in development mode

