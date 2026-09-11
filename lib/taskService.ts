export type Task = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  category?: string;
  created_at: string;
  user_id?: string;
  timetable_id: string;
};

const STORAGE_KEY = 'timify-tasks';

function readTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

class TaskService {
  async getAllTasks(timetableId?: string): Promise<Task[]> {
    const allTasks = readTasks();
    return timetableId
      ? allTasks.filter((t) => t.timetable_id === timetableId)
      : allTasks;
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      created_at: new Date().toISOString(),
    };

    const tasks = readTasks();
    tasks.push(newTask);
    writeTasks(tasks);
    return newTask;
  }

  async updateTask(task: Task): Promise<Task> {
    const tasks = readTasks();
    const updated = tasks.map((t) => (t.id === task.id ? task : t));
    writeTasks(updated);
    return task;
  }

  async deleteTask(taskId: string): Promise<void> {
    const tasks = readTasks();
    writeTasks(tasks.filter((t) => t.id !== taskId));
  }

  async deleteTasksByTimetable(timetableId: string): Promise<void> {
    const tasks = readTasks();
    writeTasks(tasks.filter((t) => t.timetable_id !== timetableId));
  }

  getAllTasksRaw(): Task[] {
    return readTasks();
  }

  importTasks(tasks: Task[]): void {
    writeTasks(tasks);
  }
}

export const taskService = new TaskService();
