import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { renderToStaticMarkup } from 'react-dom/server';
import './MarkdownRenderer.css';

const markdownComponents = {
  table: ({ node, ...props }: any) => <table className="ai-table" {...props} />,
  th: ({ node, ...props }: any) => <th {...props} />,
  td: ({ node, ...props }: any) => <td {...props} />,
  a: ({ node, ...props }: any) => <a {...props} target="_blank" rel="noreferrer" />,
};

const INLINE_STYLE = `
<style>
  .markdown-container {
    font-family: 'Times New Roman', Times, serif;
    font-size: 16px;
    line-height: 1.6;
    color: #111111;
  }
  .markdown-container h1,
  .markdown-container h2,
  .markdown-container h3,
  .markdown-container h4,
  .markdown-container h5,
  .markdown-container h6 {
    font-family: 'Times New Roman', Times, serif;
    font-weight: 700;
    margin: 1.5em 0 0.75em;
    line-height: 1.3;
  }
  .markdown-container h1 { font-size: 32px; }
  .markdown-container h2 { font-size: 28px; }
  .markdown-container h3 { font-size: 24px; }
  .markdown-container h4 { font-size: 20px; }
  .markdown-container h5 { font-size: 18px; }
  .markdown-container h6 { font-size: 16px; }
  .markdown-container p { margin: 0.75em 0; }
  .markdown-container ul,
  .markdown-container ol { margin: 0.75em 0 0.75em 1.5em; }
  .markdown-container table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
    font-size: 15px;
  }
  .markdown-container table th,
  .markdown-container table td {
    border: 1px solid #444;
    padding: 0.6em 0.75em;
    text-align: left;
  }
  .markdown-container table thead th {
    background-color: #f1f1f1;
    font-weight: 700;
  }
  .markdown-container a {
    color: #0a58ca;
    text-decoration: underline;
  }
  .markdown-container strong { font-weight: 700; }
  .markdown-container em { font-style: italic; }
</style>
`.trim();

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <div className={`markdown-container ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

export const renderMarkdownToHtml = (content: string): string => {
  if (!content || !content.trim()) {
    return '';
  }

  const rendered = renderToStaticMarkup(
    <div className="markdown-container">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
        {content}
      </ReactMarkdown>
    </div>
  );

  return `${INLINE_STYLE}${rendered}`;
};
