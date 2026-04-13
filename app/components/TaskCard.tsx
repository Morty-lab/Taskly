import { useState } from "react";
import { X, Zap } from "lucide-react";
import type { Task } from "~/routes/home";
import { generateTaskDescription } from "~/lib/gemini";
import { AiOptionsPanel } from "~/components/AiOptionsPanel";

interface TaskCardProps {
  task: Task;
  onSave: (updatedTask: Task) => void;
  onDelete: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

const descriptionTypeOptions = [
  "Personal",
  "Work",
  "Errands",
  "Health",
  "Documentation",
  "Development",
  "Travel",
];

export function TaskCard({ task, onSave, onDelete }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [aiAssisted, setAiAssisted] = useState(false);

  const [writingStyle, setWritingStyle] = useState("");
  const [structure, setStructure] = useState("");
  const [intentFilter, setIntentFilter] = useState("");

  const handleEdit = () => {
    setEditedTask({ ...task });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedTask({ ...task });
    setCollaboratorInput("");
    setAiAssisted(false);
    setWritingStyle("");
    setStructure("");
    setIntentFilter("");
    setIsEditing(false);
  };

  const handleSave = () => {
    onSave(editedTask);
    setAiAssisted(false);
    setWritingStyle("");
    setStructure("");
    setIntentFilter("");
    setIsEditing(false);
  };

  const handleGenerateDescription = async () => {
    if (!editedTask.title.trim()) {
      alert("Please enter a title first");
      return;
    }
    if (!writingStyle || !structure || !intentFilter) {
      alert("Please select all AI options");
      return;
    }

    try {
      const generated = await generateTaskDescription({
        title: editedTask.title.trim(),
        descriptionType: editedTask.descriptionType[0] || "",
        writingStyle,
        structure,
        intentFilter,
      });
      setEditedTask({ ...editedTask, description: generated });
    } catch (error) {
      console.error("Error generating description:", error);
      alert("Failed to generate description. Please try again.");
    }
  };

  const handleCollaboratorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const name = collaboratorInput.trim();
      if (name && !editedTask.collaborators.includes(name)) {
        setEditedTask({
          ...editedTask,
          collaborators: [...editedTask.collaborators, name],
        });
        setCollaboratorInput("");
      }
    } else if (e.key === "Backspace" && !collaboratorInput && editedTask.collaborators.length > 0) {
      setEditedTask({
        ...editedTask,
        collaborators: editedTask.collaborators.slice(0, -1),
      });
    }
  };

  const removeCollaborator = (name: string) => {
    setEditedTask({
      ...editedTask,
      collaborators: editedTask.collaborators.filter((c) => c !== name),
    });
  };

  const toggleDescriptionType = (type: string) => {
    if (editedTask.descriptionType.includes(type)) {
      setEditedTask({
        ...editedTask,
        descriptionType: editedTask.descriptionType.filter((t) => t !== type),
      });
    } else {
      setEditedTask({
        ...editedTask,
        descriptionType: [...editedTask.descriptionType, type],
      });
    }
  };

  if (isEditing) {
    return (
      <li className="bg-slate-700 rounded-lg p-4 ring-2 ring-emerald-600">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description Type</label>
            <div className="flex flex-wrap gap-2">
              {descriptionTypeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleDescriptionType(type)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    editedTask.descriptionType.includes(type)
                      ? "bg-emerald-700 text-emerald-100"
                      : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-400">Description</label>
              <button
                type="button"
                onClick={() => setAiAssisted(!aiAssisted)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  aiAssisted
                    ? "bg-emerald-700 text-emerald-100"
                    : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                }`}
              >
                <Zap className="w-3 h-3" />
                AI Assisted
              </button>
            </div>

            {aiAssisted ? (
              <AiOptionsPanel
                size="sm"
                radioNamePrefix="edit"
                writingStyle={writingStyle}
                onWritingStyleChange={setWritingStyle}
                structure={structure}
                onStructureChange={setStructure}
                intentFilter={intentFilter}
                onIntentFilterChange={setIntentFilter}
                onGenerate={handleGenerateDescription}
                description={editedTask.description}
                onDescriptionChange={(v) => setEditedTask({ ...editedTask, description: v })}
                showDescriptionEditor={!!editedTask.description}
              />
            ) : (
              <textarea
                value={editedTask.description}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                rows={3}
                className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
            <input
              type="date"
              value={formatDateForInput(editedTask.dueDate)}
              onChange={(e) => setEditedTask({ ...editedTask, dueDate: new Date(e.target.value) })}
              className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Collaborators</label>
            <div className="w-full bg-slate-600 border border-slate-500 rounded-md px-3 py-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-emerald-500">
              {editedTask.collaborators.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1 bg-slate-500 text-slate-200 px-2 py-1 rounded text-sm"
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
                placeholder={editedTask.collaborators.length === 0 ? "Type name and press space" : ""}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-600">
            <button
              onClick={handleCancel}
              className="bg-slate-600 hover:bg-slate-500 text-slate-200 px-3 py-1.5 rounded text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-emerald-700 hover:bg-emerald-600 text-slate-100 px-3 py-1.5 rounded text-sm transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="bg-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-medium text-slate-100">{task.title}</h3>
        <span className="text-xs text-slate-400">Due: {formatDate(task.dueDate)}</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {task.descriptionType.map((type) => (
          <span
            key={type}
            className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded"
          >
            {type}
          </span>
        ))}
      </div>

      <p className="text-sm text-slate-300 mb-3 whitespace-pre-wrap">{task.description}</p>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {task.collaborators.length > 0 ? (
            <>
              <span>Collaborators:</span>
              <div className="flex gap-1">
                {task.collaborators.map((name) => (
                  <span
                    key={name}
                    className="bg-slate-600 text-slate-200 px-2 py-0.5 rounded"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <span>No collaborators</span>
          )}
        </div>
        <span>Created: {formatDate(task.createdAt)}</span>
      </div>

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-600">
        <button
          onClick={handleEdit}
          className="bg-slate-600 hover:bg-slate-500 text-slate-200 px-3 py-1.5 rounded text-sm transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="bg-red-700 hover:bg-red-600 text-slate-100 px-3 py-1.5 rounded text-sm transition-colors"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
