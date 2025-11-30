// Mock for @xenova/transformers to avoid ES module issues in Jest
module.exports = {
  pipeline: jest.fn(() => Promise.resolve({
    __call__: jest.fn((text) => {
      // Mock embedding: simple hash-based embedding for testing
      const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const embedding = Array(384).fill(0).map((_, i) => (hash + i) % 100 / 100);
      return { data: embedding };
    })
  }))
};

