// Simple unit test for cosine similarity function (no database, no imports)
// Copy of the cosineSimilarity function for testing

function cosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

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
    // Use toBeCloseTo for floating point comparison
    expect(result).toBeCloseTo(1, 10);
  });
});
