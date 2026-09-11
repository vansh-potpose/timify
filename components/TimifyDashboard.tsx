'use client';

import React, { useState, useEffect, useRef } from 'react';
import CircularClock from './CircularClock';
import TaskList from './TaskList';
import TaskForm from './TaskForm';
import Analytics from './Analytics';
import TimetableManager from './TimetableManager';
import { ThemeToggle } from './ThemeToggle';
import { Task, taskService } from '@/lib/taskService';
import { Timetable, timetableService } from '@/lib/timetableService';
import { Clock, BarChart3, Plus, Calendar, Eye, EyeOff, Printer, Sparkles, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { minutesToTimeString, findOverlappingTask, formatTime } from '@/lib/time-utils';

export default function TimifyDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clocks' | 'tasks' | 'analytics'>('clocks');
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [isOnHomePage, setIsOnHomePage] = useState(true);
  const [showArcLabels, setShowArcLabels] = useState(true);
  const taskListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTimetable) {
      loadTasks();
    }
  }, [selectedTimetable]);

  const loadInitialData = async () => {
    try {
      setIsOnHomePage(true);
      setSelectedTimetable(null);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setIsOnHomePage(true);
      setSelectedTimetable(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!selectedTimetable) return;

    try {
      const fetchedTasks = await taskService.getAllTasks(selectedTimetable.id);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      const savedTasks = localStorage.getItem('timify-tasks');
      if (savedTasks) {
        const allTasks = JSON.parse(savedTasks);
        const filteredTasks = allTasks.filter((task: Task) => task.timetable_id === selectedTimetable.id);
        setTasks(filteredTasks);
      }
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'timetable_id'>) => {
    if (!selectedTimetable) return;

    const conflict = findOverlappingTask(taskData.start_time, taskData.end_time, tasks);
    if (conflict) {
      alert(`Cannot add task "${taskData.name}": Overlaps with existing task "${conflict.name}" (${formatTime(conflict.start_time)} â€“ ${formatTime(conflict.end_time)})`);
      return;
    }

    try {
      const taskWithTimetable = {
        ...taskData,
        timetable_id: selectedTimetable.id,
      };
      const newTask = await taskService.createTask(taskWithTimetable);
      setTasks(prev => [...prev, newTask]);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    const conflict = findOverlappingTask(updatedTask.start_time, updatedTask.end_time, tasks, updatedTask.id);
    if (conflict) {
      alert(`Cannot update task "${updatedTask.name}": Overlaps with existing task "${conflict.name}" (${formatTime(conflict.start_time)} â€“ ${formatTime(conflict.end_time)})`);
      return;
    }

    try {
      await taskService.updateTask(updatedTask);
      setTasks(prev => prev.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const splitTask = async (task: Task, splitTime: string) => {
    if (!selectedTimetable) return;

    try {
      if (splitTime <= task.start_time || splitTime >= task.end_time) {
        console.error('Invalid split time');
        return;
      }

      const task1: Omit<Task, 'id' | 'created_at'> = {
        ...task,
        name: `${task.name} (Part 1)`,
        end_time: splitTime,
        timetable_id: selectedTimetable.id,
      };

      const task2: Omit<Task, 'id' | 'created_at'> = {
        ...task,
        name: `${task.name} (Part 2)`,
        start_time: splitTime,
        timetable_id: selectedTimetable.id,
      };

      const newTask1 = await taskService.createTask(task1);
      const newTask2 = await taskService.createTask(task2);

      if (!newTask1?.id || !newTask2?.id) {
        throw new Error('Failed to create split tasks');
      }

      await deleteTask(task.id);

      setTasks(prev => [
        ...prev.filter(t => t.id !== task.id),
        newTask1,
        newTask2
      ]);

      await loadTasks();
    } catch (error) {
      console.error('Error splitting task:', error);
      await loadTasks();
    }
  };

  const handleTaskClick = (task: Task) => {
    setHighlightedTaskId(task.id);
    setTimeout(() => {
      setHighlightedTaskId(null);
    }, 3000);
  };  // ---- Import / Export ----
  const handleExport = () => {
    const data = {
      version: 1,
      exported_at: new Date().toISOString(),
      timetables: timetableService.getAllTimetablesRaw(),
      tasks: taskService.getAllTasksRaw(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timify-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.timetables || !data.tasks) {
          alert('Invalid backup file: missing timetables or tasks data.');
          return;
        }
        if (!confirm(`This will replace ALL your current data with the imported backup (${data.timetables.length} timetables, ${data.tasks.length} tasks). Continue?`)) {
          return;
        }
        timetableService.importTimetables(data.timetables);
        taskService.importTasks(data.tasks);
        // Reload the page to reflect imported data
        window.location.reload();
      } catch (err) {
        alert('Failed to import: Invalid JSON file.');
        console.error('Import error:', err);
      }
    };
    input.click();
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Clock className="w-10 h-10 text-primary animate-spin" />
        <div className="text-muted-foreground font-medium text-sm">Loading Timify...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Responsive Header */}
      <header className="app-header shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            
            {/* Top Bar on Mobile / Left Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center shadow-md shadow-primary/20">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Timify
                  </h1>
                  {selectedTimetable && !isOnHomePage && (
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                      {selectedTimetable.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Theme Toggle & Controls Mobile shortcut */}
              <div className="flex items-center gap-1.5 md:hidden">
                {!isOnHomePage && selectedTimetable && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowArcLabels(prev => !prev)}
                    title={showArcLabels ? "Hide task labels on clock" : "Show task labels on clock"}
                    className="w-9 h-9 text-muted-foreground hover:text-foreground"
                  >
                    {showArcLabels ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                )}
                <ThemeToggle />
              </div>
            </div>

            {/* Nav & Controls */}
            {!isOnHomePage && selectedTimetable ? (
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 border-t md:border-t-0 pt-2.5 md:pt-0 border-border/60">
                <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 w-full sm:w-auto scrollbar-none">
                  <Button
                    onClick={() => setIsOnHomePage(true)}
                    variant="ghost"
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Timetables
                  </Button>
                  <Button
                    onClick={() => setActiveTab('clocks')}
                    variant={activeTab === 'clocks' ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Clocks
                  </Button>
                  <Button
                    onClick={() => setActiveTab('tasks')}
                    variant={activeTab === 'tasks' ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Tasks
                  </Button>
                  <Button
                    onClick={() => setActiveTab('analytics')}
                    variant={activeTab === 'analytics' ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Analytics
                  </Button>
                  <Button
                    onClick={() => window.print()}
                    variant="ghost"
                    size="sm"
                    className="inline-flex text-xs sm:text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                    title="Print timetable"
                  >
                    <Printer className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Print</span>
                  </Button>
                  <Button
                    onClick={handleExport}
                    variant="ghost"
                    size="sm"
                    className="inline-flex text-xs sm:text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                    title="Export all data"
                  >
                    <Download className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button
                    onClick={handleImport}
                    variant="ghost"
                    size="sm"
                    className="inline-flex text-xs sm:text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                    title="Import data from backup"
                  >
                    <Upload className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                </nav>

                {/* Desktop Theme Toggle & Arc Label Toggle */}
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/80">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowArcLabels(prev => !prev)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                    title={showArcLabels ? "Hide task labels on clock" : "Show task labels on clock"}
                  >
                    {showArcLabels ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1.5" /> Hide Labels
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1.5" /> Show Labels
                      </>
                    )}
                  </Button>
                  <ThemeToggle />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {isOnHomePage ? 'Select or create a timetable' : 'No timetable selected'}
                </span>
                <div className="hidden md:block">
                  <ThemeToggle />
                </div>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {isOnHomePage ? (
          <TimetableManager
            onTimetableSelect={(timetable) => {
              setSelectedTimetable(timetable);
              setIsOnHomePage(false);
              setActiveTab('clocks');
            }}
            selectedTimetable={selectedTimetable}
          />
        ) : selectedTimetable ? (
          <>
            {activeTab === 'clocks' && (
              <div className="space-y-6 sm:space-y-8">
                {/* Responsive Dual Clocks Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 justify-items-center">
                  <div className="w-full flex justify-center">
                    <CircularClock
                      period="6AM-6PM"
                      tasks={tasks}
                      onTaskClick={handleTaskClick}
                      onAddTask={addTask}
                      onUpdateTask={updateTask}
                      onDeleteTask={deleteTask}
                      onSplitTask={splitTask}
                      showLabels={showArcLabels}
                    />
                  </div>
                  <div className="w-full flex justify-center">
                    <CircularClock
                      period="6PM-6AM"
                      tasks={tasks}
                      onTaskClick={handleTaskClick}
                      onAddTask={addTask}
                      onUpdateTask={updateTask}
                      onDeleteTask={deleteTask}
                      onSplitTask={splitTask}
                      showLabels={showArcLabels}
                    />
                  </div>
                </div>

                {/* Task List Section */}
                <div className="w-full pt-2" ref={taskListRef}>
                  <TaskList
                    tasks={tasks}
                    classDetails="grid grid-cols-1 md:grid-cols-2 gap-3"
                    onDeleteTask={deleteTask}
                    onSplitTask={splitTask}
                    onUpdateTask={updateTask}
                    highlightedTaskId={highlightedTaskId}
                  />
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <TaskForm onAddTask={addTask} />
                </div>
                <div>
                  <TaskList
                    tasks={tasks}
                    onDeleteTask={deleteTask}
                    onSplitTask={splitTask}
                    onUpdateTask={updateTask}
                    highlightedTaskId={highlightedTaskId}
                  />
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <Analytics tasks={tasks} />
                </div>
                <div>
                  <TaskList
                    tasks={tasks}
                    onDeleteTask={deleteTask}
                    onSplitTask={splitTask}
                    onUpdateTask={updateTask}
                    highlightedTaskId={highlightedTaskId}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 glass-card">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Something went wrong
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Unable to load timetable. Please try again.
            </p>
            <Button onClick={() => setIsOnHomePage(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Back to Timetables
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}