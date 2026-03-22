import { describe, it, expect } from 'vitest';
import { escapeCsvCell, buildCsv } from '../../lib/csv';

describe('escapeCsvCell', () => {
  it('wraps a normal string in double quotes', () => {
    expect(escapeCsvCell('hello')).toBe('"hello"');
  });

  it('escapes internal double quotes', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('handles null', () => {
    expect(escapeCsvCell(null)).toBe('""');
  });

  it('handles undefined', () => {
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it('handles numbers', () => {
    expect(escapeCsvCell(42)).toBe('"42"');
  });

  it('handles booleans', () => {
    expect(escapeCsvCell(true)).toBe('"true"');
    expect(escapeCsvCell(false)).toBe('"false"');
  });

  it('handles empty string', () => {
    expect(escapeCsvCell('')).toBe('""');
  });

  it('preserves commas inside the quoted cell', () => {
    expect(escapeCsvCell('a,b,c')).toBe('"a,b,c"');
  });

  it('preserves newlines inside the quoted cell', () => {
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles Japanese text', () => {
    expect(escapeCsvCell('田中太郎')).toBe('"田中太郎"');
  });
});

describe('buildCsv', () => {
  it('returns empty string for empty array', () => {
    expect(buildCsv([])).toBe('');
  });

  it('generates header row from object keys', () => {
    const csv = buildCsv([{ name: 'Alice', age: 30 }]);
    expect(csv.split('\n')[0]).toBe('"name","age"');
  });

  it('generates data rows', () => {
    const csv = buildCsv([{ name: 'Alice', age: 30 }]);
    expect(csv.split('\n')[1]).toBe('"Alice","30"');
  });

  it('handles multiple rows', () => {
    const csv = buildCsv([
      { id: '1', value: 'a' },
      { id: '2', value: 'b' },
    ]);
    expect(csv.split('\n')).toHaveLength(3);
  });

  it('escapes special characters in data', () => {
    const csv = buildCsv([{ note: 'He said "hello"' }]);
    expect(csv).toContain('""hello""');
  });

  it('handles Japanese text in values', () => {
    const csv = buildCsv([{ name: '田中太郎', role: 'スタッフ' }]);
    expect(csv).toContain('"田中太郎"');
  });

  it('handles large datasets without truncation', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), name: `row${i}` }));
    const csv = buildCsv(rows);
    expect(csv.split('\n')).toHaveLength(1001);
  });
});
