import React, { useState } from "react";
import toast from "react-hot-toast";

export default function JsonInput({ onVisualize, sampleJson }) {
  const [text, setText] = useState(sampleJson || "");

  function handleVisualize() {
    try {
      const parsed = JSON.parse(text);
      onVisualize(parsed);
    } catch (err) {
      toast.error("Invalid JSON: " + err.message);
    }
  }

  function handleLoadSample() {
    setText(sampleJson || "");
    toast("Sample loaded");
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-muted-foreground">JSON Input</label>
      <textarea
        className="w-full h-40 p-3 border rounded-md bg-surface text-sm text-foreground resize-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste JSON here..."
      />
      <div className="flex gap-2">
        <button onClick={handleVisualize} className="px-3 py-1 rounded bg-gold text-black font-medium text-sm shadow">Visualize</button>
        <button onClick={handleLoadSample} className="px-3 py-1 rounded border text-sm text-muted-foreground">Load sample</button>
        <button onClick={() => { setText(""); toast("Cleared input"); }} className="px-3 py-1 rounded border text-sm text-muted-foreground">Clear</button>
      </div>
    </div>
  );
}
