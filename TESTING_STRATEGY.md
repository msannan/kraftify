# Testing Strategy for CI/CD

This document outlines the types of tests you can write for your Kraftify application to enable CI/CD.

## Test Categories

### 1. **Backend API Tests** (Unit & Integration)

#### Authentication Routes (`/api/auth`)
- ✅ User registration (customer & tradesperson)
- ✅ User login (JWT token generation)
- ✅ Token validation
- ✅ Password hashing verification
- ✅ Duplicate email prevention
- ✅ Invalid credentials handling

#### Profile Routes (`/api/profiles`)
- ✅ Get tradesperson profile
- ✅ Update profile
- ✅ Upload profile image
- ✅ Add/remove skills
- ✅ Add/remove certifications
- ✅ Add/remove portfolio projects
- ✅ Validation of required fields

#### Customer Profile Routes (`/api/customer-profiles`)
- ✅ Get customer profile
- ✅ Update customer profile
- ✅ Upload customer image
- ✅ Update user details

#### Job Routes (`/api/jobs`)
- ✅ Create job posting
- ✅ Get job by ID
- ✅ Get jobs for tradesperson (semantic matching)
- ✅ Get customer's jobs
- ✅ Update job status
- ✅ Delete job
- ✅ Cancel job with accepted bids
- ✅ Job image uploads
- ✅ Required skills validation

#### Bid Routes (`/api/bids`)
- ✅ Create bid
- ✅ Get bids for a job
- ✅ Get tradesperson's bids
- ✅ Accept bid
- ✅ Reject bid
- ✅ Re-bid after rejection
- ✅ Prevent duplicate active bids
- ✅ Bid amount validation

#### Message Routes (`/api/messages`)
- ✅ Create message thread
- ✅ Get message threads
- ✅ Send message (with/without job)
- ✅ Get conversation messages
- ✅ Direct contact messaging
- ✅ Message attachments
- ✅ Mark messages as read

#### Notification Routes (`/api/notifications`)
- ✅ Get user notifications
- ✅ Mark notification as read
- ✅ Mark all as read
- ✅ Notification creation on new job

#### Search Routes (`/api/search`)
- ✅ Search tradespeople by query
- ✅ Filter by location
- ✅ Filter by skills
- ✅ Filter by rating
- ✅ Filter by hourly rate
- ✅ Sort results

### 2. **Semantic Matching Tests** (Critical Feature)

#### Job Matching Algorithm
- ✅ Semantic similarity calculation
- ✅ Keyword fallback matching
- ✅ Trade-specific keyword matching
- ✅ Exclusion keywords (mechanic vs electrician)
- ✅ Threshold validation (0.35 for semantic, 0.4 for keyword)
- ✅ Profile with minimal data handling
- ✅ Portfolio description matching
- ✅ Bio matching
- ✅ Skills matching

#### Edge Cases
- ✅ Empty profile bio
- ✅ No portfolio projects
- ✅ Mismatched categories (customer error)
- ✅ Multiple trade keywords in profile
- ✅ Very short job descriptions

### 3. **Database Tests**

#### Schema Validation
- ✅ Table creation
- ✅ Foreign key constraints
- ✅ Unique constraints
- ✅ Check constraints (status values)
- ✅ Cascade deletes

#### Data Integrity
- ✅ User deletion cascades to profiles
- ✅ Job deletion cascades to bids
- ✅ Message thread creation
- ✅ Notification cleanup

### 4. **Authentication & Authorization Tests**

#### JWT Token
- ✅ Token generation
- ✅ Token expiration
- ✅ Invalid token handling
- ✅ Missing token handling
- ✅ Token refresh (if implemented)

#### Role-Based Access
- ✅ Customer-only endpoints
- ✅ Tradesperson-only endpoints
- ✅ Public endpoints
- ✅ Job owner verification
- ✅ Bid owner verification

### 5. **File Upload Tests**

#### Image Uploads
- ✅ Profile image upload
- ✅ Job image upload
- ✅ Message attachment upload
- ✅ File type validation
- ✅ File size limits
- ✅ Invalid file rejection
- ✅ File storage verification

### 6. **WebSocket/Real-time Tests**

#### Socket.IO Connection
- ✅ User connection
- ✅ Room joining
- ✅ Message broadcasting
- ✅ Notification delivery
- ✅ Disconnection handling
- ✅ Heartbeat mechanism

### 7. **Frontend Component Tests** (React/Next.js)

