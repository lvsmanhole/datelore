import { describe, it, expect } from 'vitest';
import { parseEssay, isPublishable, essayWordCount } from './essays';

const SAMPLE = `---
title: "Sample title"
summary: "A short summary under 160 characters."
author: "Roman Tailor"
reviewedBy: "Roman Tailor"
reviewedOn: "2026-06-23"
reviewed: true
---
Body paragraph one.

Body paragraph two.`;

describe('parseEssay', () => {
  it('splits frontmatter from body and types reviewed as boolean', () => {
    const { meta, body } = parseEssay(SAMPLE);
    expect(meta.title).toBe('Sample title');
    expect(meta.author).toBe('Roman Tailor');
    expect(meta.reviewedOn).toBe('2026-06-23');
    expect(meta.reviewed).toBe(true);
    expect(body.startsWith('Body paragraph one.')).toBe(true);
  });

  it('throws on a file with no frontmatter block', () => {
    expect(() => parseEssay('just some text, no dashes')).toThrow();
  });
});

describe('isPublishable', () => {
  it('is false when reviewed is false', () => {
    const { meta } = parseEssay(SAMPLE.replace('reviewed: true', 'reviewed: false'));
    expect(isPublishable(meta)).toBe(false);
  });

  it('is false when reviewed but the reviewer is blank', () => {
    const { meta } = parseEssay(SAMPLE.replace('reviewedBy: "Roman Tailor"', 'reviewedBy: ""'));
    expect(isPublishable(meta)).toBe(false);
  });

  it('is true for a fully reviewed essay', () => {
    expect(isPublishable(parseEssay(SAMPLE).meta)).toBe(true);
  });

  it('is false for null/undefined', () => {
    expect(isPublishable(null)).toBe(false);
    expect(isPublishable(undefined)).toBe(false);
  });
});

describe('essayWordCount', () => {
  it('counts whitespace-separated words', () => {
    expect(essayWordCount('one two three')).toBe(3);
  });
  it('is zero for blank bodies', () => {
    expect(essayWordCount('   \n  ')).toBe(0);
  });
});
