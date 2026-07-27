import React, { useState, useRef, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MentionableAuthor,
  filterAuthorsByQuery,
  findMentionedAuthors,
  getMentionQuery,
  mentionToken,
} from "@/lib/mentions";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  authors: MentionableAuthor[];
  className?: string;
  rows?: number;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = "Napište komentář... Napište @ pro označení osoby",
  authors,
  className,
  rows = 4,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionableAuthor[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateSuggestions = (text: string, cursorPosition: number) => {
    const mention = getMentionQuery(text.slice(0, cursorPosition));

    if (!mention) {
      setShowSuggestions(false);
      return;
    }

    const matched = filterAuthorsByQuery(authors, mention.query);

    if (matched.length === 0) {
      setShowSuggestions(false);
      return;
    }

    setSuggestions(matched);
    setMentionStart(mention.start);
    setMentionQuery(mention.query);
    setSelectedSuggestion(0);
    setShowSuggestions(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    updateSuggestions(newValue, e.target.selectionStart);
  };

  // Typing `@` and then moving the caret should keep the list in sync
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    updateSuggestions(target.value, target.selectionStart);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
      case "Tab":
        if (suggestions[selectedSuggestion]) {
          e.preventDefault();
          insertMention(suggestions[selectedSuggestion]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const insertMention = (author: MentionableAuthor) => {
    const token = mentionToken(author);
    const beforeMention = value.slice(0, mentionStart);
    const afterMention = value.slice(mentionStart + mentionQuery.length + 1); // +1 for @
    const newValue = `${beforeMention}${token} ${afterMention.replace(/^ /, "")}`;

    onChange(newValue);
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + token.length + 1; // +1 for the space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const mentionedAuthors = findMentionedAuthors(value, authors);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((author, index) => (
            <div
              key={`${author.initials}-${author.name}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                index === selectedSuggestion ? "bg-accent" : "hover:bg-accent/50"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(author)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: author.color || "#3B82F6" }}
              >
                {author.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{author.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {author.email ? (
                    <span>📧 {author.email}</span>
                  ) : (
                    <span className="text-orange-500">
                      ⚠️ bez emailu – notifikace nedorazí
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detected mentions */}
      {mentionedAuthors.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Označené osoby:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {mentionedAuthors.map((author) => (
              <span
                key={`${author.initials}-${author.name}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: `${author.color || "#3B82F6"}20`,
                  color: author.color || "#3B82F6",
                  border: `1px solid ${author.color || "#3B82F6"}40`,
                }}
                title={author.email || "Bez emailu"}
              >
                @{author.name}
                {author.email ? (
                  <span className="text-green-600">📧</span>
                ) : (
                  <span className="text-orange-500" title="Autor nemá email">
                    ⚠️
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
