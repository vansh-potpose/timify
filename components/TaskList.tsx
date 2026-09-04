'use client';

import React, { useState } from 'react';
import { Task } from '@/lib/taskService';
import { formatTime, getTaskDuration } from '@/lib/time-utils';
import { Trash2, Split, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PRESET_CATEGORIES, PRESET_COLORS } from './data'; // Adjust the import path as necessary

interface TaskListProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onSplitTask: (task: Task, splitTime: string) => void;
  onUpdateTask: (task: Task) => void;
  highlightedTaskId?: string | null;
  classDetails?:string
}

export default function TaskList({ tasks, onDeleteTask, onSplitTask, onUpdateTask, highlightedTaskId, classDetails='space-y-3' }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [splittingTask, setSplittingTask] = useState<string | null>(null);
  const [splitTime, setSplitTime] = useState('');
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [customColor, setCustomColor] = useState('#000000');
  const [useCustomColor, setUseCustomColor] = useState(false);

  const handleEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditData(task);
    // Check if task color is a preset color or custom
    const isPresetColor = PRESET_COLORS.includes(task.color);
    setUseCustomColor(!isPresetColor);
    if (!isPresetColor) {
      setCustomColor(task.color);
    }
  };

  const handleSaveEdit = () => {
    if (editingTask && editData) {
      const taskColor = useCustomColor ? customColor : editData.color;
      const updatedTask = { ...editData, color: taskColor } as Task;
      onUpdateTask(updatedTask);
      setEditingTask(null);
      setEditData({});
      setUseCustomColor(false);
      setCustomColor('#000000');
    }
  };

  const handleSplit = (task: Task) => {
    if (splitTime) {
      onSplitTask(task, splitTime);
      setSplittingTask(null);
      setSplitTime('');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">Tasks</h3>
      
      {tasks.length === 0 ? (
        <div className="text-muted-foreground text-center py-8 glass-card">
          No tasks yet. Add your first task to get started!
        </div>
      ) : (
        <div className={classDetails}>
          {tasks.map(task => {
            const duration = getTaskDuration(task.start_time, task.end_time);
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            
            return (
              <div 
                key={task.id} 
                className={`task-item rounded-xl p-4 border bg-card text-card-foreground transition-all duration-300 shadow-sm ${
                  highlightedTaskId === task.id 
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md' 
                    : 'border-border hover:border-border/80'
                }`}
              >
                {editingTask === task.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      className="bg-background border-input text-foreground"
                    />
                    
                    {/* Category Input */}
                    <div>
                      <Label className="text-muted-foreground mb-2 block text-sm">Category</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={editData.category || ''}
                          onChange={(e) => setEditData({...editData, category: e.target.value})}
                          className="flex-1 bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select category...</option>
                          {PRESET_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <Input
                          placeholder="Custom category"
                          value={editData.category && !PRESET_CATEGORIES.includes(editData.category) ? editData.category : ''}
                          onChange={(e) => setEditData({...editData, category: e.target.value})}
                          className="flex-1 bg-background border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={editData.start_time || ''}
                        onChange={(e) => setEditData({...editData, start_time: e.target.value})}
                        className="bg-background border-input text-foreground"
                      />
                      <Input
                        type="time"
                        value={editData.end_time || ''}
                        onChange={(e) => setEditData({...editData, end_time: e.target.value})}
                        className="bg-background border-input text-foreground"
                      />
                    </div>
                    
                    {/* Color Selection */}
                    <div>
                      <Label className="text-muted-foreground mb-3 block text-sm">Color</Label>
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
                                  setEditData({...editData, color});
                                  setUseCustomColor(false);
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${
                                  editData.color === color && !useCustomColor
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
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customColor}
                              onChange={(e) => {
                                setCustomColor(e.target.value);
                                setUseCustomColor(true);
                              }}
                              className="w-8 h-6 rounded border border-input bg-background cursor-pointer"
                            />
                            <div 
                              className={`w-6 h-6 rounded-full border-2 transition-all ${
                                useCustomColor 
                                  ? 'border-primary scale-110' 
                                  : 'border-transparent'
                              }`}
                              style={{ backgroundColor: customColor }}
                            />
                            <span className="text-xs text-muted-foreground font-mono">
                              {customColor.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} size="sm">Save</Button>
                      <Button 
                        onClick={() => {
                          setEditingTask(null);
                          setUseCustomColor(false);
                          setCustomColor('#000000');
                        }} 
                        variant="outline" 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : splittingTask === task.id ? (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground">Split "{task.name}" at:</p>
                    <Input
                      type="time"
                      value={splitTime}
                      onChange={(e) => setSplitTime(e.target.value)}
                      min={task.start_time}
                      max={task.end_time}
                      className="bg-background border-input text-foreground"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleSplit(task)} size="sm">Split</Button>
                      <Button 
                        onClick={() => setSplittingTask(null)} 
                        variant="outline" 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <div 
                          className="w-3.5 h-3.5 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: task.color }}
                        />
                        <h4 className="font-semibold text-foreground truncate text-sm sm:text-base">{task.name}</h4>
                        {task.category && (
                          <span className="px-2 py-0.5 text-[11px] bg-secondary text-secondary-foreground rounded-full shrink-0">
                            {task.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          onClick={() => handleEdit(task)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setSplittingTask(task.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Split className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => onDeleteTask(task.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs sm:text-sm text-muted-foreground font-mono">
                      <div className="flex items-center justify-between">
                        <span>{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
                        <span className="font-semibold text-foreground">
                          {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}