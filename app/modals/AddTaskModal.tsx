import { useState } from "react";
import { X, Zap } from "lucide-react";
import type { Task } from "~/routes/home";
import { generateTaskDescription } from "~/lib/gemini";
import { AiOptionsPanel } from "~/components/AiOptionsPanel";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
}

export function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [aiAssisted, setAiAssisted] = useState(false);
  const [title, setTitle] = useState("");
  const [descriptionType, setDescriptionType] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [structure, setStructure] = useState("");
  const [intentFilter, setIntentFilter] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescriptionType("");
    setDescription("");
    setDueDate("");
    setCollaborators([]);
    setCollaboratorInput("");
    setAiAssisted(false);
    setWritingStyle("");
    setStructure("");
    setIntentFilter("");
    setGeneratedDescription("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      alert("Please enter a title first");
      return;
    }
    if (!writingStyle || !structure || !intentFilter) {
      alert("Please select all AI options");
      return;
    }

    try {
      const generated = await generateTaskDescription({
        title: title.trim(),
        descriptionType,
        writingStyle,
        structure,
        intentFilter,
      });
      setGeneratedDescription(generated);
      setDescription(generated);
    } catch (error) {
      console.error("Error generating description:", error);
      alert("Failed to generate description. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    await onAdd({
      title: title.trim(),
      descriptionType: descriptionType ? [descriptionType] : [],
      description: description.trim(),
      dueDate: new Date(dueDate),
      collaborators,
    });
    resetForm();
    onClose();
  };

  const handleCollaboratorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const name = collaboratorInput.trim();
      if (name && !collaborators.includes(name)) {
        setCollaborators([...collaborators, name]);
        setCollaboratorInput("");
      }
    } else if (e.key === "Backspace" && !collaboratorInput && collaborators.length > 0) {
      setCollaborators(collaborators.slice(0, -1));
    }
  };

  const removeCollaborator = (name: string) => {
    setCollaborators(collaborators.filter((c) => c !== name));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />

      <div className="relative bg-slate-800 rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-slate-100">Add New Task</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description Type
            </label>
            <select
              value={descriptionType}
              onChange={(e) => setDescriptionType(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 appearance-none cursor-pointer"
            >
              <option value="">Select a type</option>
              <option value="Personal">Personal</option>
              <option value="Work">Work</option>
              <option value="Errands">Errands</option>
              <option value="Health">Health</option>
              <option value="Documentation">Documentation</option>
              <option value="Development">Development</option>
              <option value="Travel">Travel</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <button
                type="button"
                onClick={() => {
                  setAiAssisted(!aiAssisted);
                  if (aiAssisted) {
                    setGeneratedDescription("");
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  aiAssisted
                    ? "bg-emerald-700 text-emerald-100"
                    : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                }`}
              >
                <Zap className="w-4 h-4" />
                AI Assisted
              </button>
            </div>

            {aiAssisted ? (
              <AiOptionsPanel
                size="md"
                radioNamePrefix="add"
                writingStyle={writingStyle}
                onWritingStyleChange={setWritingStyle}
                structure={structure}
                onStructureChange={setStructure}
                intentFilter={intentFilter}
                onIntentFilterChange={setIntentFilter}
                onGenerate={handleGenerateDescription}
                description={description}
                onDescriptionChange={setDescription}
                showDescriptionEditor={!!generatedDescription}
              />
            ) : (
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                placeholder="Enter task description"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Collaborators
            </label>
            <div className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-slate-500">
              {collaborators.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1 bg-slate-600 text-slate-200 px-2 py-1 rounded text-sm"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeCollaborator(name)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={collaboratorInput}
                onChange={(e) => setCollaboratorInput(e.target.value)}
                onKeyDown={handleCollaboratorKeyDown}
                className="flex-1 min-w-[120px] bg-transparent text-slate-100 placeholder-slate-400 focus:outline-none"
                placeholder={collaborators.length === 0 ? "Type name and press space" : ""}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Press space or enter to add a collaborator</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-100 bg-emerald-700 hover:bg-emerald-600 transition-colors"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
