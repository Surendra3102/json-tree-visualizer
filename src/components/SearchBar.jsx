import React, { useState } from "react";

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState("");
  return (
    <div className="flex gap-2 items-center">
      <input
        className="w-full px-3 py-2 border rounded text-sm bg-surface text-foreground"
        placeholder='Search JSON path e.g. $.user.address.city'
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSearch(q); }}
      />
      <button onClick={() => onSearch(q)} className="px-3 py-2 rounded bg-gold text-black text-sm font-medium">Search</button>
    </div>
  );
}
