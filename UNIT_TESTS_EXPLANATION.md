# Unit Tests Explanation

## Overview

The Kraftify project has **6 unit test files** that test individual functions and utilities in isolation. These tests don't require a database or external services - they test pure functions and logic.

---

## Test File 1: `cosineSimilarity.test.js`

**What it tests**: The cosine similarity mathematical function used for semantic matching

**Purpose**: Ensures the algorithm correctly calculates similarity between two vectors (embeddings)

**Test Cases** (5 tests):
1. ✅ Returns 1 for identical vectors
2. ✅ Returns 0 for orthogonal (perpendicular) vectors  
3. ✅ Returns 0 for null/empty vectors
4. ✅ Returns 0 for mismatched vector lengths
5. ✅ Calculates similarity for similar vectors

**Example**:
```javascript
// Test: Identical vectors should have similarity of 1
cosineSimilarity([1, 0, 0], [1, 0, 0]) → Expected: 1
```

**Why it matters**: This function is critical for matching jobs with tradespeople based on semantic similarity.

---

## Test File 2: `semanticMatching.test.js`

**What it tests**: Semantic matching functionality (uses mocked transformer model)

**Purpose**: Tests the semantic matching logic that connects jobs with relevant tradespeople

**Test Cases** (5 tests):
1. ✅ Identical vectors return similarity of 1
2. ✅ Orthogonal vectors return 0
3. ✅ Null/empty vectors handled correctly
4. ✅ Mismatched lengths return 0
5. ✅ Similar vectors calculate correctly

**Note**: Uses a mock for `@xenova/transformers` to avoid loading the actual ML model during tests.

**Why it matters**: Ensures the job matching algorithm works correctly without needing the full ML model.

---

## Test File 3: `validation.test.js`

**What it tests**: Input validation logic

**Purpose**: Ensures user inputs are validated correctly before processing

**Test Cases** (5 tests):
1. ✅ Email format validation
   - Valid: `test@example.com` → true
   - Invalid: `invalid-email` → false
2. ✅ Password length validation
   - Valid: `password123` (≥6 chars) → true
   - Invalid: `pass` (<6 chars) → false
3. ✅ Required fields validation
   - All fields present → true
   - Missing fields → false
4. ✅ Number range validation
   - Valid: 300 (0-10000) → true
   - Invalid: -100 or 20000 → false
5. ✅ Date format validation
   - Valid: `2024-12-01` → true
   - Invalid: `12/01/2024` → false

**Why it matters**: Prevents invalid data from entering the system and causing errors.

---

## Test File 4: `math.test.js`

**What it tests**: Mathematical utility functions

**Purpose**: Tests common math operations used throughout the application

**Test Cases** (5 tests):
1. ✅ Percentage calculation
   - `calculatePercentage(50, 100)` → 50%
2. ✅ Rounding to decimal places
   - `roundTo(3.14159, 2)` → 3.14
3. ✅ Clamp values to range
   - `clamp(150, 0, 100)` → 100 (max)
   - `clamp(-10, 0, 100)` → 0 (min)
4. ✅ Distance calculation
   - Distance between two points
5. ✅ Range validation
   - Check if number is within valid range

**Why it matters**: Ensures calculations (ratings, percentages, distances) are accurate.

---

## Test File 5: `stringUtils.test.js`

**What it tests**: String manipulation utilities

**Purpose**: Tests helper functions for formatting and processing text

**Test Cases** (5 tests):
1. ✅ Capitalize first letter
   - `capitalize('hello')` → `'Hello'`
2. ✅ Extract initials from name
   - `getInitials('John', 'Doe')` → `'JD'`
3. ✅ Check if string contains keyword
   - `containsKeyword('I am a mechanic', 'mechanic')` → true
4. ✅ Count words in string
   - `countWords('Hello world')` → 2
5. ✅ Format phone number
   - `formatPhone('1234567890')` → `'(123) 456-7890'`

**Why it matters**: Ensures text formatting and processing works correctly for user data.

---

## Test File 6: `utils.test.js`

**What it tests**: General utility functions

**Purpose**: Tests common utility functions used across the application

**Test Cases** (5 tests):
1. ✅ Currency formatting
   - `formatCurrency(100)` → `'$100.00'`
2. ✅ Average rating calculation
   - `calculateAverage([5, 4, 3, 2, 1])` → 3
3. ✅ Text truncation
   - `truncate('Hello World', 5)` → `'Hello...'`
4. ✅ URL validation
   - `isValidUrl('http://example.com')` → true
5. ✅ Input sanitization
   - Removes dangerous characters and trims whitespace

**Why it matters**: Ensures data formatting and security (sanitization) work correctly.

---

## Summary

**Total Unit Tests**: 30 tests across 6 files

**What They Test**:
- ✅ Mathematical functions (cosine similarity, percentages, rounding)
- ✅ Input validation (email, password, dates, numbers)
- ✅ String manipulation (formatting, capitalization, truncation)
- ✅ Utility functions (currency, ratings, sanitization)

**What They DON'T Test**:
- ❌ Database operations
- ❌ API endpoints
- ❌ External services
- ❌ Frontend components

**Key Characteristics**:
- Fast execution (no database or network calls)
- Isolated (each test is independent)
- Pure functions (same input = same output)
- No external dependencies

---

## Running the Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- validation.test.js

# Run with coverage
npm run test:coverage
```

**Expected Output**: All 30 tests should pass ✅

