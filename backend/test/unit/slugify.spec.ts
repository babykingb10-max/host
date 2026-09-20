import { slugify } from '../../apps/api/src/common/utils/slugify';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('My Cool Project')).toBe('my-cool-project');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Hello, World! 123')).toBe('hello-world-123');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --weird--  ')).toBe('weird');
  });

  it('falls back to "project" for an empty result', () => {
    expect(slugify('???')).toBe('project');
  });

  it('truncates to 48 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(48);
  });
});
