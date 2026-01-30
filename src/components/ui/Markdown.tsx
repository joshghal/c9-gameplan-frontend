'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={`prose prose-sm prose-invert max-w-none prose-p:text-gray-300 prose-p:leading-relaxed prose-p:my-1 prose-headings:text-white prose-strong:text-white prose-li:text-gray-300 prose-a:text-purple-400 prose-code:text-purple-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
