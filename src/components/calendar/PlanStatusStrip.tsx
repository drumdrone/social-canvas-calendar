import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { endOfMonth, endOfQuarter, format, startOfMonth, startOfQuarter } from 'date-fns';
import { cs } from 'date-fns/locale';

interface PlanStatusStripProps {
  currentDate: Date;
}

type Light = 'done' | 'progress' | 'missing';

const LIGHT_STYLES: Record<Light, { className: string; label: string }> = {
  done: { className: 'bg-green-500', label: 'Hotovo' },
  progress: { className: 'bg-orange-400', label: 'V procesu' },
  missing: { className: 'bg-red-500', label: 'Chybí' },
};

const getRequiredCount = (frequency?: string): number => {
  const match = frequency?.match(/(\d+)x/i);
  return match ? parseInt(match[1]) : 1;
};

// Same heuristic as the Plan page (RecurringActionCard): statuses are
// free-form names, so "published" is detected by name.
const isPublished = (status?: string) => {
  const s = (status ?? '').toLowerCase();
  return s.includes('publikov') || s === 'published';
};

/**
 * Compact "traffic light" overview of the Plan for the month shown in the
 * calendar: one row per recurring action, one dot per required post.
 * Green = published, orange = post exists but isn't published yet,
 * red = post still missing.
 */
export const PlanStatusStrip: React.FC<PlanStatusStripProps> = ({ currentDate }) => {
  const actionsQ = useQuery(api.recurringActions.list);
  const postsQ = useQuery(api.posts.list);

  const rows = useMemo(() => {
    if (!actionsQ || !postsQ) return [];
    return [...actionsQ]
      .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .map((action: any) => {
        const isQuarterly = action.actionType === 'quarterly';
        const start = isQuarterly ? startOfQuarter(currentDate) : startOfMonth(currentDate);
        const end = isQuarterly ? endOfQuarter(currentDate) : endOfMonth(currentDate);
        const perPeriod = getRequiredCount(action.frequency);
        // Weekly actions: count 4 weeks per month, matching the Plan page.
        const required = action.actionType === 'weekly' ? perPeriod * 4 : perPeriod;

        const posts = postsQ
          .filter((p: any) => {
            if (p.recurringActionId !== action._id || !p.scheduledDate) return false;
            const d = new Date(p.scheduledDate);
            return d >= start && d <= end;
          })
          .sort((a: any, b: any) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''));

        const done = posts.filter((p: any) => isPublished(p.status));
        const progress = posts.filter((p: any) => !isPublished(p.status));
        const lights: Array<{ light: Light; title: string }> = [
          ...done.map((p: any) => ({ light: 'done' as Light, title: p.title ?? '' })),
          ...progress.map((p: any) => ({
            light: 'progress' as Light,
            title: `${p.title ?? ''}${p.status ? ` (${p.status})` : ''}`,
          })),
        ];
        while (lights.length < required) lights.push({ light: 'missing', title: '' });

        return {
          id: action._id as string,
          title: action.title || 'Bez názvu',
          color: action.color as string | undefined,
          periodLabel: isQuarterly
            ? `Q${Math.floor(currentDate.getMonth() / 3) + 1}`
            : format(currentDate, 'LLLL', { locale: cs }),
          doneCount: done.length,
          required,
          lights,
        };
      });
  }, [actionsQ, postsQ, currentDate]);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
      {rows.map((row) => (
        <Link
          key={row.id}
          to="/plan"
          className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/60 transition-colors"
          title={`${row.title} – ${row.periodLabel}: hotovo ${row.doneCount} z ${row.required}`}
        >
          <span
            className="text-sm font-semibold whitespace-nowrap"
            style={row.color ? { color: row.color } : undefined}
          >
            {row.title}
          </span>
          <span className="flex items-center gap-1">
            {row.lights.map((l, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${LIGHT_STYLES[l.light].className}`}
                title={l.title ? `${LIGHT_STYLES[l.light].label}: ${l.title}` : LIGHT_STYLES[l.light].label}
              />
            ))}
          </span>
        </Link>
      ))}
    </div>
  );
};
