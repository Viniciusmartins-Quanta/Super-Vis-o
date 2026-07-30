import React, { useRef, useEffect } from "react";
import { Bold, Italic } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  // Sync value from prop to editor innerHTML ONLY if it actually changed
  useEffect(() => {
    if (editorRef.current) {
      if (!isMounted.current) {
        editorRef.current.innerHTML = value || "";
        isMounted.current = true;
      } else if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      let html = editorRef.current.innerHTML;
      // If editor was emptied, reset to blank
      if (html === "<br>" || html === "<p><br></p>" || html.trim() === "") {
        html = "";
      }
      onChange(html);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Support standard bold/italic keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        document.execCommand("bold", false);
        handleInput();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        document.execCommand("italic", false);
        handleInput();
      }
    }
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    // 1. Impede o navegador de colar o texto com a formatação original
    e.preventDefault();
    
    // 2. Pega apenas o texto puro da área de transferência (ignorando HTML, fontes e cores)
    const text = e.clipboardData.getData("text/plain");
    
    // 3. Insere o texto limpo na posição exata onde o cursor está piscando
    document.execCommand("insertText", false, text);
    
    // 4. Atualiza o estado para salvar
    handleInput();
  };

  const executeCommand = (command: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand(command, false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition ${className || ""}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 bg-slate-100/75 border-b border-slate-200/80 px-2.5 py-1.5 select-none">
        <button
          type="button"
          onMouseDown={(e) => executeCommand("bold", e)}
          className="p-1 text-slate-700 hover:bg-slate-200/80 rounded transition cursor-pointer"
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => executeCommand("italic", e)}
          className="p-1 text-slate-700 hover:bg-slate-200/80 rounded transition cursor-pointer"
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        {...({ placeholder } as any)}
        className="w-full min-h-[120px] max-h-[250px] overflow-y-auto px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:outline-none focus:ring-0 empty:before:content-[attr(placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );
}
