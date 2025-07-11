/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
}) => {
  // Determine if dark theme is active
  const isDarkTheme =
    document.documentElement.getAttribute('data-theme') === 'dark';
  const codeTheme = isDarkTheme ? oneDark : tomorrow;

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;

            return !isInline && match ? (
              <SyntaxHighlighter
                style={codeTheme as any}
                language={match[1]}
                PreTag="div"
                className="code-block"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={isInline ? 'inline-code' : className} {...props}>
                {children}
              </code>
            );
          },
          // Tables with Material Design styling
          table({ children }) {
            return (
              <div className="table-wrapper">
                <table className="markdown-table">{children}</table>
              </div>
            );
          },
          // Links that open in new tab
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="markdown-link"
              >
                {children}
              </a>
            );
          },
          // Headers with Material Design typography
          h1({ children }) {
            return <h1 className="md-typescale-headline-large">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="md-typescale-headline-medium">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="md-typescale-headline-small">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="md-typescale-title-large">{children}</h4>;
          },
          h5({ children }) {
            return <h5 className="md-typescale-title-medium">{children}</h5>;
          },
          h6({ children }) {
            return <h6 className="md-typescale-title-small">{children}</h6>;
          },
          // Blockquotes with Material Design styling
          blockquote({ children }) {
            return (
              <blockquote className="markdown-blockquote">
                {children}
              </blockquote>
            );
          },
          // Lists with proper spacing
          ul({ children }) {
            return <ul className="markdown-list">{children}</ul>;
          },
          ol({ children }) {
            return (
              <ol className="markdown-list markdown-list-ordered">
                {children}
              </ol>
            );
          },
          // Horizontal rule
          hr() {
            return <hr className="markdown-hr" />;
          },
          // Paragraphs
          p({ children }) {
            return <p className="markdown-paragraph">{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
