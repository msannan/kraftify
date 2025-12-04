// Unit Test 2: Password Strength Validation
// Tests if passwords meet minimum requirements

describe('Password Strength Validation', () => {
  // Helper function to validate password
  function isValidPassword(password) {
    if (!password) return false;
    // Password must be at least 6 characters long
    return password.length >= 6;
  }

  test('Test 1: Strong passwords (6+ characters) should pass', () => {
    // Expected: Passwords with 6 or more characters should be valid
    expect(isValidPassword('password123')).toBe(true);
    expect(isValidPassword('securepass')).toBe(true);
    expect(isValidPassword('123456')).toBe(true);
    expect(isValidPassword('abcdef')).toBe(true);
    
    console.log('✅ Test 1 PASSED: Strong passwords accepted');
    console.log('   Expected: true for passwords ≥6 characters');
    console.log('   Actual: All strong passwords returned true');
  });

  test('Test 2: Weak passwords (<6 characters) should fail', () => {
    // Expected: Passwords shorter than 6 characters should be invalid
    expect(isValidPassword('pass')).toBe(false);
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('abc')).toBe(false);
    expect(isValidPassword('x')).toBe(false);
    
    console.log('✅ Test 2 PASSED: Weak passwords rejected');
    console.log('   Expected: false for passwords <6 characters');
    console.log('   Actual: All weak passwords returned false');
  });

  test('Test 3: Empty or null passwords should fail', () => {
    // Expected: Empty/null passwords should be invalid
    expect(isValidPassword('')).toBe(false);
    expect(isValidPassword(null)).toBe(false);
    expect(isValidPassword(undefined)).toBe(false);
    
    console.log('✅ Test 3 PASSED: Empty/null passwords rejected');
    console.log('   Expected: false for empty/null passwords');
    console.log('   Actual: All empty/null passwords returned false');
  });
});

