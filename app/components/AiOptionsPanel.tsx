import { Zap } from "lucide-react";

const WRITING_STYLES = ["Formal", "Technical", "Casual"];
const STRUCTURES = ["Brief Summary", "Step-by-Step", "Acceptance Criteria"];
const INTENT_FILTERS = ["Goal-Oriented", "Problem-Oriented", "Collaboration-Oriented"];

interface AiOptionsPanelProps {
  writingStyle: string;
  onWritingStyleChange: (v: string) => void;
  structure: string;
  onStructureChange: (v: string) => void;
  intentFilter: string;
  onIntentFilterChange: (v: string) => void;
  onGenerate: () => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  showDescriptionEditor: boolean;
  radioNamePrefix: string;
  size?: "sm" | "md";
}

export function AiOptionsPanel({
  writingStyle,
  onWritingStyleChange,
  structure,
  onStructureChange,
  intentFilter,
  onIntentFilterChange,
  onGenerate,
  description,
  onDescriptionChange,
  showDescriptionEditor,
  radioNamePrefix,
  size = "md",
}: AiOptionsPanelProps) {
  const sm = size === "sm";

  const containerCls = sm
    ? "bg-slate-600 border border-slate-500 rounded-md p-3 space-y-3"
    : "bg-slate-700 border border-slate-600 rounded-md p-4 space-y-4";
  const hintCls = sm
    ? "flex items-center gap-2 text-emerald-400 text-xs"
    : "flex items-center gap-2 text-emerald-400 text-sm mb-2";
  const iconCls = sm ? "w-3 h-3" : "w-4 h-4";
  const labelCls = sm
    ? "block text-xs font-medium text-slate-300 mb-1.5"
    : "block text-sm font-medium text-slate-300 mb-2";
  const groupCls = sm ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2";
  const chipBase = sm
    ? "flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors"
    : "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors";
  const chipIdle = sm
    ? "bg-slate-500 hover:bg-slate-400 text-slate-200"
    : "bg-slate-600 hover:bg-slate-500 text-slate-200";
  const chipActive = "bg-emerald-700 text-emerald-100";
  const chipText = sm ? "text-xs" : "text-sm";
  const buttonCls = sm
    ? "w-full mt-2 px-3 py-1.5 rounded text-xs font-medium text-slate-100 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    : "w-full mt-2 px-4 py-2 rounded-md text-sm font-medium text-slate-100 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2";
  const editorWrapCls = sm ? "mt-2" : "mt-3";
  const editorLabelCls = sm
    ? "block text-xs font-medium text-slate-300 mb-1"
    : "block text-sm font-medium text-slate-300 mb-1";
  const editorTextareaCls = sm
    ? "w-full bg-slate-500 border border-slate-400 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
    : "w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none";

  const renderGroup = (
    label: string,
    name: string,
    options: string[],
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className={groupCls}>
        {options.map((opt) => (
          <label
            key={opt}
            className={`${chipBase} ${value === opt ? chipActive : chipIdle}`}
          >
            <input
              type="radio"
              name={`${radioNamePrefix}-${name}`}
              value={opt}
              checked={value === opt}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <span className={chipText}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className={containerCls}>
      <div className={hintCls}>
        <Zap className={iconCls} />
        AI will generate the description based on your preferences
      </div>

      {renderGroup("Writing Style", "writingStyle", WRITING_STYLES, writingStyle, onWritingStyleChange)}
      {renderGroup("Structure", "structure", STRUCTURES, structure, onStructureChange)}
      {renderGroup("Intent Filter", "intentFilter", INTENT_FILTERS, intentFilter, onIntentFilterChange)}

      <button
        type="button"
        onClick={onGenerate}
        disabled={!writingStyle || !structure || !intentFilter}
        className={buttonCls}
      >
        <Zap className={iconCls} />
        Generate Description
      </button>

      {showDescriptionEditor && (
        <div className={editorWrapCls}>
          <label className={editorLabelCls}>
            {sm ? "Description (editable)" : "Generated Description (editable)"}
          </label>
          <textarea
            rows={sm ? 3 : 4}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className={editorTextareaCls}
          />
        </div>
      )}
    </div>
  );
}

// The size difference between the card and the modal caused some layout issues for the cards on the task list 
// so I wanted to make it bigger but I don't want to make duplicates of the same component so I just extracted it
