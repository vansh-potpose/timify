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

class TimetableService {
  private baseUrl = '/api/timetables';

  async getAllTimetables(): Promise<Timetable[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch timetables');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching timetables:', error);
      // Fallback to localStorage
      const savedTimetables = localStorage.getItem('timify-timetables');
      return savedTimetables ? JSON.parse(savedTimetables) : this.getDefaultTimetables();
    }
  }

  async createTimetable(timetableData: Omit<Timetable, 'id' | 'created_at' | 'updated_at'>): Promise<Timetable> {
    try {
      const newTimetable = {
        ...timetableData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTimetable),
      });

      if (!response.ok) {
        throw new Error('Failed to create timetable');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating timetable:', error);
      // Fallback to localStorage
      const newTimetable: Timetable = {
        ...timetableData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const savedTimetables = localStorage.getItem('timify-timetables');
      const timetables = savedTimetables ? JSON.parse(savedTimetables) : this.getDefaultTimetables();
      const updatedTimetables = [...timetables, newTimetable];
      localStorage.setItem('timify-timetables', JSON.stringify(updatedTimetables));
      
      return newTimetable;
    }
  }

  async updateTimetable(timetable: Timetable): Promise<Timetable> {
    try {
      const updatedTimetable = {
        ...timetable,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTimetable),
      });

      if (!response.ok) {
        throw new Error('Failed to update timetable');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating timetable:', error);
      // Fallback to localStorage
      const savedTimetables = localStorage.getItem('timify-timetables');
      const timetables = savedTimetables ? JSON.parse(savedTimetables) : this.getDefaultTimetables();
      const updatedTimetables = timetables.map((t: Timetable) => 
        t.id === timetable.id ? { ...timetable, updated_at: new Date().toISOString() } : t
      );
      localStorage.setItem('timify-timetables', JSON.stringify(updatedTimetables));
      
      return { ...timetable, updated_at: new Date().toISOString() };
    }
  }

  async deleteTimetable(timetableId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}?id=${timetableId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete timetable');
      }
    } catch (error) {
      console.error('Error deleting timetable:', error);
      // Fallback to localStorage
      const savedTimetables = localStorage.getItem('timify-timetables');
      const timetables = savedTimetables ? JSON.parse(savedTimetables) : this.getDefaultTimetables();
      const updatedTimetables = timetables.filter((t: Timetable) => t.id !== timetableId);
      localStorage.setItem('timify-timetables', JSON.stringify(updatedTimetables));
    }
  }

  async copyTimetable(sourceTimetableId: string, newName: string): Promise<Timetable> {
    try {
      const response = await fetch(`${this.baseUrl}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sourceTimetableId, 
          newName 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to copy timetable');
      }

      return await response.json();
    } catch (error) {
      console.error('Error copying timetable:', error);
      // Fallback implementation - this is simplified for localStorage
      const savedTimetables = localStorage.getItem('timify-timetables');
      const timetables = savedTimetables ? JSON.parse(savedTimetables) : this.getDefaultTimetables();
      const sourceTimetable = timetables.find((t: Timetable) => t.id === sourceTimetableId);
      
      if (!sourceTimetable) {
        throw new Error('Source timetable not found');
      }

      const newTimetable: Timetable = {
        ...sourceTimetable,
        id: crypto.randomUUID(),
        name: newName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_default: false
      };

      const updatedTimetables = [...timetables, newTimetable];
      localStorage.setItem('timify-timetables', JSON.stringify(updatedTimetables));
      
      return newTimetable;
    }
  }

  private getDefaultTimetables(): Timetable[] {
    return [{
      id: 'default',
      name: 'My Schedule',
      description: 'Default timetable',
      color: '#3b82f6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_default: true
    }];
  }
}

export const timetableService = new TimetableService();
