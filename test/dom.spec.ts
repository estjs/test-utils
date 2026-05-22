import { describe, expect, it } from 'vitest';
import {
  describeTarget,
  getDocument,
  getDocumentBody,
  normalizeText,
  resolveElement,
} from '../src/dom';

describe('getDocument / getDocumentBody', () => {
  it('returns the global document under jsdom', () => {
    expect(getDocument()).toBe(document);
    expect(getDocumentBody()).toBe(document.body);
  });
});

describe('resolveElement', () => {
  it('returns the element verbatim when given an Element', () => {
    const div = document.createElement('div');
    expect(resolveElement(div)).toBe(div);
  });

  it('resolves a CSS selector against the document', () => {
    const div = document.createElement('div');
    div.id = 'host';
    document.body.append(div);
    expect(resolveElement('#host')).toBe(div);
    div.remove();
  });

  it('throws a descriptive error when the selector does not match', () => {
    expect(() => resolveElement('#missing')).toThrow(/Unable to find #missing/);
  });
});

describe('normalizeText', () => {
  it('collapses whitespace and trims', () => {
    expect(normalizeText('  hello\n\t world  ')).toBe('hello world');
  });

  it('handles empty strings', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText('   ')).toBe('');
  });
});

describe('describeTarget', () => {
  it('passes selector strings through', () => {
    expect(describeTarget('.my-button')).toBe('.my-button');
  });

  it('describes elements as tag#id.class', () => {
    const div = document.createElement('div');
    div.id = 'host';
    div.className = 'a  b';
    expect(describeTarget(div)).toBe('div#host.a.b');
  });

  it('falls back to String() for other inputs', () => {
    expect(describeTarget(42)).toBe('42');
    expect(describeTarget(null)).toBe('null');
  });
});
