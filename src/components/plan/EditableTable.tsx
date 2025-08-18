import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Palette, Copy, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PostSlidingSidebar } from '@/components/calendar/PostSlidingSidebar';

interface Cell {
  id: string;
  content: string;
  fontSize: 'small' | 'large';
  backgroundColor: string;
}

interface Section {
  id: string;
  cells: Cell[][]; // 5 rows x 6 cols (A-F)
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
    Array.from({ length: 6 }, (_, colIndex) => {
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
      if (rowIndex === 0 && colIndex > 0 && colIndex < 5) {
        // B1-E1: Header labels (not editable)
        const labels = ['Popis', 'Creativa', 'Product Line', 'Pilíř'] as const;
        return {
          id,
          content: labels[colIndex - 1],
          fontSize: 'small',
          backgroundColor: 'transparent',
        };
      }
      if (rowIndex === 0 && colIndex === 5) {
        // F1: Create New header
        return {
          id,
          content: 'Create New',
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

// Migration function to ensure sections have 6 columns
const migrateSection = (section: Section): Section => {
  if (!section.cells || section.cells.length === 0) {
    return createDefaultSection();
  }
  
  // Check if we need to migrate from 5 to 6 columns
  const needsMigration = section.cells.some(row => row.length < 6);
  
  if (!needsMigration) {
    return section;
  }

  // Migrate each row to have 6 columns
  const migratedCells = section.cells.map((row, rowIndex) => {
    // Ensure we have at least 6 columns
    const newRow = [...row];
    while (newRow.length < 6) {
      const colIndex = newRow.length;
      const id = `${rowIndex}-${colIndex}-${Math.random().toString(36).slice(2, 7)}`;
      
      if (rowIndex === 0 && colIndex === 5) {
        // F1: Create New header
        newRow.push({
          id,
          content: 'Create New',
          fontSize: 'small',
          backgroundColor: 'transparent',
        });
      } else {
        // Regular empty cell
        newRow.push({
          id,
          content: '',
          fontSize: 'small',
          backgroundColor: 'transparent',
        });
      }
    }
    return newRow;
  });

  return { ...section, cells: migratedCells };
};

export const EditableTable = () => {
  const [sections, setSections] = useState<Section[]>([createDefaultSection()]);
  const [selectedCell, setSelectedCell] = useState<{ section: number; row: number; col: number } | null>(null);
  const [productLines, setProductLines] = useState<Array<{name: string, color: string}>>([]);
  const [pillars, setPillars] = useState<Array<{name: string, color: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // PostSlidingSidebar state
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  

  // Load plan data from database
  useEffect(() => {
    const loadPlanData = async () => {
      try {
        setIsLoading(true);
        
        // Wait for authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No authenticated user, skipping data load');
          setIsLoading(false);
          return;
        }

        const { data: planData, error } = await supabase
          .from('plan_sections')
          .select('*')
          .eq('user_id', user.id)
          .order('section_order');

        if (error) {
          console.error('Failed to load plan data:', error);
          return;
        }

        if (planData && planData.length > 0) {
          const loadedSections = planData.map(item => {
            const section = JSON.parse(JSON.stringify(item.section_data)) as Section;
            return migrateSection(section);
          });
          setSections(loadedSections);
        } else {
          // Create default section if no data exists
          setSections([createDefaultSection()]);
        }
      } catch (error) {
        console.error('Failed to load plan data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlanData();
  }, []);

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

  // Auto-save sections to database when they change
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load
    
    const savePlanData = async () => {
      try {
        setIsSaving(true);
        
        // Delete existing sections for the current user
        await supabase
          .from('plan_sections')
          .delete()
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No authenticated user found');
          return;
        }

        // Insert new sections with correct user_id
        const sectionsToSave = sections.map((section, index) => ({
          section_data: JSON.parse(JSON.stringify(section)),
          section_order: index,
          user_id: user.id
        }));

        const { error } = await supabase
          .from('plan_sections')
          .insert(sectionsToSave);

        if (error) {
          console.error('Failed to save plan data:', error);
        }
      } catch (error) {
        console.error('Failed to save plan data:', error);
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(savePlanData, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [sections, isLoading]);

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

  const handleNewPostClick = () => {
    setSelectedDate(new Date());
    setShowSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setSelectedDate(null);
  };

  const handleSidebarSave = () => {
    // Refresh data or handle save
    window.location.reload();
  };


  const currentCell = selectedCell ? sections[selectedCell.section].cells[selectedCell.row][selectedCell.col] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plan data...</p>
        </div>
      </div>
    );
  }

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
                <col style={{ width: '18%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <tbody>
                {/* Row 0: Header with 6 columns (A1 editable title, B1-E1 labels, F1 Create New) */}
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
                  {/* F1 - Create New header */}
                  <td
                    className="border border-border p-4 cursor-pointer hover:bg-muted/50"
                  >
                    <div className="text-sm text-muted-foreground font-medium text-center">
                      {section.cells[0] && section.cells[0][5] ? section.cells[0][5].content : 'Create New'}
                    </div>
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
                            <SelectTrigger 
                              className="w-full border-none shadow-none focus:ring-0"
                              style={{
                                backgroundColor: 
                                  cell.content === 'Carousel' ? 'hsl(var(--accent))' : 
                                  cell.content === 'Video' ? 'hsl(var(--secondary))' : 
                                  cell.content === 'Image' ? 'hsl(var(--primary))' : 
                                  'hsl(var(--muted))',
                                color: 
                                  cell.content === 'Carousel' ? 'hsl(var(--accent-foreground))' : 
                                  cell.content === 'Video' ? 'hsl(var(--secondary-foreground))' : 
                                  cell.content === 'Image' ? 'hsl(var(--primary-foreground))' : 
                                  'hsl(var(--foreground))',
                                fontWeight: '500'
                              }}
                            >
                              <SelectValue placeholder="Creativa" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              {contentTypes.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  <div 
                                    className="px-3 py-2 rounded text-sm w-full font-medium"
                                    style={{
                                      backgroundColor: 
                                        opt === 'Carousel' ? 'hsl(var(--accent))' : 
                                        opt === 'Video' ? 'hsl(var(--secondary))' : 
                                        opt === 'Image' ? 'hsl(var(--primary))' : 
                                        'hsl(var(--muted))',
                                      color: 
                                        opt === 'Carousel' ? 'hsl(var(--accent-foreground))' : 
                                        opt === 'Video' ? 'hsl(var(--secondary-foreground))' : 
                                        opt === 'Image' ? 'hsl(var(--primary-foreground))' : 
                                        'hsl(var(--foreground))'
                                    }}
                                  >
                                    {opt}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : colIndex === 3 ? (
                          // Product Line select with enhanced colors
                          <Select
                            value={cell.content}
                            onValueChange={(value) => updateCell(sectionIdx, rIdx + 1, colIndex, { content: value })}
                          >
                            <SelectTrigger 
                              className="w-full border-none shadow-none focus:ring-0"
                              style={{
                                backgroundColor: productLines.find(pl => pl.name === cell.content)?.color ? 
                                  `${productLines.find(pl => pl.name === cell.content)?.color}30` : 
                                  'hsl(var(--muted))',
                                color: productLines.find(pl => pl.name === cell.content)?.color || 'hsl(var(--foreground))',
                                fontWeight: '500'
                              }}
                            >
                              <SelectValue placeholder="Product Line" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              {productLines.map((pl) => (
                                <SelectItem key={pl.name} value={pl.name}>
                                  <div 
                                    className="px-3 py-2 rounded text-sm w-full font-medium"
                                    style={{
                                      backgroundColor: `${pl.color}30`,
                                      color: pl.color
                                    }}
                                  >
                                    {pl.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : colIndex === 4 ? (
                          // Pillar select with full background colors
                          <Select
                            value={cell.content || ""}
                            onValueChange={(value) => handleContentChange(sectionIdx, rIdx + 1, colIndex, value)}
                          >
                            <SelectTrigger 
                              className="border-none shadow-none focus:ring-0 h-full w-full"
                              style={{
                                backgroundColor: pillars.find(p => p.name === cell.content)?.color ? 
                                  `${pillars.find(p => p.name === cell.content)?.color}30` : 
                                  'hsl(var(--muted))',
                                color: pillars.find(p => p.name === cell.content)?.color || 'hsl(var(--foreground))',
                                fontWeight: '500'
                              }}
                            >
                              <SelectValue placeholder="Pilíř" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              {pillars.map(pillar => (
                                <SelectItem key={pillar.name} value={pillar.name}>
                                  <div 
                                    className="px-3 py-2 rounded text-sm w-full font-medium"
                                    style={{
                                      backgroundColor: `${pillar.color}30`,
                                      color: pillar.color
                                    }}
                                  >
                                    {pillar.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : colIndex === 5 ? (
                          <div className="flex justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleNewPostClick}
                              className="p-2"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      
      {/* PostSlidingSidebar */}
      <PostSlidingSidebar
        isOpen={showSidebar}
        onClose={handleCloseSidebar}
        selectedDate={selectedDate}
        onSave={handleSidebarSave}
      />
    </div>
  );
};
