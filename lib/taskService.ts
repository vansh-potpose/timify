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

class TaskService {
  private baseUrl = '/api/tasks';

  async getAllTasks(timetableId?: string): Promise<Task[]> {
    try {
      const url = timetableId ? `${this.baseUrl}?timetableId=${timetableId}` : this.baseUrl;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Fallback to localStorage
      const savedTasks = localStorage.getItem('timify-tasks');
      const allTasks = savedTasks ? JSON.parse(savedTasks) : [];
      return timetableId ? allTasks.filter((task: Task) => task.timetable_id === timetableId) : allTasks;
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    try {
      const newTask = {
        ...taskData,
        id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        created_at: new Date().toISOString()
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      // Fallback to localStorage
      const newTask: Task = {
        ...taskData,
        id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        created_at: new Date().toISOString(),
      };
      
      const savedTasks = localStorage.getItem('timify-tasks');
      const tasks = savedTasks ? JSON.parse(savedTasks) : [];
      const updatedTasks = [...tasks, newTask];
      localStorage.setItem('timify-tasks', JSON.stringify(updatedTasks));
      
      return newTask;
    }
  }

  async updateTask(task: Task): Promise<Task> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task:', error);
      // Fallback to localStorage
      const savedTasks = localStorage.getItem('timify-tasks');
      const tasks = savedTasks ? JSON.parse(savedTasks) : [];
      const updatedTasks = tasks.map((t: Task) => t.id === task.id ? task : t);
      localStorage.setItem('timify-tasks', JSON.stringify(updatedTasks));
      
      return task;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}?id=${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      // Fallback to localStorage
      const savedTasks = localStorage.getItem('timify-tasks');
      const tasks = savedTasks ? JSON.parse(savedTasks) : [];
      const updatedTasks = tasks.filter((t: Task) => t.id !== taskId);
      localStorage.setItem('timify-tasks', JSON.stringify(updatedTasks));
    }
  }
}

export const taskService = new TaskService();
