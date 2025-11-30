// Mock @xenova/transformers before importing
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(() => Promise.resolve({
    __call__: jest.fn((text) => {
      const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const embedding = Array(384).fill(0).map((_, i) => (hash + i) % 100 / 100);
      return { data: embedding };
    })
  }))
}));

const { cosineSimilarity } = require('../utils/semanticMatching');

describe('Semantic Matching - Cosine Similarity', () => {
  test('should return 1 for identical vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    expect(cosineSimilarity(vec1, vec2)).toBe(1);
  });

  test('should return 0 for orthogonal vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    expect(cosineSimilarity(vec1, vec2)).toBe(0);
  });

  test('should return 0 for null/empty vectors', () => {
    expect(cosineSimilarity(null, [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], null)).toBe(0);
    expect(cosineSimilarity(null, null)).toBe(0);
  });

  test('should return 0 for mismatched lengths', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2];
    expect(cosineSimilarity(vec1, vec2)).toBe(0);
  });

  test('should calculate similarity for similar vectors', () => {
    const vec1 = [1, 1, 0];
    const vec2 = [1, 1, 0];
    const result = cosineSimilarity(vec1, vec2);
    // Use toBeCloseTo for floating point comparison
    expect(result).toBeCloseTo(1, 10);
  });
});
