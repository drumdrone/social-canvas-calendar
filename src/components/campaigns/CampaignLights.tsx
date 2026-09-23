import React from 'react';
import { cn } from '@/lib/utils';

export interface CampaignLightPost {
  title: string;
  status: string;
  scheduledDate?: string | null;
}

// Statuses are free-form names — same "published" heuristic as the Plan page.
export const isPublishedStatus = (status?: string | null) => {
  const s = (status ?? '').toLowerCase();
  return s.includes('publikov') || s === 'published';
};

const LIGHTS = {
  done: { className: 'bg-green-500', label: 'Zveřejněno' },
  progress: { className: 'bg-orange-400', label: 'Naplánováno' },
  missing: { className: 'bg-red-500', label: 'Chybí' },
} as const;

/**
 * Traffic light for one campaign product: one dot per target post.
 * Green = published, orange = post created but not yet published,
 * red = post still missing. Extra posts beyond the target get extra dots.
 */
export const CampaignLights: React.FC<{
  posts: CampaignLightPost[];
  target: number;
  size?: 'sm' | 'md';
}> = ({ posts, target, size = 'md' }) => {
  const done = posts.filter(p => isPublishedStatus(p.status));
  const progress = posts.filter(p => !isPublishedStatus(p.status));
  const dots: Array<{ kind: keyof typeof LIGHTS; title: string }> = [
    ...done.map(p => ({ kind: 'done' as const, title: p.title })),
    ...progress.map(p => ({ kind: 'progress' as const, title: `${p.title}${p.status ? ` (${p.status})` : ''}` })),
  ];
  while (dots.length < target) dots.push({ kind: 'missing', title: '' });

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {dots.map((d, i) => (
        <span
          key={i}
          className={cn('rounded-full', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5', LIGHTS[d.kind].className)}
          title={d.title ? `${LIGHTS[d.kind].label}: ${d.title}` : LIGHTS[d.kind].label}
        />
      ))}
    </span>
  );
};
