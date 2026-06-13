import React, { useEffect, useRef, useState } from 'react';

const MathEditor = ({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  required = false,
}) => {
  const mathFieldRef = useRef(null);
  const [latex, setLatex] = useState('');

  useEffect(() => {
    const mathField = mathFieldRef.current;
    if (!mathField) return undefined;

    mathField.value = latex;
    mathField.smartFence = true;
    mathField.virtualKeyboardMode = 'manual';

    const handleInput = () => setLatex(mathField.value);
    mathField.addEventListener('input', handleInput);

    return () => mathField.removeEventListener('input', handleInput);
  }, [latex]);

  const insertLatex = (displayMode = false) => {
    const trimmedLatex = latex.trim();
    if (!trimmedLatex) return;

    const wrappedLatex = displayMode
      ? `\\[${trimmedLatex}\\]`
      : `\\(${trimmedLatex}\\)`;
    const separator = value && !value.endsWith(' ') && !value.endsWith('\n') ? ' ' : '';
    onChange(`${value || ''}${separator}${wrappedLatex}`);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        required={required}
      />
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <math-field
          ref={mathFieldRef}
          class="mathlive-field"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => insertLatex(false)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Insert inline equation
          </button>
          <button
            type="button"
            onClick={() => insertLatex(true)}
            className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
          >
            Insert display equation
          </button>
        </div>
      </div>
    </div>
  );
};

export default MathEditor;
