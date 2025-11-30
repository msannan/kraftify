# Kraftify - Digital Marketplace for Skilled Workers

A digital marketplace platform designed to help skilled workers (tradespeople) build credibility and connect directly with customers. The platform removes intermediaries, ensuring fair earnings for workers and creating direct, transparent relationships.

## Features

### For Tradespeople
- **Verified Digital Profiles**: Create and manage professional profiles with verification
- **Skills & Certifications**: Showcase your skills, experience, and certifications
- **Portfolio**: Display past projects with images and descriptions
- **Direct Customer Connection**: Connect directly with customers without intermediaries
- **Fair Earnings**: Keep 100% of your earnings (minus payment processing fees)
- **Reviews & Ratings**: Build credibility through customer reviews

### For Customers
- **Easy Discovery**: Search and filter tradespeople by skills, location, ratings, and rates
- **Verified Professionals**: View verified profiles with certifications and portfolios
- **Secure Booking**: Book services directly through the platform
- **Secure Payments**: Pay securely through integrated payment processing
- **Reviews**: Leave reviews and ratings after project completion

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** for authentication
- **Stripe** for payment processing
- **bcryptjs** for password hashing

### Frontend (To be implemented)
- **Next.js** (React framework)
- **Tailwind CSS** for styling
- **TypeScript** (optional)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kraftify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Create a PostgreSQL database named `kraftify`
   - Update the database credentials in `.env` file

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - Database credentials
   - JWT secret key
   - Stripe API keys (for payment processing)

5. **Run database migrations**
   The database tables will be created automatically when you start the server.

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Or run separately:
   ```bash
   # Backend only
   npm run server

   # Frontend (when implemented)
   npm run client
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Profiles
- `GET /api/profiles/:id` - Get tradesperson profile
- `PUT /api/profiles/:id` - Update tradesperson profile
- `POST /api/profiles/:id/skills` - Add skill
- `POST /api/profiles/:id/certifications` - Add certification
- `POST /api/profiles/:id/portfolio` - Add portfolio project

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/my-bookings` - Get user's bookings
- `PATCH /api/bookings/:id/status` - Update booking status

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/tradesperson/:id` - Get reviews for tradesperson

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook handler

### Search
- `GET /api/search` - Search tradespeople

## Database Schema

### Tables
- `users` - User accounts (tradespeople and customers)
- `tradesperson_profiles` - Tradesperson profile information
- `skills` - Skills associated with tradespeople
- `certifications` - Certifications and credentials
- `portfolio_projects` - Past projects showcase
- `bookings` - Service bookings
- `reviews` - Customer reviews and ratings
- `payments` - Payment records

## Development Roadmap

- [x] Backend API setup
- [x] Database schema and migrations
- [x] Authentication system
- [x] Profile management
- [x] Booking system
- [x] Review system
- [x] Payment integration
- [x] Search functionality
- [ ] Frontend implementation
- [ ] Image upload functionality
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Mobile app (future)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Support

For support, email support@kraftify.com or open an issue in the repository.
