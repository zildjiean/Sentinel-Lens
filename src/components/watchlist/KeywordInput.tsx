"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface KeywordEntry {
  keyword: string;
  match_mode: string;
}

interface KeywordInputProps {
  value: KeywordEntry[];
  onChange: (keywords: KeywordEntry[]) => void;
}

export function KeywordInput({ value, onChange }: KeywordInputProps) {
  const [inputValue, setInputValue] = useState("");

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newKeyword: KeywordEntry = {
        keyword: inputValue.trim(),
        match_mode: "contains",
      };
      onChange([...value, newKeyword]);
      setInputValue("");
    }
  }

  function removeKeyword(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateMatchMode(index: number, match_mode: string) {
    onChange(value.map((kw, i) => (i === index ? { ...kw, match_mode } : kw)));
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type keyword and press Enter..."
        className="w-full bg-surface-container border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 px-4 py-2.5 text-sm font-body transition-colors duration-200"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((kw, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 bg-primary/15 border border-primary/30 rounded-lg px-2 py-1"
            >
              <span className="text-xs font-medium text-primary font-body">{kw.keyword}</span>
              <select
                value={kw.match_mode}
                onChange={(e) => updateMatchMode(index, e.target.value)}
                className="text-[10px] bg-transparent text-primary border-none outline-none cursor-pointer font-body"
              >
                <option value="contains">contains</option>
                <option value="exact">exact</option>
                <option value="regex">regex</option>
              </select>
              <button
                type="button"
                onClick={() => removeKeyword(index)}
                className="text-primary/60 hover:text-primary transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
