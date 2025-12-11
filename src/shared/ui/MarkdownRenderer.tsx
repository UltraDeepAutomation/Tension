import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Enterprise-grade Markdown renderer with GFM support
 * Supports: tables, strikethrough, autolinks, task lists
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block rendering
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            
            if (isInline) {
              return (
                <code className="markdown-inline-code" {...props}>
                  {children}
                </code>
              );
            }
            
            return (
              <div className="markdown-code-block">
                {match && (
                  <div className="markdown-code-lang">{match[1]}</div>
                )}
                <pre className="markdown-pre">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // Custom link rendering (open in new tab)
          a: ({ node, children, href, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="markdown-link"
              {...props}
            >
              {children}
            </a>
          ),
          // Custom table rendering
          table: ({ node, children, ...props }) => (
            <div className="markdown-table-wrapper">
              <table className="markdown-table" {...props}>
                {children}
              </table>
            </div>
          ),
          // Custom list rendering
          ul: ({ node, children, ...props }) => (
            <ul className="markdown-list markdown-list--unordered" {...props}>
              {children}
            </ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="markdown-list markdown-list--ordered" {...props}>
              {children}
            </ol>
          ),
          // Custom blockquote
          blockquote: ({ node, children, ...props }) => (
            <blockquote className="markdown-blockquote" {...props}>
              {children}
            </blockquote>
          ),
          // Custom headings (scale down for node context)
          h1: ({ node, children, ...props }) => (
            <h4 className="markdown-heading markdown-h1" {...props}>{children}</h4>
          ),
          h2: ({ node, children, ...props }) => (
            <h5 className="markdown-heading markdown-h2" {...props}>{children}</h5>
          ),
          h3: ({ node, children, ...props }) => (
            <h6 className="markdown-heading markdown-h3" {...props}>{children}</h6>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
