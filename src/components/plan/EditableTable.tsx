import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Copy, Trash2 } from 'lucide-react';

interface Cell {
  id: string;
  content: string;
  fontSize: 'small' | 'large';
  backgroundColor: string;
}

interface Section {
  id: string;
  cells: Cell[][]; // 5 rows x 4 cols (A-D)
}

const backgroundColors = [
  { name: 'Default', value: 'transparent' },
  { name: 'Light Blue', value: 'bg-blue-50' },
  { name: 'Light Green', value: 'bg-green-50' },
  { name: 'Light Yellow', value: 'bg-yellow-50' },
  { name: 'Light Red', value: 'bg-red-50' },
  { name: 'Light Purple', value: 'bg-purple-50' },
];

const weeks = ['1. týden', '2. týden', '3. týden', '4. týden'] as const;
const contentTypes = ['Image', 'Carousel', 'Video'] as const;
const categories = ['Novinky', 'Veda'] as const;

const createDefaultSection = (): Section => {
  const cells: Cell[][] = Array.from({ length: 5 }, (_, rowIndex) =>
    Array.from({ length: 4 }, (_, colIndex) => {
      const id = `${rowIndex}-${colIndex}-${Math.random().toString(36).slice(2, 7)}`;
      if (rowIndex === 0 && colIndex === 0) {
        // A1: Title cell (H1-like), spans across all columns visually
        return {
          id,
          content: '',
          fontSize: 'large',
          backgroundColor: 'transparent',
        };
      }
      if (colIndex === 0 && rowIndex > 0) {
        // A2-A5: Week labels (not editable)
        return {
          id,
          content: weeks[rowIndex - 1],
          fontSize: 'small',
          backgroundColor: 'transparent',
        };
      }
      return {
        id,
        content: '',
        fontSize: 'small',
        backgroundColor: 'transparent',
      };
    })
  );

  return { id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` , cells };
};

export const EditableTable = () => {
  const [sections, setSections] = useState<Section[]>([createDefaultSection()]);
  const [selectedCell, setSelectedCell] = useState<{ section: number; row: number; col: number } | null>(null);

  const updateCell = (sectionIdx: number, row: number, col: number, updates: Partial<Cell>) => {
    setSections(prev => prev.map((sec, si) => {
      if (si !== sectionIdx) return sec;
      const nextCells = sec.cells.map((rowCells, r) =>
        r === row ? rowCells.map((cell, c) => (c === col ? { ...cell, ...updates } : cell)) : rowCells
      );
      return { ...sec, cells: nextCells };
    }));
  };

  const handleCellClick = (sectionIdx: number, row: number, col: number) => {
    setSelectedCell({ section: sectionIdx, row, col });
  };

  const handleContentChange = (sectionIdx: number, row: number, col: number, content: string) => {
    updateCell(sectionIdx, row, col, { content });
  };

  const duplicateSection = (sectionIdx: number) => {
    setSections(prev => {
      const toCopy = prev[sectionIdx];
      const cloned: Section = {
        id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cells: toCopy.cells.map(row => row.map(cell => ({ ...cell, id: `${cell.id}-c${Math.random().toString(36).slice(2,4)}` }))),
      };
      const next = [...prev];
      next.splice(sectionIdx + 1, 0, cloned);
      return next;
    });
  };

  const deleteSection = (sectionIdx: number) => {
    setSections(prev => {
      const next = prev.filter((_, i) => i !== sectionIdx);
      return next.length > 0 ? next : [createDefaultSection()];
    });
  };

  const currentCell = selectedCell ? sections[selectedCell.section].cells[selectedCell.row][selectedCell.col] : null;

  return (
    <div className="space-y-6">
      {/* Toolbar: only when editing the title background (A1 of a section) */}
      {selectedCell && currentCell && selectedCell.row === 0 && selectedCell.col === 0 && (
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <Select
              value={currentCell.backgroundColor}
              onValueChange={(value: string) =>
                updateCell(selectedCell.section, selectedCell.row, selectedCell.col, { backgroundColor: value })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Background color" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {backgroundColors.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border ${color.value === 'transparent' ? 'border-2 border-muted' : color.value}`} />
                      {color.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">Editing title background (A1)</div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((section, sectionIdx) => (
          <div key={section.id} className="border border-border rounded-lg overflow-hidden">
            {/* Section actions */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
              <div className="text-sm text-muted-foreground">Sekce {sectionIdx + 1}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => duplicateSection(sectionIdx)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted/60 transition-colors"
                  aria-label="Duplicate section"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm">Duplicate</span>
                </button>
                <button
                  onClick={() => deleteSection(sectionIdx)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete section"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm">Delete</span>
                </button>
              </div>
            </div>

            {/* Table for this section */}
            <table className="w-full">
              <tbody>
                {/* Row 0: Title spanning across A-D */}
                <tr>
                  <td
                    colSpan={4}
                    className={`border border-border p-4 cursor-pointer ${
                      section.cells[0][0].backgroundColor !== 'transparent' ? section.cells[0][0].backgroundColor : ''
                    } ${selectedCell?.section === sectionIdx && selectedCell?.row === 0 && selectedCell?.col === 0 ? 'ring-2 ring-primary ring-inset' : ''}`}
                    onClick={() => handleCellClick(sectionIdx, 0, 0)}
                  >
                    <input
                      type="text"
                      value={section.cells[0][0].content}
                      onChange={(e) => handleContentChange(sectionIdx, 0, 0, e.target.value)}
                      className="w-full h-full bg-transparent border-none outline-none text-2xl font-bold"
                      placeholder="Title"
                      aria-label={`Plan title for section ${sectionIdx + 1}`}
                    />
                  </td>
                </tr>

                {/* Rows 1-4 */}
                {section.cells.slice(1).map((row, rIdx) => (
                  <tr key={`r-${rIdx}`}>
                    {row.map((cell, colIndex) => (
                      <td
                        key={cell.id}
                        className={`border border-border p-2 min-w-[120px] h-16 cursor-pointer ${
                          selectedCell?.section === sectionIdx && selectedCell?.row === rIdx + 1 && selectedCell?.col === colIndex
                            ? 'ring-2 ring-primary ring-inset'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleCellClick(sectionIdx, rIdx + 1, colIndex)}
                      >
                        {colIndex === 0 ? (
                          <div className="text-sm text-foreground">{weeks[rIdx]}</div>
                        ) : colIndex === 1 ? (
                          <input
                            type="text"
                            value={cell.content}
                            onChange={(e) => handleContentChange(sectionIdx, rIdx + 1, colIndex, e.target.value)}
                            className="w-full h-full bg-transparent border-none outline-none text-sm"
                            placeholder="Write here"
                          />
                        ) : colIndex === 2 ? (
                          <Select
                            value={cell.content}
                            onValueChange={(value) => updateCell(sectionIdx, rIdx + 1, colIndex, { content: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              {contentTypes.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          // colIndex === 3
                          <Select
                            value={cell.content}
                            onValueChange={(value) => updateCell(sectionIdx, rIdx + 1, colIndex, { content: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              {categories.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};
