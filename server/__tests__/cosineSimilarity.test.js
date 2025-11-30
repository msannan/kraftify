// Simple unit test for cosine similarity function (no database needed)
const { cosineSimilarity } = require('../utils/semanticMatching');

describe('Cosine Similarity', () => {
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

  test('should return 0 for null vectors', () => {
    expect(cosineSimilarity(null, [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], null)).toBe(0);
    expect(cosineSimilarity(null, null)).toBe(0);
  });

  test('should return 0 for mismatched vector lengths', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2];
    expect(cosineSimilarity(vec1, vec2)).toBe(0);
  });

  test('should calculate similarity for similar vectors', () => {
    const vec1 = [1, 1, 0];
    const vec2 = [1, 1, 0];
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBe(1);
  });
});

