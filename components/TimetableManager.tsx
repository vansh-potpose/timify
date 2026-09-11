'use client';

import React, { useState, useEffect } from 'react';
import { Timetable, timetableService } from '@/lib/timetableService';
import { Task, taskService } from '@/lib/taskService';
import TimetableCard from './TimetableCard';
import TimetableForm from './TimetableForm';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';

interface TimetableManagerProps {
  onTimetableSelect: (timetable: Timetable) => void;
  selectedTimetable: Timetable | null;
}

export default function TimetableManager({
  onTimetableSelect,
  selectedTimetable,
}: TimetableManagerProps) {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'copy'>('create');
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);

  useEffect(() => {
    loadTimetables();
  }, []);

  useEffect(() => {
    if (timetables.length > 0) {
      loadTaskCounts();
    }
  }, [timetables]);

  const loadTimetables = async () => {
    try {
      const fetchedTimetables = await timetableService.getAllTimetables();
      setTimetables(fetchedTimetables);
      
      // Auto-select default timetable or first one
      if (fetchedTimetables.length > 0 && !selectedTimetable) {
        const defaultTimetable = fetchedTimetables.find(t => t.is_default) || fetchedTimetables[0];
        onTimetableSelect(defaultTimetable);
      }
    } catch (error) {
      console.error('Error loading timetables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      
      for (const timetable of timetables) {
        const tasks = await taskService.getAllTasks(timetable.id);
        counts[timetable.id] = tasks.length;
      }
      
      setTaskCounts(counts);
    } catch (error) {
      console.error('Error loading task counts:', error);
    }
  };

  const handleCreateTimetable = async (data: Omit<Timetable, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTimetable = await timetableService.createTimetable(data);
      setTimetables(prev => [...prev, newTimetable]);
      
      
      // Auto-select the new timetable
      onTimetableSelect(newTimetable);
    } catch (error) {
      console.error('Error creating timetable:', error);
    }
  };

  const handleEditTimetable = async (data: Omit<Timetable, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingTimetable) return;

    try {
      const updatedTimetable = await timetableService.updateTimetable({
        ...editingTimetable,
        ...data,
      });
      
      setTimetables(prev => 
        prev.map(t => t.id === updatedTimetable.id ? updatedTimetable : t)
      );
      
      // Update selected timetable if it's the one being edited
      if (selectedTimetable?.id === updatedTimetable.id) {
        onTimetableSelect(updatedTimetable);
      }
      
    } catch (error) {
      console.error('Error updating timetable:', error);
    }
  };

  const handleCopyTimetable = async (data: Omit<Timetable, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingTimetable) return;

    try {
      const copiedTimetable = await timetableService.copyTimetable(
        editingTimetable.id,
        data.name
      );
      
      setTimetables(prev => [...prev, copiedTimetable]);
      
      
      // Auto-select the copied timetable
      onTimetableSelect(copiedTimetable);
      
      // Reload task counts
      loadTaskCounts();
    } catch (error) {
      console.error('Error copying timetable:', error);
    }
  };

  const handleDeleteTimetable = async (timetableId: string) => {
    try {
      await timetableService.deleteTimetable(timetableId);
      
      setTimetables(prev => prev.filter(t => t.id !== timetableId));
      
      // If deleted timetable was selected, select another one
      if (selectedTimetable?.id === timetableId) {
        const remainingTimetables = timetables.filter(t => t.id !== timetableId);
        if (remainingTimetables.length > 0) {
          onTimetableSelect(remainingTimetables[0]);
        }
      }
      
    } catch (error) {
      console.error('Error deleting timetable:', error);
    }
  };

  const openCreateForm = () => {
    setFormMode('create');
    setEditingTimetable(null);
    setFormOpen(true);
  };

  const openEditForm = (timetable: Timetable) => {
    setFormMode('edit');
    setEditingTimetable(timetable);
    setFormOpen(true);
  };

  const openCopyForm = (timetable: Timetable) => {
    setFormMode('copy');
    setEditingTimetable(timetable);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: Omit<Timetable, 'id' | 'created_at' | 'updated_at'>) => {
    switch (formMode) {
      case 'create':
        handleCreateTimetable(data);
        break;
      case 'edit':
        handleEditTimetable(data);
        break;
      case 'copy':
        handleCopyTimetable(data);
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading timetables...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
            My Timetables
          </h2>
        </div>
        
        <Button onClick={openCreateForm} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Timetable
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {timetables.map((timetable) => (
          <TimetableCard
            key={timetable.id}
            timetable={timetable}
            taskCount={taskCounts[timetable.id] || 0}
            isActive={selectedTimetable?.id === timetable.id}
            onSelect={() => onTimetableSelect(timetable)}
            onEdit={() => openEditForm(timetable)}
            onCopy={() => openCopyForm(timetable)}
            onDelete={() => handleDeleteTimetable(timetable.id)}
          />
        ))}
      </div>

      {timetables.length === 0 && (
        <div className="text-center py-12 glass-card">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No timetables yet
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Create your first timetable to start organizing your tasks.
          </p>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Create Timetable
          </Button>
        </div>
      )}

      <TimetableForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        timetable={editingTimetable}
        mode={formMode}
      />
    </div>
  );
}

