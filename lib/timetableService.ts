export type Timetable = {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  is_default: boolean;
};

const STORAGE_KEY = 'timify-timetables';

function readTimetables(): Timetable[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : getDefaultTimetables();
}

function writeTimetables(timetables: Timetable[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timetables));
}

function getDefaultTimetables(): Timetable[] {
  return [{
    id: 'default',
    name: 'My Schedule',
    description: 'Default timetable',
    color: '#3b82f6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_default: true,
  }];
}

class TimetableService {
  async getAllTimetables(): Promise<Timetable[]> {
    return readTimetables();
  }

  async createTimetable(timetableData: Omit<Timetable, 'id' | 'created_at' | 'updated_at'>): Promise<Timetable> {
    const newTimetable: Timetable = {
      ...timetableData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const timetables = readTimetables();
    timetables.push(newTimetable);
    writeTimetables(timetables);
    return newTimetable;
  }

  async updateTimetable(timetable: Timetable): Promise<Timetable> {
    const updated = { ...timetable, updated_at: new Date().toISOString() };
    const timetables = readTimetables();
    const result = timetables.map((t) => (t.id === timetable.id ? updated : t));
    writeTimetables(result);
    return updated;
  }

  async deleteTimetable(timetableId: string): Promise<void> {
    const timetables = readTimetables();
    writeTimetables(timetables.filter((t) => t.id !== timetableId));
  }

  async copyTimetable(sourceTimetableId: string, newName: string): Promise<Timetable> {
    const timetables = readTimetables();
    const source = timetables.find((t) => t.id === sourceTimetableId);

    if (!source) {
      throw new Error('Source timetable not found');
    }

    const newId = crypto.randomUUID();
    const newTimetable: Timetable = {
      ...source,
      id: newId,
      name: newName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_default: false,
    };

    timetables.push(newTimetable);
    writeTimetables(timetables);

    // Also copy tasks from the source timetable
    const tasksRaw = localStorage.getItem('timify-tasks');
    const allTasks = tasksRaw ? JSON.parse(tasksRaw) : [];
    const sourceTasks = allTasks.filter((t: any) => t.timetable_id === sourceTimetableId);

    const copiedTasks = sourceTasks.map((t: any) => ({
      ...t,
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      timetable_id: newId,
      created_at: new Date().toISOString(),
    }));

    const updatedTasks = [...allTasks, ...copiedTasks];
    localStorage.setItem('timify-tasks', JSON.stringify(updatedTasks));

    return newTimetable;
  }

  getAllTimetablesRaw(): Timetable[] {
    return readTimetables();
  }

  importTimetables(timetables: Timetable[]): void {
    writeTimetables(timetables);
  }
}

export const timetableService = new TimetableService();
