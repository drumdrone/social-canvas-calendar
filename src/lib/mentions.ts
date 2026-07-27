/**
 * Utilities for @person mentions in comments.
 *
 * A mention is written as `@Jméno Příjmení` (full name) or `@INI` (initials).
 * Matching is diacritics- and case-insensitive, so `@jan novak` matches
 * the author "Jan Novák".
 */

export interface MentionableAuthor {
  name: string;
  initials: string;
  color?: string;
  email?: string | null;
}

export interface MentionSegment {
  type: 'text' | 'mention';
  /** Raw text of the segment, mentions include the leading `@`. */
  text: string;
  /** Only set for `mention` segments. */
  author?: MentionableAuthor;
}

/** Lowercase + strip diacritics so `Novák` and `novak` compare equal. */
export function normalizeMentionText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

function isBoundary(char: string | undefined): boolean {
  return char === undefined || !WORD_CHAR.test(char);
}

interface MentionCandidate {
  token: string;
  author: MentionableAuthor;
}

function buildCandidates(authors: MentionableAuthor[]): MentionCandidate[] {
  const candidates: MentionCandidate[] = [];

  for (const author of authors) {
    if (author.name?.trim()) candidates.push({ token: author.name.trim(), author });
    if (author.initials?.trim()) candidates.push({ token: author.initials.trim(), author });
  }

  // Longest token first so `@Jan Novák` wins over a hypothetical `@Jan`.
  return candidates.sort((a, b) => b.token.length - a.token.length);
}

/**
 * Split a comment into plain-text and mention segments.
 * Unknown `@something` stays plain text.
 */
export function splitMentions(
  text: string,
  authors: MentionableAuthor[]
): MentionSegment[] {
  if (!text) return [];

  const candidates = buildCandidates(authors);
  const segments: MentionSegment[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) {
      segments.push({ type: 'text', text: buffer });
      buffer = '';
    }
  };

  while (i < text.length) {
    if (text[i] === '@' && isBoundary(text[i - 1])) {
      const rest = text.slice(i + 1);

      const hit = candidates.find(({ token }) => {
        const raw = rest.slice(0, token.length);
        if (raw.length !== token.length) return false;
        if (normalizeMentionText(raw) !== normalizeMentionText(token)) return false;
        return isBoundary(rest[token.length]);
      });

      if (hit) {
        flush();
        segments.push({
          type: 'mention',
          text: `@${rest.slice(0, hit.token.length)}`,
          author: hit.author,
        });
        i += 1 + hit.token.length;
        continue;
      }
    }

    buffer += text[i];
    i += 1;
  }

  flush();
  return segments;
}

/** Unique authors mentioned in a comment, in order of first appearance. */
export function findMentionedAuthors(
  text: string,
  authors: MentionableAuthor[]
): MentionableAuthor[] {
  const found: MentionableAuthor[] = [];

  for (const segment of splitMentions(text, authors)) {
    if (segment.type !== 'mention' || !segment.author) continue;
    const key = normalizeMentionText(segment.author.name || segment.author.initials);
    const alreadyFound = found.some(
      (a) => normalizeMentionText(a.name || a.initials) === key
    );
    if (!alreadyFound) found.push(segment.author);
  }

  return found;
}

export interface MentionQuery {
  /** Text typed after the `@`, may contain a single space (first + last name). */
  query: string;
  /** Index of the `@` character inside the analysed text. */
  start: number;
}

/**
 * Detect an in-progress `@…` mention directly before the caret.
 * Allows one space so `@Jan No` still searches for "Jan Novák".
 */
export function getMentionQuery(textBeforeCursor: string): MentionQuery | null {
  const match = textBeforeCursor.match(
    /(?:^|[\s([{,;:"'])@([^\s@]{0,24}(?:[ \u00a0][^\s@]{0,24})?)$/u
  );

  if (!match) return null;

  const query = match[1] ?? '';
  return { query, start: textBeforeCursor.length - query.length - 1 };
}

/** Authors matching what the user typed after `@`. */
export function filterAuthorsByQuery(
  authors: MentionableAuthor[],
  query: string
): MentionableAuthor[] {
  const normalizedQuery = normalizeMentionText(query);
  if (!normalizedQuery) return authors;

  return authors.filter((author) => {
    const name = normalizeMentionText(author.name || '');
    const initials = normalizeMentionText(author.initials || '');
    const email = normalizeMentionText(author.email || '');

    return (
      name.startsWith(normalizedQuery) ||
      name.includes(normalizedQuery) ||
      name.split(/\s+/).some((part) => part.startsWith(normalizedQuery)) ||
      initials.startsWith(normalizedQuery) ||
      email.startsWith(normalizedQuery)
    );
  });
}

/** Text inserted into the comment when a suggestion is picked. */
export function mentionToken(author: MentionableAuthor): string {
  return `@${author.name?.trim() || author.initials}`;
}
