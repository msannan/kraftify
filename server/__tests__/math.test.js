// Simple math utility tests (no database needed)

describe('Math Utilities', () => {
  test('should calculate percentage correctly', () => {
    const calculatePercentage = (value, total) => {
      if (total === 0) return 0;
      return (value / total) * 100;
    };
    
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(0, 100)).toBe(0);
    expect(calculatePercentage(100, 0)).toBe(0);
  });

  test('should round numbers to decimal places', () => {
    const roundTo = (num, decimals) => {
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };
    
    expect(roundTo(3.14159, 2)).toBe(3.14);
    expect(roundTo(3.14159, 0)).toBe(3);
    expect(roundTo(99.999, 2)).toBe(100);
  });

  test('should clamp values to range', () => {
    const clamp = (value, min, max) => {
      return Math.min(Math.max(value, min), max);
    };
    
    expect(clamp(50, 0, 100)).toBe(50);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
  });

  test('should calculate distance between two points', () => {
    const distance = (x1, y1, x2, y2) => {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };
    
    expect(distance(0, 0, 3, 4)).toBe(5); // 3-4-5 triangle
    expect(distance(0, 0, 0, 0)).toBe(0);
    expect(distance(1, 1, 4, 5)).toBe(5);
  });

  test('should check if number is in valid range', () => {
    const isInRange = (value, min, max) => {
      return value >= min && value <= max;
    };
    
    expect(isInRange(50, 0, 100)).toBe(true);
    expect(isInRange(0, 0, 100)).toBe(true);
    expect(isInRange(100, 0, 100)).toBe(true);
    expect(isInRange(-1, 0, 100)).toBe(false);
    expect(isInRange(101, 0, 100)).toBe(false);
  });
});

