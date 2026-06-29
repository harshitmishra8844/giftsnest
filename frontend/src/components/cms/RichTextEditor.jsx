import { useState, useRef, useEffect } from "react";

export default function RichTextEditor({ value, onChange, placeholder = "Enter text..." }) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const editorRef = useRef(null);
  const [internalValue, setInternalValue] = useState(value || "");

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
      setInternalValue(value || "");
    }
  }, [value]);

  const executeCommand = (command, argument = null) => {
    document.execCommand(command, false, argument);
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setInternalValue(html);
      onChange(html === "<br>" ? "" : html);
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const insertTable = () => {
    const rows = prompt("Enter number of rows:", "2");
    const cols = prompt("Enter number of columns:", "2");
    if (rows && cols) {
      let tableHtml = "<table style='width:100%; border-collapse:collapse; margin:10px 0; border:1px solid #e2e8f0;'><tbody>";
      for (let r = 0; r < parseInt(rows); r++) {
        tableHtml += "<tr>";
        for (let c = 0; c < parseInt(cols); c++) {
          tableHtml += "<td style='border:1px solid #cbd5e1; padding:8px; text-align:left;'>Cell</td>";
        }
        tableHtml += "</tr>";
      }
      tableHtml += "</tbody></table><p></p>";
      executeCommand("insertHTML", tableHtml);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-gold-200/40 bg-white/90 shadow-sm overflow-hidden focus-within:border-gold-500/60 focus-within:ring-2 focus-within:ring-gold-500/10 transition duration-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-gray-50/80 px-4 py-2.5 border-b border-gold-200/20 select-none">
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          title="Bold"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition font-bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          title="Italic"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          title="Underline"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition underline"
        >
          U
        </button>
        <span className="w-px h-5 bg-gray-300/80 mx-1" />
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h1>")}
          title="Heading 1"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition font-bold text-xs"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h2>")}
          title="Heading 2"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition font-bold text-xs"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h3>")}
          title="Heading 3"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition font-bold text-xs"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<p>")}
          title="Paragraph"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs font-semibold"
        >
          P
        </button>
        <span className="w-px h-5 bg-gray-300/80 mx-1" />
        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          title="Bulleted List"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          title="Numbered List"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          1. List
        </button>
        <span className="w-px h-5 bg-gray-300/80 mx-1" />
        <button
          type="button"
          onClick={() => executeCommand("justifyLeft")}
          title="Align Left"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          Align L
        </button>
        <button
          type="button"
          onClick={() => executeCommand("justifyCenter")}
          title="Align Center"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          Align C
        </button>
        <button
          type="button"
          onClick={() => executeCommand("justifyRight")}
          title="Align Right"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          Align R
        </button>
        <span className="w-px h-5 bg-gray-300/80 mx-1" />
        <button
          type="button"
          onClick={insertLink}
          title="Insert Link"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          🔗 Link
        </button>
        <button
          type="button"
          onClick={insertTable}
          title="Insert Table"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          📊 Table
        </button>
        <button
          type="button"
          onClick={() => executeCommand("removeFormat")}
          title="Clear Format"
          className="p-1.5 rounded-lg hover:bg-gold-50 hover:text-gold-600 text-gray-600 transition text-xs"
        >
          🧹 Clear
        </button>
        <span className="w-px h-5 bg-gray-300/80 mx-1" />
        <button
          type="button"
          onClick={() => setIsHtmlMode(!isHtmlMode)}
          className={`p-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${isHtmlMode ? "bg-gold-500 text-white shadow-sm" : "hover:bg-gold-50 hover:text-gold-600 text-gray-600"}`}
        >
          &lt;/&gt; Code
        </button>
      </div>

      {/* Editor Body */}
      {isHtmlMode ? (
        <textarea
          value={internalValue}
          onChange={(e) => {
            const val = e.target.value;
            setInternalValue(val);
            onChange(val);
          }}
          className="w-full min-h-[220px] p-4 text-xs font-mono bg-gray-900 text-gold-300 border-none outline-none resize-y"
          placeholder="Enter raw HTML code here..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onBlur={handleContentChange}
          className="w-full min-h-[220px] max-h-[500px] p-4 text-sm bg-white overflow-y-auto outline-none prose prose-sm max-w-none focus:prose-headings:text-gold-700"
          placeholder={placeholder}
          style={{ wordBreak: "break-word" }}
        />
      )}
    </div>
  );
}
