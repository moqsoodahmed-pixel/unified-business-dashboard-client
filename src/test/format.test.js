import { describe, it, expect } from 'vitest';
import { formatMoney, displayName, toQuery, timeAgo, rangeBounds, titleCase } from '../utils/format.js';

describe('format utils', () => {
  it('formats paise as rupees', () => {
    expect(formatMoney(2500000, 'INR')).toContain('25,000');
    expect(formatMoney(2500000, 'INR')).toContain('₹');
  });
  it('treats missing money as zero, not NaN', () => {
    expect(formatMoney(undefined)).not.toContain('NaN');
  });
  it('builds display names with fallbacks', () => {
    expect(displayName({ firstName: 'John', lastName: 'Doe' })).toBe('John Doe');
    expect(displayName({ phone: '919800000000' })).toBe('+919800000000');
    expect(displayName({ email: 'a@b.co' })).toBe('a@b.co');
    expect(displayName(null)).toBe('Unknown');
  });
  it('drops empty values from query strings and encodes the rest', () => {
    expect(toQuery({ q: 'a b', status: '', page: 2, none: undefined })).toBe('?q=a+b&page=2');
    expect(toQuery({})).toBe('');
  });
  it('describes elapsed time', () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 5 * 60000), now)).toMatch(/5/);
    expect(timeAgo(null)).toBe('');
  });
  it('title-cases status codes', () => {
    expect(titleCase('partially_refunded')).toBe('Partially Refunded');
  });
  it('returns ordered range bounds', () => {
    const { from, to } = rangeBounds({ range: 'last7' }, new Date('2026-09-29T10:00:00Z'));
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
  });
});
