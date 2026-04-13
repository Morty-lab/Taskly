import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { AddTaskModal } from "~/modals/AddTaskModal";
import { TaskCard } from "~/components/TaskCard";
import { db } from "~/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

export interface Task {
  id?: string;
  title: string;
  descriptionType: string[];
  description: string;
  dueDate: Date;
  collaborators: string[];
  createdAt: Date;
}

interface FirestoreTask {
  title: string;
  descriptionType: string[];
  description: string;
  dueDate: Timestamp;
  collaborators: string[];
  createdAt: Timestamp;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Taskly" }];
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const tasksData: Task[] = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreTask;
        return {
          id: doc.id,
          title: data.title,
          descriptionType: data.descriptionType,
          description: data.description,
          dueDate: data.dueDate.toDate(),
          collaborators: data.collaborators,
          createdAt: data.createdAt.toDate(),
        };
      });
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddTask = async (newTask: Omit<Task, "id" | "createdAt">) => {
    await addDoc(collection(db, "tasks"), {
      ...newTask,
      dueDate: Timestamp.fromDate(newTask.dueDate),
      createdAt: Timestamp.now(),
    });
  };

  const handleSaveTask = async (taskId: string, updatedTask: Task) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      title: updatedTask.title,
      descriptionType: updatedTask.descriptionType,
      description: updatedTask.description,
      dueDate: Timestamp.fromDate(updatedTask.dueDate),
      collaborators: updatedTask.collaborators,
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "tasks", taskId));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddTask}
      />
      <header className="bg-slate-800 py-6 px-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-100">Taskly</h1>
      </header>

      <main className="p-8">
        <section className="bg-slate-800 rounded-lg p-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-200">Tasks</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-600 hover:bg-slate-500 text-slate-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Add Task
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No tasks yet. Click "+ Add Task" to create one.
            </div>
          ) : (
            <ul className="space-y-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onSave={(updatedTask) => handleSaveTask(task.id!, updatedTask)}
                  onDelete={() => handleDeleteTask(task.id!)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
