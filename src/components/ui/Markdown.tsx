'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownProps {
  children: string;
  className?: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold uppercase tracking-wider mt-3 mb-1.5" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-2.5 mb-1" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed my-1.5" style={{ color: 'var(--text-secondary)' }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--c9-cyan)', fontStyle: 'normal' }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 ml-1 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 ml-1 space-y-1.5 list-none counter-reset-item">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    const isOrdered = (props as { node?: { parentNode?: { tagName?: string } } }).node?.parentNode?.tagName === 'ol';
    return (
      <li className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--c9-cyan)' }}>
          {isOrdered ? '▸' : '•'}
        </span>
        <span>{children}</span>
      </li>
    );
  },
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre className="my-2 p-2.5 text-xs overflow-x-auto" style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-default)',
          clipPath: 'var(--clip-corner-sm)',
          color: 'var(--c9-cyan)',
        }}>
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="px-1 py-0.5 text-xs" style={{
        background: 'rgba(0,174,239,0.1)',
        color: 'var(--c9-cyan)',
        borderRadius: '2px',
      }}>{children}</code>
    );
  },
  hr: () => (
    <hr className="my-3 border-0 h-px" style={{ background: 'var(--border-default)' }} />
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 pl-3 border-l-2" style={{ borderColor: 'var(--c9-cyan)', color: 'var(--text-tertiary)' }}>
      {children}
    </blockquote>
  ),
};

export function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={`max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
