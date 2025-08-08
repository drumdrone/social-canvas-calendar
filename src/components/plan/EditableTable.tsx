import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Copy, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Cell {
  id: string;
  content: string;
  fontSize: 'small' | 'large';
  backgroundColor: string;
}

interface Section {
  id: string;
  cells: Cell[][]; // 5 rows x 5 cols (A-E)
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
    Array.from({ length: 5 }, (_, colIndex) => {
      const id = `${rowIndex}-${colIndex}-${Math.random().toString(36).slice(2, 7)}`;
      if (rowIndex === 0 && colIndex === 0) {
        // A1: Title cell (H1-like), editable with background color
        return {
          id,
          content: '',
          fontSize: 'large',
          backgroundColor: 'transparent',
        };
      }
      if (rowIndex === 0 && colIndex > 0) {
        // B1-E1: Header labels (not editable)
        const labels = ['Popis', 'Creativa', 'Product Line', 'Pilíř'] as const;
        return {
          id,
          content: labels[colIndex - 1],
          fontSize: 'small',
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
  const [productLines, setProductLines] = useState<Array<{name: string, color: string}>>([]);
  const [pillars, setPillars] = useState<Array<{name: string, color: string}>>([]);

  // Fetch product lines and pillars from database
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [productLinesResult, pillarsResult] = await Promise.all([
          supabase.from('product_lines').select('name, color').eq('is_active', true).order('name'),
          supabase.from('pillars').select('name, color').eq('is_active', true).order('name'),
        ]);
        setProductLines(productLinesResult.data || []);
        setPillars(pillarsResult.data || []);
      } catch (error) {
        console.error('Failed to load options:', error);
      }
    };
    fetchOptions();
  }, []);

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
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <tbody>
                {/* Row 0: Header with 5 columns (A1 editable title, B1-E1 labels) */}
                <tr>
                  {/* A1 - Editable Title */}
                  <td
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
                  {/* B1 - Popis */}
                  <td
                    className={`border border-border p-4 cursor-pointer ${selectedCell?.section === sectionIdx && selectedCell?.row === 0 && selectedCell?.col === 1 ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/50'}`}
                    onClick={() => handleCellClick(sectionIdx, 0, 1)}
                  >
                    <div className="text-sm text-muted-foreground font-medium">{section.cells[0][1].content}</div>
                  </td>
                  {/* C1 - Creativa */}
                  <td
                    className={`border border-border p-4 cursor-pointer ${selectedCell?.section === sectionIdx && selectedCell?.row === 0 && selectedCell?.col === 2 ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/50'}`}
                    onClick={() => handleCellClick(sectionIdx, 0, 2)}
                  >
                    <div className="text-sm text-muted-foreground font-medium">{section.cells[0][2].content}</div>
                  </td>
                  {/* D1 - Product Line */}
                  <td
                    className={`border border-border p-4 cursor-pointer ${selectedCell?.section === sectionIdx && selectedCell?.row === 0 && selectedCell?.col === 3 ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/50'}`}
                    onClick={() => handleCellClick(sectionIdx, 0, 3)}
                  >
                    <div className="text-sm text-muted-foreground font-medium">{section.cells[0][3].content}</div>
                  </td>
                  {/* E1 - Pilíř */}
                  <td
                    className={`border border-border p-4 cursor-pointer ${selectedCell?.section === sectionIdx && selectedCell?.row === 0 && selectedCell?.col === 4 ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/50'}`}
                    onClick={() => handleCellClick(sectionIdx, 0, 4)}
                  >
                    <div className="text-sm text-muted-foreground font-medium">{section.cells[0][4].content}</div>
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
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-border"
                              style={{
                                backgroundColor: `hsl(var(${cell.content === 'Carousel' ? '--accent' : cell.content === 'Video' ? '--secondary' : '--primary'}))`,
                              }}
                              aria-hidden
                            />
                            <Select
                              value={cell.content}
                              onValueChange={(value) => updateCell(sectionIdx, rIdx + 1, colIndex, { content: value })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                {contentTypes.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-border"
                                        style={{
                                          backgroundColor: `hsl(var(${opt === 'Carousel' ? '--accent' : opt === 'Video' ? '--secondary' : '--primary'}))`,
                                        }}
                                        aria-hidden
                                      />
                                      {opt}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : colIndex === 3 ? (
                          // Product Line select
                          <div className="flex items-center gap-2">
                            {productLines.find(pl => pl.name === cell.content) && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-border"
                                style={{
                                  backgroundColor: productLines.find(pl => pl.name === cell.content)?.color || '#3B82F6',
                                }}
                                aria-hidden
                              />
                            )}
                            <Select
                              value={cell.content}
                              onValueChange={(value) => updateCell(sectionIdx, rIdx + 1, colIndex, { content: value })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select product line" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                {productLines.map((pl) => (
                                  <SelectItem key={pl.name} value={pl.name}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-border"
                                        style={{ backgroundColor: pl.color }}
                                        aria-hidden
                                      />
                                      {pl.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          // colIndex === 4 - Pillars
                          <div className="flex items-center gap-2">
                            {pillars.find(p => p.name === cell.content) && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-border"
                                style={{
                                  backgroundColor: pillars.find(p => p.name === cell.content)?.color || '#3B82F6',
                                }}
                                aria-hidden
                              />
                            )}
                            <Select
                              value={cell.content}
                              onValueChange={(value) => updateCell(sectionIdx, rIdx + 1, colIndex, { content: value })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select pillar" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                {pillars.map((pillar) => (
                                  <SelectItem key={pillar.name} value={pillar.name}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-border"
                                        style={{ backgroundColor: pillar.color }}
                                        aria-hidden
                                      />
                                      {pillar.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
