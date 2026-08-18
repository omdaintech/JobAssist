import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer for FAQ pages
 * Handles: headers, lists, tables, code blocks, links, bold/italic
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className }) => {
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let currentTable: string[][] | null = null;
    let currentCodeBlock: { language: string; lines: string[] } | null = null;
    let key = 0;

    const flushList = () => {
      if (currentList) {
        elements.push(
          <ul key={`list-${key++}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
            {currentList.items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
            ))}
          </ul>
        );
        currentList = null;
      }
    };

    const flushTable = () => {
      if (currentTable && currentTable.length > 1) {
        elements.push(
          <div key={`table-${key++}`} className="overflow-x-auto mb-4">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  {currentTable[0].map((cell, i) => (
                    <th key={i} className="border border-gray-300 px-4 py-2 text-left font-semibold">
                      {parseInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTable.slice(2).map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-gray-300 px-4 py-2">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = null;
      }
    };

    const flushCodeBlock = () => {
      if (currentCodeBlock) {
        elements.push(
          <pre key={`code-${key++}`} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
            <code>{currentCodeBlock.lines.join('\n')}</code>
          </pre>
        );
        currentCodeBlock = null;
      }
    };

    const parseInline = (text: string): string => {
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-eu-blue hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
    };

    for (const line of lines) {
      // Code blocks
      if (line.startsWith('```')) {
        if (currentCodeBlock) {
          flushCodeBlock();
        } else {
          flushList();
          flushTable();
          const language = line.slice(3).trim();
          currentCodeBlock = { language, lines: [] };
        }
        continue;
      }

      if (currentCodeBlock) {
        currentCodeBlock.lines.push(line);
        continue;
      }

      // Empty lines
      if (line.trim() === '') {
        flushList();
        flushTable();
        continue;
      }

      // Headers
      if (line.startsWith('#')) {
        flushList();
        flushTable();
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const classes = {
          1: 'text-3xl font-bold mb-4 mt-8',
          2: 'text-2xl font-bold mb-3 mt-6',
          3: 'text-xl font-semibold mb-2 mt-4',
          4: 'text-lg font-semibold mb-2 mt-3',
          5: 'text-base font-semibold mb-2 mt-2',
          6: 'text-sm font-semibold mb-2 mt-2'
        }[level] || 'text-base font-semibold mb-2';
        
        elements.push(
          React.createElement(
            `h${level}`,
            { key: `h${level}-${key++}`, className: classes },
            parseInline(text)
          )
        );
        continue;
      }

      // Horizontal rule
      if (line.match(/^---+$/)) {
        flushList();
        flushTable();
        elements.push(<hr key={`hr-${key++}`} className="border-gray-300 my-6" />);
        continue;
      }

      // Table rows
      if (line.includes('|')) {
        flushList();
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (!currentTable) {
          currentTable = [];
        }
        currentTable.push(cells);
        continue;
      } else {
        flushTable();
      }

      // List items
      if (line.match(/^[\-\*]\s/) || line.match(/^\d+\.\s/)) {
        const isOrdered = line.match(/^\d+\.\s/) !== null;
        const text = line.replace(/^[\-\*\d]+\.\s*/, '');
        
        if (!currentList) {
          currentList = { type: isOrdered ? 'ol' : 'ul', items: [] };
        }
        currentList.items.push(text);
        continue;
      } else {
        flushList();
      }

      // Regular paragraphs
      if (line.trim()) {
        flushList();
        flushTable();
        elements.push(
          <p key={`p-${key++}`} className="mb-4 text-gray-700" dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
        );
      }
    }

    // Flush any remaining
    flushList();
    flushTable();
    flushCodeBlock();

    return elements;
  };

  return (
    <div className={cn('markdown-content prose max-w-none', className)}>
      {parseMarkdown(content)}
    </div>
  );
};




