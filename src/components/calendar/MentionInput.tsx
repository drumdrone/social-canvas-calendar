import React, { useState, useRef, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Author {
  name: string;
  initials: string;
  color: string;
  email?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  authors: Author[];
  className?: string;
  rows?: number;
}


export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = "Add a comment... Use @initials to mention team members",
  authors,
  className,
  rows = 4,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Author[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Parse mentions and return highlighted content
  const parseContent = () => {
    if (!value) return { highlighted: "", mentions: [] };

    const mentionRegex = /@([A-Z]{2,})/g;
    const mentions: string[] = [];
    let lastIndex = 0;
    let highlighted = "";
    let match;

    while ((match = mentionRegex.exec(value)) !== null) {
      const mentionInitials = match[1];
      const mentionedAuthor = authors.find(a => a.initials === mentionInitials);
      
      // Add text before mention
      highlighted += value.slice(lastIndex, match.index);
      
      if (mentionedAuthor) {
        mentions.push(mentionInitials);
        highlighted += `<span class="mention-highlight" data-initials="${mentionInitials}" style="background-color: ${mentionedAuthor.color}20; color: ${mentionedAuthor.color}; font-weight: 600; padding: 1px 4px; border-radius: 4px; border: 1px solid ${mentionedAuthor.color}40;">@${mentionInitials}</span>`;
      } else {
        highlighted += `<span class="mention-invalid" style="background-color: #ef444420; color: #ef4444; font-weight: 600; padding: 1px 4px; border-radius: 4px; border: 1px solid #ef444440;">@${mentionInitials}</span>`;
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    highlighted += value.slice(lastIndex);
    
    return { highlighted, mentions };
  };

  // Handle input changes and mention detection
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    
    // Check for mention trigger - more flexible regex to catch any @ pattern
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([A-Za-z]*)$/);
    
    console.log('Mention detection:', { textBeforeCursor, mentionMatch, authors });
    
    if (mentionMatch) {
      const query = mentionMatch[1].toUpperCase(); // Convert to uppercase for comparison
      const matchedAuthors = authors.filter(author =>
        author.initials.toUpperCase().startsWith(query) || 
        author.name.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log('Matched authors:', { query, matchedAuthors });
      
      if (matchedAuthors.length > 0) {
        setSuggestions(matchedAuthors);
        setMentionStart(cursorPosition - mentionMatch[0].length);
        setMentionQuery(query);
        setSelectedSuggestion(0);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion((prev) => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions[selectedSuggestion]) {
          e.preventDefault();
          insertMention(suggestions[selectedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Insert selected mention
  const insertMention = (author: Author) => {
    const beforeMention = value.slice(0, mentionStart);
    const afterMention = value.slice(mentionStart + mentionQuery.length + 1); // +1 for @
    const newValue = beforeMention + '@' + author.initials + ' ' + afterMention;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + author.initials.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Get valid mentions for validation display
  const { mentions: validMentions } = parseContent();

  return (
    <div className="relative">
      {/* Highlighted overlay for visual feedback */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={cn("relative z-10 bg-transparent", className)}
        />
        
        {/* Overlay for mention highlighting */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words text-transparent z-0 p-3 border border-transparent rounded-md text-sm leading-5"
          dangerouslySetInnerHTML={{
            __html: parseContent().highlighted.replace(/\n/g, '<br>')
          }}
        />
      </div>

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((author, index) => (
            <div
              key={author.initials}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                index === selectedSuggestion 
                  ? "bg-accent" 
                  : "hover:bg-accent/50"
              )}
              onClick={() => insertMention(author)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: author.color }}
              >
                {author.initials}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{author.name}</div>
                <div className="text-xs text-muted-foreground">
                  @{author.initials}
                  {author.email && (
                    <span className="ml-2 text-green-600">📧 Email enabled</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mention validation info */}
      {validMentions.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Mentions detected:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {validMentions.map((initials) => {
              const author = authors.find(a => a.initials === initials);
              return (
                <span
                  key={initials}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: `${author?.color}20`,
                    color: author?.color,
                    border: `1px solid ${author?.color}40`
                  }}
                >
                  @{initials}
                  {author?.email ? (
                    <span className="text-green-600">📧</span>
                  ) : (
                    <span className="text-orange-500" title="No email configured">⚠️</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};