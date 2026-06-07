import React from 'react';
import { codeTemplates } from '../algorithms/codeTemplates';
import { CodeLanguage, CodeLine, DijkstraStep } from '../types';
import { Code, Terminal } from 'lucide-react';

interface CodeViewerProps {
  language: CodeLanguage;
  setLanguage: (lang: CodeLanguage) => void;
  activeStep: DijkstraStep | null;
}

export default function CodeViewer({
  language,
  setLanguage,
  activeStep
}: CodeViewerProps) {
  const currentTemplate = codeTemplates[language];
  const activeLineKey = activeStep ? activeStep.codeLineKey : '';

  // Simple clean tokenizer for syntax coloring
  const formatSyntaxLine = (text: string) => {
    // Comment match (starts with // or #)
    if (text.trim().startsWith('//') || text.trim().startsWith('#')) {
      return <span className="text-emerald-500 font-normal italic">{text}</span>;
    }

    const keywords = [
      'function', 'void', 'def', 'while', 'for', 'each', 'if', 'else', 'return',
      'break', 'continue', 'const', 'let', 'var', 'and', 'not', 'in', 'float'
    ];

    const types = ['vector', 'int', 'pair', 'pair<int, int>', 'priority_queue', 'false', 'true', 'INFINITY', 'INF', 'NULL'];

    // Split text into tokens by spaces/delimiters
    const words = text.split(/(\s+|\(|\)|\{|\}|\[|\]|:|,|==|===|\+|<|=|;)/);

    return words.map((word, i) => {
      const cleanWord = word.trim();
      if (keywords.includes(cleanWord)) {
        return <span key={i} className="text-pink-500 font-semibold">{word}</span>;
      }
      if (types.includes(cleanWord)) {
        return <span key={i} className="text-cyan-400 font-medium">{word}</span>;
      }
      
      // Numeric values
      if (/^\d+$/.test(cleanWord)) {
        return <span key={i} className="text-amber-400 font-mono">{word}</span>;
      }
      
      // Strings or functions
      if (cleanWord.endsWith(')')) {
        return <span key={i} className="text-blue-300">{word}</span>;
      }

      return <span key={i} className="text-slate-100">{word}</span>;
    });
  };

  return (
    <div id="code-viewer-panel" className="bg-[#0d0d10] border border-slate-800/80 rounded-2xl p-4 flex flex-col h-full shadow-2xl">
      {/* Header & Tabs */}
      <div id="code-viewer-header" className="flex items-center justify-between flex-wrap gap-2 mb-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="text-pink-400 w-4 h-4" />
          <span className="text-xs font-bold font-mono text-slate-100 tracking-wider uppercase">Trình Theo Dõi Code</span>
        </div>
        
        {/* Language Switcher Tabs */}
        <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          {(Object.keys(codeTemplates) as CodeLanguage[]).map((lang) => {
            const label = lang === 'pseudo-c' ? 'Tựa C' : lang === 'cpp' ? 'C++' : lang === 'python' ? 'Python' : 'JS';
            return (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 text-[10px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
                  language === lang
                    ? 'bg-slate-800 text-pink-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Code Text Window */}
      <div className="flex-1 h-0 overflow-auto rounded-xl bg-slate-950/40 p-3 font-mono border border-slate-900/80 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800/80">
        <div className="min-w-[500px] w-full">
          {currentTemplate.lines.map((line, idx) => {
            const isHighlighted = line.key === activeLineKey;
            
            return (
              <div
                key={`${line.key}-${idx}`}
                className={`group flex items-start transition-all duration-150 py-0.5 px-2.5 rounded-md ${
                  isHighlighted 
                    ? 'bg-amber-500/15 text-white font-bold border-l-4 border-amber-500 -ml-1.5' 
                    : 'border-l-4 border-transparent text-slate-300 hover:bg-slate-900/15'
                }`}
              >
                {/* Line number - perfectly aligned fixed-width */}
                <span className={`w-8 text-right select-none shrink-0 font-mono text-[10px] leading-relaxed pr-2 border-r border-slate-800/40 ${
                  isHighlighted ? 'text-amber-400 font-bold border-amber-500/40' : 'text-slate-500/80'
                }`}>
                  {idx + 1}
                </span>

                {/* Animated active tracker cursor column */}
                <span className="w-5 shrink-0 flex items-center justify-center pl-1 pt-1.5">
                  {isHighlighted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </span>

                {/* Indentation is already preserved inside line.text string, no extra padding needed */}
                <pre className="flex-1 whitespace-pre m-0 p-0 text-slate-100 font-mono text-[11px] sm:text-[11.5px] leading-relaxed overflow-x-auto select-text scrollbar-none">
                  {formatSyntaxLine(line.text)}
                </pre>
              </div>
            );
          })}
        </div>
      </div>

      {/* active state key and explanation footer */}
      {activeStep && (
        <div id="code-explanation-footer" className="mt-3 bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-300 font-mono tracking-wide leading-relaxed">
          <span className="text-amber-400 font-bold block mb-1">▶ Step {activeStep.id + 1}: KEY [`{activeStep.codeLineKey}`]</span>
          <p>{activeStep.explanation}</p>
        </div>
      )}
    </div>
  );
}