#### Pages
- ✅ Login page
- ✅ Registration page
- ✅ Dashboard pages
- ✅ Profile pages
- ✅ Job posting page
- ✅ Browse jobs page
- ✅ Job detail page
- ✅ Messages page
- ✅ Search page

#### Components
- ✅ Toast notifications
- ✅ Notification header
- ✅ Form validation
- ✅ Image upload components
- ✅ Message thread list
- ✅ Bid display components

#### User Interactions
- ✅ Form submissions
- ✅ Button clicks
- ✅ Navigation
- ✅ Modal dialogs
- ✅ Dropdown menus

### 8. **Integration Tests** (End-to-End Workflows)

#### Customer Workflow
1. Register as customer
2. Complete profile
3. Post a job
4. Receive bids
5. Accept/reject bids
6. Message tradesperson
7. Complete job

#### Tradesperson Workflow
1. Register as tradesperson
2. Complete profile (bio, skills, portfolio)
3. Receive job notifications (semantic matching)
4. View matched jobs
5. Place bid
6. Message customer
7. Get bid accepted/rejected
8. Re-bid if rejected

#### Direct Contact Workflow
1. Customer views tradesperson profile
2. Customer sends direct message
3. Tradesperson receives notification
4. Tradesperson replies
5. Conversation continues

### 9. **Performance Tests**

#### API Response Times
- ✅ Job matching algorithm speed
- ✅ Semantic similarity calculation
- ✅ Database query optimization
- ✅ Image upload processing
- ✅ Message thread loading

#### Load Tests
- ✅ Multiple concurrent users
- ✅ High message volume
- ✅ Large job posting lists
- ✅ Search with many results

### 10. **Security Tests**

#### Input Validation
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ File upload security
- ✅ Path traversal prevention

#### Authentication Security
- ✅ Password strength
- ✅ Token security
- ✅ Session management
- ✅ CSRF protection

### 11. **Data Validation Tests**

#### Required Fields
- ✅ Job title, description
- ✅ Bid amount, proposal
- ✅ Profile bio
- ✅ Message content

#### Data Types
- ✅ Number validation (bid amount, hourly rate)
- ✅ Date validation
- ✅ Email validation
- ✅ URL validation

#### Business Rules
- ✅ Bid amount > 0
- ✅ Hourly rate > 0
- ✅ Job budget ranges
- ✅ Availability dates

## Recommended Testing Stack

### Backend Testing
- **Jest** - Test framework
- **Supertest** - HTTP assertions
- **PostgreSQL test database** - Isolated test DB

### Frontend Testing
- **Jest** - Test framework
- **React Testing Library** - Component testing
- **Playwright** or **Cypress** - E2E testing

### CI/CD Tools
- **GitHub Actions** or **GitLab CI** - CI/CD pipeline
- **Docker** - Containerization for consistent testing
- **Coverage tools** - Code coverage reporting

## Test Priority

### High Priority (Must Have)
1. ✅ Authentication & Authorization
2. ✅ Job matching algorithm (semantic matching)
3. ✅ Bid creation and status management
4. ✅ Message sending and receiving
5. ✅ File uploads
6. ✅ Critical user workflows

### Medium Priority (Should Have)
1. ✅ Profile management
2. ✅ Search functionality
3. ✅ Notification system
4. ✅ Job status updates
5. ✅ Direct contact messaging

### Low Priority (Nice to Have)
1. ✅ UI component tests
2. ✅ Performance tests
3. ✅ Load tests
4. ✅ Edge case handling

## Example Test Structure

```
tests/
├── unit/
│   ├── auth.test.js
│   ├── profiles.test.js
│   ├── jobs.test.js
│   ├── bids.test.js
│   ├── messages.test.js
│   └── semanticMatching.test.js
├── integration/
│   ├── customer-workflow.test.js
│   ├── tradesperson-workflow.test.js
│   └── direct-contact.test.js
├── e2e/
│   ├── job-posting.spec.js
│   ├── bidding.spec.js
│   └── messaging.spec.js
└── fixtures/
    ├── users.json
    ├── jobs.json
    └── profiles.json
```

## CI/CD Pipeline Stages

1. **Lint & Format** - Code quality checks
2. **Unit Tests** - Fast, isolated tests
3. **Integration Tests** - API and database tests
4. **E2E Tests** - Full user flow tests
5. **Build** - Verify application builds
6. **Deploy** - Deploy to staging/production

## Notes

- Start with high-priority tests
- Focus on critical business logic (semantic matching, bidding)
- Use test databases to avoid affecting production
- Mock external services (if any)
- Keep tests fast and independent
- Use fixtures for test data
- Test both success and failure cases

