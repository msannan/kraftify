// Simple string utility tests (no database needed)

describe('String Utilities', () => {
  test('should capitalize first letter', () => {
    const capitalize = (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };
    
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('Hello');
    expect(capitalize('hELLo')).toBe('Hello');
  });

  test('should extract initials from name', () => {
    const getInitials = (firstName, lastName) => {
      if (!firstName || !lastName) return '';
      return (firstName[0] + lastName[0]).toUpperCase();
    };
    
    expect(getInitials('John', 'Doe')).toBe('JD');
    expect(getInitials('jane', 'smith')).toBe('JS');
    expect(getInitials('', 'Doe')).toBe('');
  });

  test('should check if string contains keyword', () => {
    const containsKeyword = (text, keyword) => {
      return text.toLowerCase().includes(keyword.toLowerCase());
    };
    
    expect(containsKeyword('I am a mechanic', 'mechanic')).toBe(true);
    expect(containsKeyword('I am a MECHANIC', 'mechanic')).toBe(true);
    expect(containsKeyword('I am an electrician', 'mechanic')).toBe(false);
  });

  test('should count words in string', () => {
    const countWords = (text) => {
      if (!text || text.trim() === '') return 0;
      return text.trim().split(/\s+/).length;
    };
    
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('This is a test')).toBe(4);
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  test('should format phone number', () => {
    const formatPhone = (phone) => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      }
      return phone;
    };
    
    expect(formatPhone('1234567890')).toBe('(123) 456-7890');
    expect(formatPhone('123-456-7890')).toBe('(123) 456-7890');
    expect(formatPhone('123')).toBe('123');
  });
});

