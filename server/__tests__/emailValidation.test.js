// Unit Test 1: Email Validation
// Tests if email addresses are valid or invalid

describe('Email Validation', () => {
  // Helper function to validate email
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  test('Test 1: Valid email addresses should return true', () => {
    // Expected: Valid emails should pass validation
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('john.doe@company.co.uk')).toBe(true);
    expect(isValidEmail('test123@domain.com')).toBe(true);
    
    console.log('✅ Test 1 PASSED: Valid emails accepted');
    console.log('   Expected: true for valid emails');
    console.log('   Actual: All valid emails returned true');
  });

  test('Test 2: Invalid email addresses should return false', () => {
    // Expected: Invalid emails should fail validation
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
    
    console.log('✅ Test 2 PASSED: Invalid emails rejected');
    console.log('   Expected: false for invalid emails');
    console.log('   Actual: All invalid emails returned false');
  });

  test('Test 3: Empty or null emails should return false', () => {
    // Expected: Empty/null values should fail validation
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    
    console.log('✅ Test 3 PASSED: Empty/null emails rejected');
    console.log('   Expected: false for empty/null values');
    console.log('   Actual: All empty/null values returned false');
  });
});

