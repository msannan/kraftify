// Simple utility function tests (no database needed)

describe('Utility Functions', () => {
  test('should format currency correctly', () => {
    const formatCurrency = (amount) => {
      return `$${parseFloat(amount).toFixed(2)}`;
    };
    
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(99.5)).toBe('$99.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  test('should calculate average rating', () => {
    const calculateAverage = (ratings) => {
      if (ratings.length === 0) return 0;
      const sum = ratings.reduce((acc, rating) => acc + rating, 0);
      return sum / ratings.length;
    };
    
    expect(calculateAverage([5, 4, 3, 2, 1])).toBe(3);
    expect(calculateAverage([5, 5, 5])).toBe(5);
    expect(calculateAverage([])).toBe(0);
  });

  test('should truncate text to specified length', () => {
    const truncate = (text, maxLength) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };
    
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
    expect(truncate('This is a long text', 10)).toBe('This is a ...');
  });

  test('should validate URL format', () => {
    const isValidUrl = (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };
    
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  test('should sanitize user input', () => {
    const sanitize = (input) => {
      return input.trim().replace(/[<>]/g, '');
    };
    
    expect(sanitize('  hello world  ')).toBe('hello world');
    expect(sanitize('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    expect(sanitize('normal text')).toBe('normal text');
  });
});

