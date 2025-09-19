import { generateNameFromUrl } from '../utils/urlUtils';

describe('URL Name Generation', () => {
  const testCases = [
    {
      url: 'https://docs.google.com/document/d/1234567890/edit',
      expected: 'Google Doc',
      description: 'Google Docs URL'
    },
    {
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
      expected: 'YouTube Video',
      description: 'YouTube video URL'
    },
    {
      url: 'https://example.com/articles/understanding-quantum-physics',
      expected: 'Understanding Quantum Physics',
      description: 'Article URL with dashes'
    },
    {
      url: 'https://example.com/blog/2023/04/how_to_code_better.html',
      expected: 'How to Code Better',
      description: 'Blog post URL with underscores'
    },
    {
      url: 'https://github.com/user/repo/blob/main/README.md',
      expected: 'README',
      description: 'GitHub file URL'
    },
    {
      url: 'https://drive.google.com/file/d/1234567890/view',
      expected: 'Google Drive File',
      description: 'Google Drive file URL'
    }
  ];

  testCases.forEach(({ url, expected, description }) => {
    test(`generates name for ${description}`, () => {
      const result = generateNameFromUrl(url);
      expect(result).toBe(expected);
    });
  });

  test('handles invalid URLs gracefully', () => {
    const result = generateNameFromUrl('not-a-url');
    expect(result).toBe('Document');
  });

  test('handles empty URL gracefully', () => {
    const result = generateNameFromUrl('');
    expect(result).toBe('Document');
  });
});
