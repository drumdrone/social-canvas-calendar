import React from 'react';
import { cn } from '@/lib/utils';
import { MentionableAuthor, splitMentions } from '@/lib/mentions';

interface MentionTextProps {
  text: string;
  authors: MentionableAuthor[];
  className?: string;
}

/**
 * Renders a comment with @mentions highlighted.
 * Text is rendered as React nodes (no dangerouslySetInnerHTML).
 */
export const MentionText: React.FC<MentionTextProps> = ({ text, authors, className }) => {
  const segments = splitMentions(text, authors);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <React.Fragment key={index}>{segment.text}</React.Fragment>;
        }

        const color = segment.author?.color?.startsWith('#')
          ? segment.author.color
          : null;

        return (
          <span
            key={index}
            className={cn(
              'font-semibold rounded px-1 py-0.5',
              !color && 'text-primary bg-primary/10'
            )}
            style={
              color ? { color, backgroundColor: `${color}1A` } : undefined
            }
            title={segment.author?.email || segment.author?.name}
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
};
