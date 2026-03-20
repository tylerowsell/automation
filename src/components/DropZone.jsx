import { useState, useRef, useCallback } from "react";

// ─── Drag-and-drop file upload zone ──────────────────────────────────────────
export default function DropZone({ onFiles, accept, label, sublabel, icon }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    onFiles(Array.from(e.dataTransfer.files));
  }, [onFiles]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? "#0088ff" : "#1e3a5f"}`,
        borderRadius: "6px", padding: "28px 20px", textAlign: "center", cursor: "pointer",
        background: dragging ? "#0a1a30" : "#06080f", transition: "all 0.2s",
        boxShadow: dragging ? "0 0 20px #0066cc30" : "none",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        style={{ display: "none" }}
        onChange={e => onFiles(Array.from(e.target.files))}
      />
      <div style={{ fontSize: "26px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "12px", color: dragging ? "#4fc3f7" : "#5090b8", fontFamily: "'IBM Plex Mono'", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "10px", color: "#2a4a6a" }}>{sublabel}</div>
    </div>
  );
}
