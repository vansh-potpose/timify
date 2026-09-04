'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { PRESET_CATEGORIES, PRESET_COLORS } from './data'; // Adjust the import path as necessary

interface TaskFormProps {
  onAddTask: (task: {
    name: string;
    start_time: string;
    end_time: string;
    color: string;
    category?: string;
  }) => void;
}


export default function TaskForm({ onAddTask }: TaskFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    color: PRESET_COLORS[0],
    category: ''
  });
  const [customColor, setCustomColor] = useState('#000000');
  const [useCustomColor, setUseCustomColor] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.start_time && formData.end_time) {
      const taskColor = useCustomColor ? customColor : formData.color;
      onAddTask({
        ...formData,
        color: taskColor
      });
      setFormData({
        name: '',
        start_time: '',
        end_time: '',
        color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
        category: ''
      });
      setUseCustomColor(false);
      setCustomColor('#000000');
    }
  };

  return (
    <div className="glass-card p-6 border border-border shadow-sm rounded-xl">
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">Add New Task</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-muted-foreground">Task Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., College, Work, Exercise"
            className="bg-background border-input text-foreground placeholder:text-muted-foreground mt-1"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="category" className="text-muted-foreground">Category (Optional)</Label>
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="flex-1 bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select category...</option>
              {PRESET_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Input
              placeholder="Custom category"
              value={formData.category && !PRESET_CATEGORIES.includes(formData.category) ? formData.category : ''}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="flex-1 bg-background border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_time" className="text-muted-foreground">Start Time</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              className="bg-background border-input text-foreground mt-1"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="end_time" className="text-muted-foreground">End Time</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              className="bg-background border-input text-foreground mt-1"
              required
            />
          </div>
        </div>
        
        <div>
          <Label className="text-muted-foreground mb-3 block">Color</Label>
          <div className="space-y-3">
            {/* Preset Colors */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Preset Colors</div>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setFormData({...formData, color});
                      setUseCustomColor(false);
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color && !useCustomColor
                        ? 'border-primary scale-110 shadow-md' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            {/* Custom Color */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Custom Color</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setUseCustomColor(true);
                  }}
                  className="w-12 h-8 rounded border border-input bg-background cursor-pointer"
                />
                <div 
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    useCustomColor 
                      ? 'border-primary scale-110 shadow-md' 
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: customColor }}
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {customColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <Button type="submit" className="w-full font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </form>
    </div>
  );
}