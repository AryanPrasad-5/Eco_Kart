import { describe, expect, it } from 'vitest';
import { isWasteCategory, normalizeCategory } from '../src/shared/categories';
import { validateVerdict } from '../src/services/classify';
import { ClassificationError, HttpError } from '../src/shared/errors';

describe('category validation', () => {
  it('accepts exactly the seven categories', () => {
    for (const c of ['plastic', 'paper', 'metal', 'glass', 'e-waste', 'organic', 'other']) {
      expect(isWasteCategory(c)).toBe(true);
    }
  });

  it('rejects non-canonical categories', () => {
    for (const c of ['Plastic ', 'batteries', 'e-waste ', '', 'ELECTRONIC', 12, null, undefined]) {
      expect(isWasteCategory(c)).toBe(false);
    }
  });

  it('normalizes model-style spellings to canonical categories', () => {
    expect(normalizeCategory('Plastic')).toBe('plastic');
    expect(normalizeCategory('e_waste')).toBe('e-waste');
    expect(normalizeCategory('EWASTE')).toBe('e-waste');
    expect(normalizeCategory(' organic ')).toBe('organic');
  });

  it('returns null for unmappable categories', () => {
    expect(normalizeCategory('batteries')).toBeNull();
    expect(normalizeCategory('')).toBeNull();
    expect(normalizeCategory(42)).toBeNull();
  });
});

describe('validateVerdict (runtime model-output validation)', () => {
  const ok = { category: 'plastic', confidence: 0.87, rationale: 'Moulded translucent bottle.' };

  it('accepts a fully valid verdict', () => {
    expect(validateVerdict(ok, 'test-model')).toEqual(ok);
  });

  it('rejects non-canonical categories', () => {
    expect(() => validateVerdict({ ...ok, category: 'batteries' }, 'm')).toThrow(ClassificationError);
  });

  it('rejects missing category', () => {
    const { category: _dropped, ...rest } = ok;
    expect(() => validateVerdict(rest, 'm')).toThrow(ClassificationError);
  });

  it('rejects confidence outside [0,1] and non-numeric confidence', () => {
    expect(() => validateVerdict({ ...ok, confidence: 1.2 }, 'm')).toThrow(ClassificationError);
    expect(() => validateVerdict({ ...ok, confidence: -0.1 }, 'm')).toThrow(ClassificationError);
    expect(() => validateVerdict({ ...ok, confidence: 'high' }, 'm')).toThrow(ClassificationError);
    expect(() => validateVerdict({ ...ok, confidence: NaN }, 'm')).toThrow(ClassificationError);
  });

  it('rejects missing, empty, or overlong rationale', () => {
    expect(() => validateVerdict({ ...ok, rationale: '   ' }, 'm')).toThrow(ClassificationError);
    expect(() => validateVerdict({ ...ok, rationale: 'x'.repeat(401) }, 'm')).toThrow(ClassificationError);
    expect(() => validateVerdict({ ...ok, rationale: 42 }, 'm')).toThrow(ClassificationError);
  });

  it('rejects non-object tool input', () => {
    expect(() => validateVerdict('plastic', 'm')).toThrow(ClassificationError);
    expect(() => validateVerdict(null, 'm')).toThrow(ClassificationError);
  });

  it('trims rationale to 300 chars on success', () => {
    const long = validateVerdict({ ...ok, rationale: 'r'.repeat(350) }, 'm');
    expect(long.rationale).toHaveLength(300);
  });

  it('ClassificationError carries a reason code', () => {
    try {
      validateVerdict({ ...ok, confidence: 5 }, 'm');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ClassificationError);
      expect((err as ClassificationError).reason).toBe('invalid_output');
    }
  });

  it('HttpError is not conflated with ClassificationError', () => {
    expect(new HttpError(400, 'x')).toBeInstanceOf(HttpError);
    expect(new HttpError(400, 'x')).not.toBeInstanceOf(ClassificationError);
  });
});
