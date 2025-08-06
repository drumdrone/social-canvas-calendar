import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Type } from 'lucide-react';

interface Cell {
  id: string;
  content: string;
  fontSize: 'small' | 'large';
  backgroundColor: string;
}

const backgroundColors = [
  { name: 'Default', value: 'transparent' },
  { name: 'Light Blue', value: 'bg-blue-50' },
  { name: 'Light Green', value: 'bg-green-50' },
  { name: 'Light Yellow', value: 'bg-yellow-50' },
  { name: 'Light Red', value: 'bg-red-50' },
  { name: 'Light Purple', value: 'bg-purple-50' },
];

export const EditableTable = () => {
  const [cells, setCells] = useState<Cell[][]>(() => {
    // Initialize 5x5 grid
    return Array.from({ length: 5 }, (_, rowIndex) =>
      Array.from({ length: 5 }, (_, colIndex) => ({
        id: `${rowIndex}-${colIndex}`,
        content: '',
        fontSize: 'small' as const,
        backgroundColor: 'transparent',
      }))
    );
  });

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  const updateCell = (row: number, col: number, updates: Partial<Cell>) => {
    setCells(prev => prev.map((rowCells, r) =>
      r === row ? rowCells.map((cell, c) =>
        c === col ? { ...cell, ...updates } : cell
      ) : rowCells
    ));
  };

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  const handleContentChange = (row: number, col: number, content: string) => {
    updateCell(row, col, { content });
  };

  const currentCell = selectedCell ? cells[selectedCell.row][selectedCell.col] : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {selectedCell && currentCell && (
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <Select 
              value={currentCell.fontSize} 
              onValueChange={(value: 'small' | 'large') => 
                updateCell(selectedCell.row, selectedCell.col, { fontSize: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <Select 
              value={currentCell.backgroundColor} 
              onValueChange={(value: string) => 
                updateCell(selectedCell.row, selectedCell.col, { backgroundColor: value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

          <div className="text-sm text-muted-foreground">
            Selected: Row {selectedCell.row + 1}, Column {selectedCell.col + 1}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody>
            {cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td 
                    key={cell.id}
                    className={`
                      border border-border p-2 min-w-[120px] h-16 cursor-pointer
                      ${cell.backgroundColor !== 'transparent' ? cell.backgroundColor : ''}
                      ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex 
                        ? 'ring-2 ring-primary ring-inset' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    <input
                      type="text"
                      value={cell.content}
                      onChange={(e) => handleContentChange(rowIndex, colIndex, e.target.value)}
                      className={`
                        w-full h-full bg-transparent border-none outline-none resize-none
                        ${cell.fontSize === 'large' ? 'text-lg font-medium' : 'text-sm'}
                      `}
                      placeholder="Click to edit"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};