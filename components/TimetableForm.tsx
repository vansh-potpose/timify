'use client';

import React, { useState, useEffect } from 'react';
import { Timetable } from '@/lib/timetableService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TimetableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Timetable, 'id' | 'created_at' | 'updated_at'>) => void;
  timetable?: Timetable | null;
  mode: 'create' | 'edit' | 'copy';
}

const DEFAULT_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#6b7280', // Gray
];

export default function TimetableForm({
  open,
  onOpenChange,
  onSubmit,
  timetable,
  mode,
}: TimetableFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    is_default: false,
  });

  useEffect(() => {
    if (timetable && (mode === 'edit' || mode === 'copy')) {
      setFormData({
        name: mode === 'copy' ? `${timetable.name} (Copy)` : timetable.name,
        description: timetable.description || '',
        color: timetable.color,
        is_default: mode === 'edit' ? timetable.is_default : false,
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        color: '#3b82f6',
        is_default: false,
      });
    }
  }, [timetable, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Timetable';
      case 'edit':
        return 'Edit Timetable';
      case 'copy':
        return 'Copy Timetable';
      default:
        return 'Timetable';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'create':
        return 'Create a new timetable to organize your tasks.';
      case 'edit':
        return 'Edit the details of your timetable.';
      case 'copy':
        return 'Create a copy of this timetable with all its tasks.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter timetable name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter timetable description (optional)"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:scale-105'
                  } transition-all duration-150`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name.trim()}>
              {mode === 'create' ? 'Create' : mode === 'edit' ? 'Save' : 'Copy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
