import React, { useMemo } from 'react';

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderLatex = (latex, displayMode) => {
  try {
    if (!window.katex) return escapeHtml(latex);
    return window.katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    });
  } catch {
    return escapeHtml(latex);
  }
};

const renderMathText = (text) => {
  const source = String(text || '');
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  let cursor = 0;
  let html = '';
  let match;

  while ((match = pattern.exec(source)) !== null) {
    html += escapeHtml(source.slice(cursor, match.index));
    const token = match[0];
    const displayMode = token.startsWith('$$') || token.startsWith('\\[');
    const latex = token.startsWith('$$')
      ? token.slice(2, -2)
      : token.slice(2, -2);
    html += renderLatex(latex, displayMode);
    cursor = match.index + token.length;
  }

  html += escapeHtml(source.slice(cursor));
  return html.replace(/\n/g, '<br />');
};

const MathText = ({ children, className = '' }) => {
  const html = useMemo(() => renderMathText(children), [children]);

  return (
    <span
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathText;
