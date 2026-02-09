import React from 'react';
import { format } from 'date-fns';

interface PostPdfPreviewProps {
  title: string;
  content: string;
  platform: string;
  author: string;
  scheduledDate: string;
  images: (string | null)[];
  category?: string;
  pillar?: string;
  status?: string;
}

export const PostPdfPreview = React.forwardRef<HTMLDivElement, PostPdfPreviewProps>(
  ({ title, content, platform, author, scheduledDate, images, category, pillar, status }, ref) => {
    const validImages = images.filter(Boolean) as string[];
    const dateStr = scheduledDate ? format(new Date(scheduledDate), 'd. MMMM yyyy, HH:mm') : '';

    return (
      <div
        ref={ref}
        style={{
          width: '500px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #dddfe2',
          overflow: 'hidden',
        }}
      >
        {/* Facebook Header */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1877F2, #42a5f5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            {author ? author.slice(0, 2).toUpperCase() : 'SC'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#050505' }}>
              {author || 'Social Canvas'}
            </div>
            <div style={{ fontSize: '12px', color: '#65676B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{dateStr}</span>
              <span style={{ margin: '0 2px' }}>&middot;</span>
              <span>&#127760;</span>
            </div>
          </div>
        </div>

        {/* Post Text */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: '15px', color: '#050505', fontWeight: 600, marginBottom: '4px' }}>
            {title}
          </div>
          {content && (
            <div style={{ fontSize: '14px', color: '#050505', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
              {content}
            </div>
          )}
        </div>

        {/* Tags bar */}
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {platform && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: '#E7F3FF',
              color: '#1877F2',
              fontWeight: 600,
            }}>
              {platform}
            </span>
          )}
          {category && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: '#F0F2F5',
              color: '#65676B',
              fontWeight: 600,
            }}>
              {category}
            </span>
          )}
          {pillar && pillar !== 'none' && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: '#FFF3E0',
              color: '#E65100',
              fontWeight: 600,
            }}>
              {pillar}
            </span>
          )}
          {status && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: '#E8F5E9',
              color: '#2E7D32',
              fontWeight: 600,
            }}>
              {status}
            </span>
          )}
        </div>

        {/* Images */}
        {validImages.length > 0 && (
          <div>
            {validImages.length === 1 && (
              <img
                src={validImages[0]}
                alt="Post"
                style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }}
                crossOrigin="anonymous"
              />
            )}
            {validImages.length === 2 && (
              <div style={{ display: 'flex', gap: '2px' }}>
                {validImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Post ${i + 1}`}
                    style={{ width: '50%', height: '250px', objectFit: 'cover', display: 'block' }}
                    crossOrigin="anonymous"
                  />
                ))}
              </div>
            )}
            {validImages.length >= 3 && (
              <div style={{ display: 'flex', gap: '2px' }}>
                <img
                  src={validImages[0]}
                  alt="Post 1"
                  style={{ width: '60%', height: '300px', objectFit: 'cover', display: 'block' }}
                  crossOrigin="anonymous"
                />
                <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {validImages.slice(1, 3).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Post ${i + 2}`}
                      style={{ width: '100%', height: '149px', objectFit: 'cover', display: 'block' }}
                      crossOrigin="anonymous"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Facebook-style reaction bar */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #dddfe2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#65676B', fontSize: '13px' }}>
            <span>Social Canvas Calendar</span>
            <span style={{ fontSize: '11px' }}>Naplanovano</span>
          </div>
        </div>

        {/* Facebook-style action buttons */}
        <div style={{
          display: 'flex',
          borderTop: '1px solid #dddfe2',
          padding: '4px 16px',
        }}>
          {[
            { icon: '\uD83D\uDC4D', label: 'To se mi libi' },
            { icon: '\uD83D\uDCAC', label: 'Komentar' },
            { icon: '\u21A9', label: 'Sdilet' },
          ].map((action) => (
            <div
              key={action.label}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px 0',
                fontSize: '13px',
                fontWeight: 600,
                color: '#65676B',
              }}
            >
              {action.icon} {action.label}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PostPdfPreview.displayName = 'PostPdfPreview';
