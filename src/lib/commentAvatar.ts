// Shared between CommentList (avatar circles) and CommentEditor (the
// "replying to" indicator's accent color) so the same person always maps to
// the same color across both.

const AVATAR_COLORS = [
  '#E11D48', '#EA580C', '#D97706', '#65A30D',
  '#059669', '#0891B2', '#2563EB', '#7C3AED', '#C026D3',
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
