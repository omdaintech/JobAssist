import React from 'react';

/**
 * Renders text content that can be either a string or an array of strings
 * Used for displaying LLM feedback that may come as bullets or paragraphs
 * 
 * @param content - String or array of strings to render
 * @param colorClass - Tailwind color class (e.g., 'text-gray-700', 'text-blue-600')
 * @returns React node with properly formatted output
 * 
 * @example
 * ```tsx
 * // String input - renders as paragraph
 * renderTextOrBullets("This is a single paragraph", "text-gray-700")
 * // Output: <p className="text-sm md:text-base text-gray-700 leading-relaxed">...</p>
 * 
 * // Array input - renders as bullet list
 * renderTextOrBullets(["Point 1", "Point 2", "Point 3"], "text-green-700")
 * // Output: <ul><li>• Point 1</li><li>• Point 2</li>...</ul>
 * ```
 * 
 * @responsive
 * - Text: text-sm md:text-base (comfortable mobile/desktop scale)
 * - Spacing: space-y-1 gap-1.5 (consistent bullet spacing)
 * - Line height: leading-relaxed (improved readability)
 */
export const renderTextOrBullets = (
  content: string | string[] | undefined,
  colorClass: string = 'text-gray-700'
): React.ReactNode => {
  if (!content) return null;

  // Render as bullet list if content is an array
  if (Array.isArray(content)) {
    // Extract base color for bullet points (e.g., 'green' from 'text-green-700')
    const bulletColor = colorClass.replace('text-', '').split('-')[0];
    
    return (
      <ul className="space-y-1">
        {content.map((item: string, index: number) => (
          <li key={index} className={`flex items-start gap-1.5 text-sm md:text-base ${colorClass}`}>
            <span className={`text-${bulletColor}-500 mt-0.5`}>•</span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Render as paragraph if content is a string
  return <p className={`text-sm md:text-base ${colorClass} leading-relaxed`}>{content}</p>;
};
