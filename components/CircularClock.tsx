'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Task } from '@/lib/taskService';
import {
  timeToClockAngle,
  angleToClockTime,
  getAngleFromCoordinates,
  describeArc,
  formatTime,
  getTaskDuration,
  formatDuration,
  timeStringToMinutes,
  minutesToTimeString,
  findMagneticSnapTime,
  findOverlappingTask,
  SnapTarget,
} from '@/lib/time-utils';
import { PRESET_CATEGORIES, PRESET_COLORS } from './data';
import {
  Scissors,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Sparkles,
  Magnet,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CircularClockProps {
  period: '6AM-6PM' | '6PM-6AM';
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'created_at' | 'timetable_id'>) => Promise<void> | void;
  onUpdateTask?: (task: Task) => Promise<void> | void;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
  onSplitTask?: (task: Task, splitTime: string) => Promise<void> | void;
  showLabels?: boolean;
}

type DragState =
  | {
    type: 'create';
    startAngle: number;
    currentAngle: number;
    startTime: string;
    currentTime: string;
    snappedLabel?: string | null;
  }
  | {
    type: 'resize-start';
    task: Task;
    currentAngle: number;
    currentTime: string;
    snappedLabel?: string | null;
  }
  | {
    type: 'resize-end';
    task: Task;
    currentAngle: number;
    currentTime: string;
    snappedLabel?: string | null;
  }
  | {
    type: 'move-arc';
    task: Task;
    initialPointerAngle: number;
    initialStartMinutes: number;
    durationMinutes: number;
    currentStartMinutes: number;
    currentAngleOffset: number;
    currentTime: string;
    snappedLabel?: string | null;
  }
  | null;

export default function CircularClock({
  period,
  tasks,
  onTaskClick,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onSplitTask,
  showLabels = false,
}: CircularClockProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Spacious dimensions for precision
  const center = 190;
  const radius = 150;
  const strokeWidth = 16;
  const isAMPeriod = period === '6AM-6PM';

  // Interaction States
  const [activeTool, setActiveTool] = useState<'draw' | 'split'>('draw');
  const [snapMinutes, setSnapMinutes] = useState<number>(5);
  const [magneticSnap, setMagneticSnap] = useState<boolean>(true);
  const [dragState, setDragState] = useState<DragState>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [clockHover, setClockHover] = useState<{
    angle: number;
    time: string;
    snappedLabel?: string | null;
  } | null>(null);

  // Quick Create Modal State
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    name: '',
    category: '',
    color: PRESET_COLORS[0],
    start_time: '09:00',
    end_time: '10:30',
  });

  // Task inline edit in popover
  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Task>>({});

  // Caching screen coordinates to prevent layout thrashing & jitter
  const dragCenterRef = useRef<{ screenX: number; screenY: number }>({ screenX: 0, screenY: 0 });

  // Responsive mobile screen check for clock labels
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter tasks for this clock period
  const periodTasks = useMemo(() => {
    return tasks.filter((task) => {
      const [startH, startM] = task.start_time.split(':').map(Number);
      const [endH, endM] = task.end_time.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      const sixAM = 360;
      const sixPM = 1080;

      if (isAMPeriod) {
        return startMins < sixPM && endMins > sixAM;
      } else {
        return (
          startMins >= sixPM ||
          endMins <= sixAM ||
          (startMins < sixPM && endMins > sixPM) ||
          (startMins < sixAM && endMins > sixAM)
        );
      }
    });
  }, [tasks, isAMPeriod]);

  // Compute all magnetic snap targets (ends and starts of other tasks)
  const snapTargets: SnapTarget[] = useMemo(() => {
    const targets: SnapTarget[] = [];
    tasks.forEach((t) => {
      targets.push({
        time: t.start_time,
        label: `Start of "${t.name}"`,
        taskId: t.id,
      });
      targets.push({
        time: t.end_time,
        label: `End of "${t.name}"`,
        taskId: t.id,
      });
    });
    if (isAMPeriod) {
      targets.push({ time: '06:00', label: '6:00 AM' });
      targets.push({ time: '12:00', label: '12:00 PM' });
      targets.push({ time: '18:00', label: '6:00 PM' });
    } else {
      targets.push({ time: '18:00', label: '6:00 PM' });
      targets.push({ time: '00:00', label: '12:00 AM' });
      targets.push({ time: '06:00', label: '6:00 AM' });
    }
    return targets;
  }, [tasks, isAMPeriod]);

  // Convert raw client coordinate to time with magnetic snapping
  const calculateTimeFromClientPos = useCallback(
    (clientX: number, clientY: number, excludeTaskId?: string) => {
      const dx = clientX - dragCenterRef.current.screenX;
      const dy = clientY - dragCenterRef.current.screenY;
      const rad = Math.atan2(dy, dx);
      const angle = (rad * 180 / Math.PI + 360) % 360;

      const rawTime = angleToClockTime(angle, period, snapMinutes);

      if (magneticSnap) {
        const applicableTargets = excludeTaskId
          ? snapTargets.filter((t) => t.taskId !== excludeTaskId)
          : snapTargets;

        const { time: magneticTime, snappedTarget } = findMagneticSnapTime(
          rawTime,
          applicableTargets,
          8 // ±8 minutes magnetic tolerance
        );

        const finalAngle = timeToClockAngle(magneticTime, period) ?? angle;

        return {
          angle: finalAngle,
          time: magneticTime,
          snappedLabel: snappedTarget ? snappedTarget.label : null,
        };
      }

      return {
        angle,
        time: rawTime,
        snappedLabel: null,
      };
    },
    [period, snapMinutes, magneticSnap, snapTargets]
  );

  // Initialize center screen coordinates on drag start
  const initDragCenter = useCallback(() => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      dragCenterRef.current = {
        screenX: rect.left + rect.width / 2,
        screenY: rect.top + rect.height / 2,
      };
    }
  }, []);

  // Global Pointer Events during Drag
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!dragState) return;

      if (dragState.type === 'create') {
        const { angle, time, snappedLabel } = calculateTimeFromClientPos(e.clientX, e.clientY);
        setDragState((prev) =>
          prev && prev.type === 'create'
            ? { ...prev, currentAngle: angle, currentTime: time, snappedLabel }
            : prev
        );
      } else if (dragState.type === 'resize-start') {
        const { angle, time, snappedLabel } = calculateTimeFromClientPos(
          e.clientX,
          e.clientY,
          dragState.task.id
        );
        setDragState((prev) =>
          prev && prev.type === 'resize-start'
            ? { ...prev, currentAngle: angle, currentTime: time, snappedLabel }
            : prev
        );
      } else if (dragState.type === 'resize-end') {
        const { angle, time, snappedLabel } = calculateTimeFromClientPos(
          e.clientX,
          e.clientY,
          dragState.task.id
        );
        setDragState((prev) =>
          prev && prev.type === 'resize-end'
            ? { ...prev, currentAngle: angle, currentTime: time, snappedLabel }
            : prev
        );
      } else if (dragState.type === 'move-arc') {
        const dx = e.clientX - dragCenterRef.current.screenX;
        const dy = e.clientY - dragCenterRef.current.screenY;
        const currentPointerAngle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

        let deltaAngle = (currentPointerAngle - dragState.initialPointerAngle + 360) % 360;
        if (deltaAngle > 180) deltaAngle -= 360;

        const deltaMinutes =
          Math.round(((deltaAngle / 360) * 720) / snapMinutes) * snapMinutes;
        const newStart = ((dragState.initialStartMinutes + deltaMinutes) % 1440 + 1440) % 1440;
        const newStartTime = minutesToTimeString(newStart);

        setDragState((prev) =>
          prev && prev.type === 'move-arc'
            ? {
              ...prev,
              currentStartMinutes: newStart,
              currentAngleOffset: deltaAngle,
              currentTime: newStartTime,
            }
            : prev
        );
      }
    };

    const handleGlobalPointerUp = async (e: PointerEvent) => {
      if (!dragState) return;

      if (dragState.type === 'create') {
        let startTime = dragState.startTime;
        let endTime = dragState.currentTime;

        const startM = timeStringToMinutes(startTime);
        const endM = timeStringToMinutes(endTime);

        if (startM !== endM) {
          const cwDiff = (dragState.currentAngle - dragState.startAngle + 360) % 360;
          if (cwDiff > 180) {
            const temp = startTime;
            startTime = endTime;
            endTime = temp;
          }

          setNewTaskData({
            name: '',
            category: 'Personal',
            color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
            start_time: startTime,
            end_time: endTime,
          });
          setQuickCreateOpen(true);
        }
      } else if (dragState.type === 'resize-start') {
        // Validate overlap
        const overlap = findOverlappingTask(
          dragState.currentTime,
          dragState.task.end_time,
          tasks,
          dragState.task.id
        );
        if (overlap) {
          alert(`Cannot resize: Overlaps with task "${overlap.name}" (${formatTime(overlap.start_time)} – ${formatTime(overlap.end_time)})`);
        } else {
          const updatedTask: Task = {
            ...dragState.task,
            start_time: dragState.currentTime,
          };
          if (onUpdateTask) {
            await onUpdateTask(updatedTask);
          }
        }
      } else if (dragState.type === 'resize-end') {
        // Validate overlap
        const overlap = findOverlappingTask(
          dragState.task.start_time,
          dragState.currentTime,
          tasks,
          dragState.task.id
        );
        if (overlap) {
          alert(`Cannot resize: Overlaps with task "${overlap.name}" (${formatTime(overlap.start_time)} – ${formatTime(overlap.end_time)})`);
        } else {
          const updatedTask: Task = {
            ...dragState.task,
            end_time: dragState.currentTime,
          };
          if (onUpdateTask) {
            await onUpdateTask(updatedTask);
          }
        }
      } else if (dragState.type === 'move-arc') {
        const newStart = dragState.currentStartMinutes;
        const newEnd = (newStart + dragState.durationMinutes) % 1440;
        const newStartTime = minutesToTimeString(newStart);
        const newEndTime = minutesToTimeString(newEnd);

        // Validate overlap
        const overlap = findOverlappingTask(
          newStartTime,
          newEndTime,
          tasks,
          dragState.task.id
        );
        if (overlap) {
          alert(`Cannot move task: Overlaps with task "${overlap.name}" (${formatTime(overlap.start_time)} – ${formatTime(overlap.end_time)})`);
        } else {
          const updatedTask: Task = {
            ...dragState.task,
            start_time: newStartTime,
            end_time: newEndTime,
          };
          if (onUpdateTask) {
            await onUpdateTask(updatedTask);
          }
        }
      }

      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [dragState, calculateTimeFromClientPos, snapMinutes, onUpdateTask, tasks]);

  // Pointer Down on Circumference Ring to Create Task
  const handleRingPointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'split') return;
    initDragCenter();
    const { angle, time, snappedLabel } = calculateTimeFromClientPos(e.clientX, e.clientY);

    setDragState({
      type: 'create',
      startAngle: angle,
      currentAngle: angle,
      startTime: time,
      currentTime: time,
      snappedLabel,
    });
  };

  // Start Bar Handle Pointer Down
  const handleStartResize = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    initDragCenter();
    const { angle, time, snappedLabel } = calculateTimeFromClientPos(
      e.clientX,
      e.clientY,
      task.id
    );

    setDragState({
      type: 'resize-start',
      task,
      currentAngle: angle,
      currentTime: task.start_time,
      snappedLabel,
    });
  };

  // End Bar Handle Pointer Down
  const handleEndResize = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    initDragCenter();
    const { angle, time, snappedLabel } = calculateTimeFromClientPos(
      e.clientX,
      e.clientY,
      task.id
    );

    setDragState({
      type: 'resize-end',
      task,
      currentAngle: angle,
      currentTime: task.end_time,
      snappedLabel,
    });
  };

  // Move Arc Pointer Down
  const handleMoveArcStart = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    if (activeTool === 'split') return;
    initDragCenter();

    const dx = e.clientX - dragCenterRef.current.screenX;
    const dy = e.clientY - dragCenterRef.current.screenY;
    const pointerAngle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

    const startMins = timeStringToMinutes(task.start_time);
    const duration = getTaskDuration(task.start_time, task.end_time);

    setDragState({
      type: 'move-arc',
      task,
      initialPointerAngle: pointerAngle,
      initialStartMinutes: startMins,
      durationMinutes: duration,
      currentStartMinutes: startMins,
      currentAngleOffset: 0,
      currentTime: task.start_time,
    });
  };

  // Task Click (Select / Split)
  const handleTaskArcClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    initDragCenter();
    if (activeTool === 'split') {
      const { time } = calculateTimeFromClientPos(e.clientX, e.clientY);
      if (time > task.start_time && time < task.end_time && onSplitTask) {
        onSplitTask(task, time);
      }
    } else {
      setSelectedTask(task);
      setEditFormData(task);
      setIsEditingSelected(false);
      onTaskClick?.(task);
    }
  };

  // Quick Create Overlap Validation
  const quickCreateOverlapConflict = useMemo(() => {
    if (!quickCreateOpen) return null;
    return findOverlappingTask(newTaskData.start_time, newTaskData.end_time, tasks);
  }, [quickCreateOpen, newTaskData.start_time, newTaskData.end_time, tasks]);

  // Quick Create submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.name.trim() || !onAddTask) return;

    if (quickCreateOverlapConflict) {
      alert(`Cannot add task: Overlaps with "${quickCreateOverlapConflict.name}" (${formatTime(quickCreateOverlapConflict.start_time)} – ${formatTime(quickCreateOverlapConflict.end_time)})`);
      return;
    }

    await onAddTask({
      name: newTaskData.name.trim(),
      category: newTaskData.category || 'General',
      color: newTaskData.color,
      start_time: newTaskData.start_time,
      end_time: newTaskData.end_time,
    });

    setQuickCreateOpen(false);
    setNewTaskData({
      name: '',
      category: '',
      color: PRESET_COLORS[0],
      start_time: '09:00',
      end_time: '10:30',
    });
  };

  // Edit selected overlap conflict
  const editSelectedOverlapConflict = useMemo(() => {
    if (!isEditingSelected || !selectedTask) return null;
    const sTime = editFormData.start_time || selectedTask.start_time;
    const eTime = editFormData.end_time || selectedTask.end_time;
    return findOverlappingTask(sTime, eTime, tasks, selectedTask.id);
  }, [isEditingSelected, selectedTask, editFormData, tasks]);

  // Save inline edit
  const handleSaveSelectedEdit = async () => {
    if (!selectedTask || !onUpdateTask) return;
    if (editSelectedOverlapConflict) {
      alert(`Cannot save edit: Overlaps with "${editSelectedOverlapConflict.name}" (${formatTime(editSelectedOverlapConflict.start_time)} – ${formatTime(editSelectedOverlapConflict.end_time)})`);
      return;
    }

    const updated: Task = {
      ...selectedTask,
      ...editFormData,
      name: editFormData.name?.trim() || selectedTask.name,
    };
    await onUpdateTask(updated);
    setSelectedTask(updated);
    setIsEditingSelected(false);
  };

  // Generate Hour Markers and Sharp Tick Subdivisions
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let i = 0; i < 12; i++) {
      const hour = isAMPeriod ? 6 + i : (18 + i) % 24;
      const angle = i * 30 + 90;
      const rad = (angle * Math.PI) / 180;

      // Major Tick
      const x1 = center + (radius - 12) * Math.cos(rad);
      const y1 = center + (radius - 12) * Math.sin(rad);
      const x2 = center + (radius + 2) * Math.cos(rad);
      const y2 = center + (radius + 2) * Math.sin(rad);

      // Text Position
      const textX = center + (radius - 30) * Math.cos(rad);
      const textY = center + (radius - 30) * Math.sin(rad);

      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

      markers.push(
        <g key={`hour-${hour}`}>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="stroke-muted-foreground/80 dark:stroke-slate-400"
            strokeWidth="2.5"
          />
          <text
            x={textX}
            y={textY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-bold fill-foreground select-none pointer-events-none tracking-tight font-mono"
          >
            {displayHour}
          </text>
        </g>
      );

      // 15-min and 5-min Minor Sub-ticks
      for (let m = 1; m <= 11; m++) {
        const subAngle = angle + m * 2.5;
        const subRad = (subAngle * Math.PI) / 180;
        const isQuarter = m % 3 === 0;
        const tickLength = isQuarter ? 8 : 4;

        const sx1 = center + (radius - tickLength) * Math.cos(subRad);
        const sy1 = center + (radius - tickLength) * Math.sin(subRad);
        const sx2 = center + radius * Math.cos(subRad);
        const sy2 = center + radius * Math.sin(subRad);

        markers.push(
          <line
            key={`min-${hour}-${m}`}
            x1={sx1}
            y1={sy1}
            x2={sx2}
            y2={sy2}
            className={isQuarter ? 'stroke-muted-foreground/60' : 'stroke-muted-foreground/30'}
            strokeWidth={isQuarter ? '1.5' : '1'}
          />
        );
      }
    }
    return markers;
  }, [center, radius, isAMPeriod]);

  // Check live overlap conflict during drag
  const currentDragOverlap = useMemo(() => {
    if (!dragState) return null;
    if (dragState.type === 'create') {
      let s = dragState.startTime;
      let e = dragState.currentTime;
      const sM = timeStringToMinutes(s);
      const eM = timeStringToMinutes(e);
      if (sM > eM) {
        const cwDiff = (dragState.currentAngle - dragState.startAngle + 360) % 360;
        if (cwDiff > 180) {
          const tmp = s;
          s = e;
          e = tmp;
        }
      }
      return findOverlappingTask(s, e, tasks);
    }
    if (dragState.type === 'resize-start') {
      return findOverlappingTask(dragState.currentTime, dragState.task.end_time, tasks, dragState.task.id);
    }
    if (dragState.type === 'resize-end') {
      return findOverlappingTask(dragState.task.start_time, dragState.currentTime, tasks, dragState.task.id);
    }
    if (dragState.type === 'move-arc') {
      const s = minutesToTimeString(dragState.currentStartMinutes);
      const e = minutesToTimeString(dragState.currentStartMinutes + dragState.durationMinutes);
      return findOverlappingTask(s, e, tasks, dragState.task.id);
    }
    return null;
  }, [dragState, tasks]);

  // Current Live Pointer Angle & Reading
  const livePointerInfo = useMemo(() => {
    if (dragState) {
      if (dragState.type === 'create') {
        return {
          angle: dragState.currentAngle,
          time: dragState.currentTime,
          label: `Pointing at ${formatTime(dragState.currentTime)}`,
          snappedLabel: dragState.snappedLabel,
          secondary: `${formatTime(dragState.startTime)} → ${formatTime(dragState.currentTime)}`,
          overlap: currentDragOverlap,
        };
      }
      if (dragState.type === 'resize-start') {
        return {
          angle: dragState.currentAngle,
          time: dragState.currentTime,
          label: `New Start: ${formatTime(dragState.currentTime)}`,
          snappedLabel: dragState.snappedLabel,
          secondary: `End: ${formatTime(dragState.task.end_time)}`,
          overlap: currentDragOverlap,
        };
      }
      if (dragState.type === 'resize-end') {
        return {
          angle: dragState.currentAngle,
          time: dragState.currentTime,
          label: `New End: ${formatTime(dragState.currentTime)}`,
          snappedLabel: dragState.snappedLabel,
          secondary: `Start: ${formatTime(dragState.task.start_time)}`,
          overlap: currentDragOverlap,
        };
      }
      if (dragState.type === 'move-arc') {
        const start = minutesToTimeString(dragState.currentStartMinutes);
        const end = minutesToTimeString(dragState.currentStartMinutes + dragState.durationMinutes);
        const angle = timeToClockAngle(start, period) ?? 0;
        return {
          angle,
          time: start,
          label: `Shifted: ${formatTime(start)} – ${formatTime(end)}`,
          snappedLabel: null,
          secondary: formatDuration(dragState.durationMinutes),
          overlap: currentDragOverlap,
        };
      }
    }
    if (clockHover) {
      return {
        angle: clockHover.angle,
        time: clockHover.time,
        label: formatTime(clockHover.time),
        snappedLabel: clockHover.snappedLabel,
        secondary: isAMPeriod ? 'Daytime' : 'Nighttime',
        overlap: null,
      };
    }
    return null;
  }, [dragState, clockHover, period, isAMPeriod, currentDragOverlap]);

  // Render Drag-to-Create Sharp Preview Arc
  let previewArcElement = null;
  if (dragState && dragState.type === 'create') {
    const isClockwise =
      (dragState.currentAngle - dragState.startAngle + 360) % 360 <= 180;
    const startA = isClockwise ? dragState.startAngle : dragState.currentAngle;
    const endA = isClockwise ? dragState.currentAngle : dragState.startAngle;
    const d = describeArc(center, center, radius, startA, endA);
    const strokeColor = currentDragOverlap ? '#EF4444' : '#3B82F6';

    previewArcElement = (
      <g className="pointer-events-none">
        <path
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.9}
          className={`filter drop-shadow-[0_0_12px_${currentDragOverlap ? 'rgba(239,68,68,0.8)' : 'rgba(59,130,246,0.8)'}]`}
        />
        {/* Sharp start & end radial bars */}
        {(() => {
          const sRad = (startA * Math.PI) / 180;
          const eRad = (endA * Math.PI) / 180;
          const barHalf = strokeWidth / 2 + 3;
          return (
            <>
              <line
                x1={center + (radius - barHalf) * Math.cos(sRad)}
                y1={center + (radius - barHalf) * Math.sin(sRad)}
                x2={center + (radius + barHalf) * Math.cos(sRad)}
                y2={center + (radius + barHalf) * Math.sin(sRad)}
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
              <line
                x1={center + (radius - barHalf) * Math.cos(eRad)}
                y1={center + (radius - barHalf) * Math.sin(eRad)}
                x2={center + (radius + barHalf) * Math.cos(eRad)}
                y2={center + (radius + barHalf) * Math.sin(eRad)}
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
            </>
          );
        })()}
      </g>
    );
  }

  // Render Sharp Task Arcs with Radial Caliper Control Bars (No End Circles)
  const renderedTaskArcs = periodTasks.map((task) => {
    let startTime = task.start_time;
    let endTime = task.end_time;

    // Live update when dragging this task
    if (dragState && 'task' in dragState && dragState.task.id === task.id) {
      if (dragState.type === 'resize-start') {
        startTime = dragState.currentTime;
      } else if (dragState.type === 'resize-end') {
        endTime = dragState.currentTime;
      } else if (dragState.type === 'move-arc') {
        startTime = minutesToTimeString(dragState.currentStartMinutes);
        endTime = minutesToTimeString(
          dragState.currentStartMinutes + dragState.durationMinutes
        );
      }
    }

    // Clip to clock boundaries for standard display
    const startM = timeStringToMinutes(startTime);
    const endM = timeStringToMinutes(endTime);
    const sixAM = 360;
    const sixPM = 1080;

    let clippedStart = startTime;
    let clippedEnd = endTime;

    if (isAMPeriod) {
      if (startM < sixAM) clippedStart = '06:00';
      if (endM > sixPM) clippedEnd = '18:00';
    } else {
      if (startM > sixAM && startM < sixPM) clippedStart = '18:00';
      if (endM > sixAM && endM < sixPM && startM <= sixAM) clippedEnd = '06:00';
    }

    let startAngle = timeToClockAngle(clippedStart, period);
    let endAngle = timeToClockAngle(clippedEnd, period);

    // If rotating, follow the exact circumference smoothly
    if (dragState && dragState.type === 'move-arc' && dragState.task.id === task.id) {
      const origStart = timeToClockAngle(task.start_time, period) ?? 0;
      const origEnd = timeToClockAngle(task.end_time, period) ?? 0;
      startAngle = (origStart + dragState.currentAngleOffset + 360) % 360;
      endAngle = (origEnd + dragState.currentAngleOffset + 360) % 360;
    }

    if (startAngle === null || endAngle === null) return null;

    const pathData = describeArc(center, center, radius, startAngle, endAngle);
    const isSelected = selectedTask?.id === task.id;
    const isHovered = hoveredTaskId === task.id;

    // Sharp Radial Bar Positions (No End Circles)
    const barHalfLength = strokeWidth / 2 + 5;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const startBarInnerX = center + (radius - barHalfLength) * Math.cos(startRad);
    const startBarInnerY = center + (radius - barHalfLength) * Math.sin(startRad);
    const startBarOuterX = center + (radius + barHalfLength) * Math.cos(startRad);
    const startBarOuterY = center + (radius + barHalfLength) * Math.sin(startRad);

    const endBarInnerX = center + (radius - barHalfLength) * Math.cos(endRad);
    const endBarInnerY = center + (radius - barHalfLength) * Math.sin(endRad);
    const endBarOuterX = center + (radius + barHalfLength) * Math.cos(endRad);
    const endBarOuterY = center + (radius + barHalfLength) * Math.sin(endRad);

    // Pie chart style radial boundary line (from inner hub to outer circle)
    const innerRadius = radius - strokeWidth / 2 - 8;
    const outerRadius = radius + strokeWidth / 2 + 8;
    const pieLineStartInnerX = center + innerRadius * Math.cos(startRad);
    const pieLineStartInnerY = center + innerRadius * Math.sin(startRad);
    const pieLineStartOuterX = center + outerRadius * Math.cos(startRad);
    const pieLineStartOuterY = center + outerRadius * Math.sin(startRad);

    const pieLineEndInnerX = center + innerRadius * Math.cos(endRad);
    const pieLineEndInnerY = center + innerRadius * Math.sin(endRad);
    const pieLineEndOuterX = center + outerRadius * Math.cos(endRad);
    const pieLineEndOuterY = center + outerRadius * Math.sin(endRad);

    // Label Calculation
    let midAngle = startAngle + (endAngle - startAngle) / 2;
    if (endAngle < startAngle) {
      midAngle = (startAngle + (endAngle + 360)) / 2;
    }
    midAngle = midAngle % 360;
    const midRad = (midAngle * Math.PI) / 180;
    const arcX = center + radius * Math.cos(midRad);
    const arcY = center + radius * Math.sin(midRad);
    const anchor = Math.cos(midRad) >= 0 ? 'start' : 'end';

    return (
      <g key={task.id} className="group">
        {/* Generous invisible stroke for effortless clicking/dragging */}
        <path
          d={pathData}
          fill="none"
          stroke="transparent"
          strokeWidth={strokeWidth + 24}
          strokeLinecap="butt"
          className="cursor-pointer"
          onClick={(e) => handleTaskArcClick(e, task)}
          onPointerDown={(e) => handleMoveArcStart(e, task)}
          onMouseEnter={() => setHoveredTaskId(task.id)}
          onMouseLeave={() => setHoveredTaskId(null)}
        />

        {/* Selected / Hover Halo (Fixed size) */}
        {(isSelected || isHovered) && (
          <path
            d={pathData}
            fill="none"
            stroke={task.color}
            strokeWidth={strokeWidth + 8}
            strokeLinecap="butt"
            opacity={0.3}
            className="pointer-events-none"
          />
        )}

        {/* Sharp Visible Task Arc */}
        <path
          d={pathData}
          fill="none"
          stroke={task.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          className="pointer-events-none"
        />

        {/* Inner Radial Centerline */}
        <path
          d={pathData}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="butt"
          opacity={0.35}
          className="pointer-events-none"
        />

        {/* Pie Chart Style Radial Separator Lines (Shown when not editing/dragging) */}
        {!dragState && (
          <g className="pointer-events-none opacity-80">
            <line
              x1={pieLineStartInnerX}
              y1={pieLineStartInnerY}
              x2={pieLineStartOuterX}
              y2={pieLineStartOuterY}
              className="stroke-background dark:stroke-slate-950 opacity-70"
              strokeWidth="1.5"
            />
            <line
              x1={pieLineEndInnerX}
              y1={pieLineEndInnerY}
              x2={pieLineEndOuterX}
              y2={pieLineEndOuterY}
              className="stroke-background dark:stroke-slate-950 opacity-70"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* --- Sharp Start Radial Control Bar (Clean Bar, No End Circles) --- */}
        <g
          className="cursor-ew-resize"
          onPointerDown={(e) => handleStartResize(e, task)}
          onMouseEnter={() => setHoveredTaskId(task.id)}
          onMouseLeave={() => setHoveredTaskId(null)}
        >
          {/* Wide invisible hit line */}
          <line
            x1={startBarInnerX}
            y1={startBarInnerY}
            x2={startBarOuterX}
            y2={startBarOuterY}
            stroke="transparent"
            strokeWidth="28"
          />
          {/* Visible Sharp Radial Bar Needle */}
          <line
            x1={startBarInnerX}
            y1={startBarInnerY}
            x2={startBarOuterX}
            y2={startBarOuterY}
            stroke={isSelected || isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)'}
            strokeWidth={isSelected || isHovered ? '3.5' : '2.5'}
            className="pointer-events-none filter drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
          />
          {/* End Cap Pip */}
          {!showLabels && (<circle
            cx={startBarOuterX}
            cy={startBarOuterY}
            r="3"
            fill={task.color}
            stroke="#FFFFFF"
            strokeWidth="1.5"
            className="pointer-events-none"
          />)}
        </g>

        {/* --- Sharp End Radial Control Bar (Clean Bar, No End Circles) --- */}
        <g
          className="cursor-ew-resize"
          onPointerDown={(e) => handleEndResize(e, task)}
          onMouseEnter={() => setHoveredTaskId(task.id)}
          onMouseLeave={() => setHoveredTaskId(null)}
        >
          {/* Wide invisible hit line */}
          <line
            x1={endBarInnerX}
            y1={endBarInnerY}
            x2={endBarOuterX}
            y2={endBarOuterY}
            stroke="transparent"
            strokeWidth="28"
          />
          {/* Visible Sharp Radial Bar Needle */}
          <line
            x1={endBarInnerX}
            y1={endBarInnerY}
            x2={endBarOuterX}
            y2={endBarOuterY}
            stroke={isSelected || isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)'}
            strokeWidth={isSelected || isHovered ? '3.5' : '2.5'}
            className="pointer-events-none filter drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
          />
          {/* End Cap Pip */}
          {!showLabels && (<circle
            cx={endBarOuterX}
            cy={endBarOuterY}
            r="3"
            fill={task.color}
            stroke="#FFFFFF"
            strokeWidth="1.5"
            className="pointer-events-none"
          />)}
        </g>

        {/* Outer Arc Label */}
        {showLabels && (
          <g className="pointer-events-none">
            {(() => {
              const elbowRadius = radius + (isMobile ? 14 : 16);
              const elbowX = center + elbowRadius * Math.cos(midRad);
              const elbowY = center + elbowRadius * Math.sin(midRad);
              const horizontalGap = isMobile ? 24 : 56;
              const labelXFinal =
                anchor === 'start' ? elbowX + horizontalGap : elbowX - horizontalGap;
              const labelYFinal = elbowY;
              const maxCharLen = isMobile ? 14 : 22;
              const displayName =
                task.name.length > maxCharLen
                  ? task.name.slice(0, maxCharLen - 2) + '…'
                  : task.name;

              return (
                <g>
                  <line
                    x1={arcX}
                    y1={arcY}
                    x2={elbowX}
                    y2={elbowY}
                    stroke={task.color}
                    strokeWidth={1}
                    opacity={0.8}
                  />
                  <line
                    x1={elbowX}
                    y1={elbowY}
                    x2={labelXFinal}
                    y2={labelYFinal}
                    stroke={task.color}
                    strokeWidth={1}
                    opacity={0.7}
                  />
                  <text
                    x={labelXFinal + (anchor === 'start' ? (isMobile ? 5 : 6) : isMobile ? -5 : -6)}
                    y={labelYFinal}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    className="text-[11px] font-bold fill-foreground select-none"
                  >
                    {displayName}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </g>
    );
  });

  // Live Radial Needle Indicator
  let liveNeedleElement = null;
  if (livePointerInfo) {
    const rad = (livePointerInfo.angle * Math.PI) / 180;
    const nx = center + radius * Math.cos(rad);
    const ny = center + radius * Math.sin(rad);

    liveNeedleElement = (
      <g className="pointer-events-none">
        {/* Radial Guide Needle */}
        <line
          x1={center}
          y1={center}
          x2={nx}
          y2={ny}
          stroke={activeTool === 'split' ? '#EF4444' : livePointerInfo.overlap ? '#EF4444' : '#3B82F6'}
          strokeWidth="1.5"
          strokeDasharray="3,3"
          opacity={0.85}
        />
        {/* Needle Tip Pip */}
        <circle
          cx={nx}
          cy={ny}
          r="4"
          fill={activeTool === 'split' ? '#EF4444' : livePointerInfo.overlap ? '#EF4444' : '#3B82F6'}
          stroke="#FFFFFF"
          strokeWidth="1.5"
          className="filter drop-shadow-[0_0_6px_rgba(59,130,246,0.9)]"
        />
      </g>
    );
  }

  return (
    <div className="flex flex-col items-center glass-card p-4 sm:p-6 w-full max-w-[420px] mx-auto shadow-lg relative transition-colors duration-200">
      {/* Clock Header & Interactive Toolbar */}
      <div className="w-full flex flex-wrap items-center gap-2 justify-between mb-2 px-1">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">{period}</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isAMPeriod ? 'Day (06:00 – 18:00)' : 'Night (18:00 – 06:00)'}
          </p>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1 bg-muted/70 rounded-xl p-1 border border-border">
          <Button
            size="sm"
            variant={activeTool === 'draw' ? 'default' : 'ghost'}
            onClick={() => setActiveTool('draw')}
            className={`h-7 px-2 sm:px-2.5 text-xs font-medium ${activeTool === 'draw'
              ? 'shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
            title="Draw range on circle or drag control bars"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Draw
          </Button>

          <Button
            size="sm"
            variant={activeTool === 'split' ? 'destructive' : 'ghost'}
            onClick={() => setActiveTool((prev) => (prev === 'split' ? 'draw' : 'split'))}
            className={`h-7 px-2 sm:px-2.5 text-xs font-medium ${activeTool === 'split'
              ? 'shadow-sm'
              : 'text-muted-foreground hover:text-destructive'
              }`}
            title="Cut task arc directly at pointer time"
          >
            <Scissors className="w-3.5 h-3.5 mr-1" />
            Split
          </Button>

          {/* Magnetic Snap Toggle */}
          <button
            onClick={() => setMagneticSnap((prev) => !prev)}
            className={`h-7 px-2 text-xs rounded-lg flex items-center gap-1 transition-all ${magneticSnap
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
              }`}
            title="Magnetically snaps to ends and starts of neighboring tasks"
          >
            <Magnet className="w-3 h-3" />
            <span className="hidden sm:inline">Snap: Task Ends</span>
            <span className="sm:hidden">Snap</span>
          </button>

          {/* Minute Snap Toggle */}
          <button
            onClick={() => setSnapMinutes((prev) => (prev === 5 ? 15 : prev === 15 ? 1 : 5))}
            className="text-[11px] px-2 py-1 rounded-lg bg-background text-foreground hover:bg-accent border border-border font-mono transition-colors"
            title="Toggle time snapping precision (1m / 5m / 15m)"
          >
            {snapMinutes}m
          </button>
        </div>
      </div>

      {/* Live Pointer HUD */}
      <div className="w-full flex items-center justify-between min-h-[32px] px-3 py-1 mb-2 rounded-lg bg-muted/40 border border-border/60">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${livePointerInfo?.overlap
              ? 'bg-red-500 animate-pulse'
              : livePointerInfo
                ? 'bg-primary animate-pulse'
                : 'bg-muted-foreground/40'
              }`}
          />
          <span
            className={`text-xs font-mono font-bold truncate ${livePointerInfo?.overlap ? 'text-red-500 dark:text-red-400' : 'text-foreground'
              }`}
          >
            {livePointerInfo ? livePointerInfo.label : 'Hover or drag clock circumference'}
          </span>
          {livePointerInfo?.secondary && (
            <span className="text-[11px] text-muted-foreground font-mono truncate hidden sm:inline">
              ({livePointerInfo.secondary})
            </span>
          )}
        </div>

        {/* Live Overlap or Magnetic Snap Badge */}
        {livePointerInfo?.overlap ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/30 animate-pulse flex items-center gap-1 shrink-0">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="truncate max-w-[110px] sm:max-w-[160px]">Overlaps with "{livePointerInfo.overlap.name}"</span>
          </span>
        ) : livePointerInfo?.snappedLabel ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 animate-pulse flex items-center gap-1 shrink-0">
            <Magnet className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{livePointerInfo.snappedLabel}</span>
          </span>
        ) : null}
      </div>

      {/* Main Interactive SVG Canvas */}
      <div className="relative select-none my-1 w-full flex justify-center">
        <svg
          ref={svgRef}
          viewBox={isMobile ? "-60 -15 500 410" : "0 0 380 380"}
          className={`w-full max-w-[380px] sm:max-w-[400px] h-auto aspect-square overflow-visible touch-none select-none mx-auto ${activeTool === 'split'
            ? 'cursor-cell'
            : dragState?.type === 'move-arc'
              ? 'cursor-grabbing'
              : 'cursor-crosshair'
            }`}
          onPointerDown={handleRingPointerDown}
          onPointerMove={(e) => {
            initDragCenter();
            const res = calculateTimeFromClientPos(e.clientX, e.clientY);
            setClockHover({
              angle: res.angle,
              time: res.time,
              snappedLabel: res.snappedLabel,
            });
          }}
          onPointerLeave={() => setClockHover(null)}
        >
          {/* Outer Ring Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-border dark:stroke-muted/60"
            strokeWidth={strokeWidth}
          />

          {/* Generous invisible wide stroke for easy circumference dragging */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="transparent"
            strokeWidth={strokeWidth + 28}
            className="cursor-crosshair"
          />
          {/* TODO*/}
          {/* Inner Decorative Dashed Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth - 6}
            className="fill-muted/0 stroke-border/90 "
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Hour & Minute Markers */}
          {hourMarkers}

          {/* Rendered Task Arcs with Sharp Edges and Radial Control Bars */}
          {renderedTaskArcs}

          {/* Active Drag-to-Create Arc Preview */}
          {previewArcElement}

          {/* Live Radial Guide Needle */}
          {liveNeedleElement}

          {/* Center Hub Indicator */}
          <circle
            cx={center}
            cy={center}
            r="7"
            className="fill-primary shadow-md "
          />
          <circle cx={center} cy={center} r="2.5" className="fill-background" />
        </svg>
      </div>

      {/* Helper Footer Tips */}
      <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground px-2 mt-2 select-none border-t border-border/60 pt-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>
            {activeTool === 'draw'
              ? 'Drag radial bars to set time • Pie lines show task partitions'
              : 'Click on any task arc to slice it at pointer time'}
          </span>
        </div>
      </div>

      {/* Selected Task Details & Actions Card */}
      {selectedTask && (
        <div className="w-full mt-4 p-4 rounded-xl bg-card border border-border shadow-xl text-card-foreground animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full border border-border"
                style={{
                  backgroundColor: isEditingSelected
                    ? editFormData.color || selectedTask.color
                    : selectedTask.color,
                }}
              />
              <h4 className="text-sm font-bold text-foreground">
                {isEditingSelected ? 'Edit Task' : selectedTask.name}
              </h4>
              {selectedTask.category && !isEditingSelected && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-secondary-foreground">
                  {selectedTask.category}
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedTask(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isEditingSelected ? (
            <div className="space-y-3 pt-1">
              <div>
                <Label className="text-xs text-muted-foreground">Task Title</Label>
                <Input
                  value={editFormData.name || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="h-8 text-xs bg-background border-input text-foreground mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <Input
                    type="time"
                    value={editFormData.start_time || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, start_time: e.target.value })
                    }
                    className="h-8 text-xs bg-background border-input text-foreground mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Input
                    type="time"
                    value={editFormData.end_time || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, end_time: e.target.value })
                    }
                    className="h-8 text-xs bg-background border-input text-foreground mt-1"
                  />
                </div>
              </div>

              {/* Edit Overlap Warning */}
              {editSelectedOverlapConflict && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>
                    Overlaps with "{editSelectedOverlapConflict.name}" (
                    {formatTime(editSelectedOverlapConflict.start_time)} –{' '}
                    {formatTime(editSelectedOverlapConflict.end_time)})
                  </span>
                </div>
              )}

              {/* Color picker */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Color</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, color: c })}
                      className={`h-5 rounded-full border transition-all ${editFormData.color === c
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                        }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveSelectedEdit}
                  disabled={!!editSelectedOverlapConflict}
                  className="h-7 text-xs flex-1 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingSelected(false)}
                  className="h-7 text-xs border-border text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-3">
                {formatTime(selectedTask.start_time)} – {formatTime(selectedTask.end_time)} (
                {formatDuration(
                  getTaskDuration(selectedTask.start_time, selectedTask.end_time)
                )}
                )
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingSelected(true)}
                  className="h-7 px-2.5 text-xs text-foreground border-border"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>

                {onSplitTask && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const startM = timeStringToMinutes(selectedTask.start_time);
                      const dur = getTaskDuration(
                        selectedTask.start_time,
                        selectedTask.end_time
                      );
                      const midM = (startM + Math.floor(dur / 2)) % 1440;
                      onSplitTask(selectedTask, minutesToTimeString(midM));
                      setSelectedTask(null);
                    }}
                    className="h-7 px-2.5 text-xs text-foreground border-border"
                  >
                    <Scissors className="w-3 h-3 mr-1" />
                    Split in Half
                  </Button>
                )}

                {onDeleteTask && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await onDeleteTask(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Task Creation Modal */}
      {quickCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Create Task</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(newTaskData.start_time)} – {formatTime(newTaskData.end_time)}{' '}
                    (
                    {formatDuration(
                      getTaskDuration(newTaskData.start_time, newTaskData.end_time)
                    )}
                    )
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground font-medium">Task Name</Label>
                <Input
                  autoFocus
                  required
                  placeholder="e.g. Deep Work, Gym, Reading"
                  value={newTaskData.name}
                  onChange={(e) =>
                    setNewTaskData({ ...newTaskData, name: e.target.value })
                  }
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground mt-1"
                />
              </div>

              {/* Quick Category Chips */}
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                  Category
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setNewTaskData({ ...newTaskData, category: cat })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${newTaskData.category === cat
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Start Time</Label>
                  <Input
                    type="time"
                    value={newTaskData.start_time}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, start_time: e.target.value })
                    }
                    className="bg-background border-input text-foreground mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">End Time</Label>
                  <Input
                    type="time"
                    value={newTaskData.end_time}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, end_time: e.target.value })
                    }
                    className="bg-background border-input text-foreground mt-1"
                  />
                </div>
              </div>

              {/* Quick Create Overlap Conflict Warning */}
              {quickCreateOverlapConflict && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>
                    Cannot create: Overlaps with existing task "
                    {quickCreateOverlapConflict.name}" (
                    {formatTime(quickCreateOverlapConflict.start_time)} –{' '}
                    {formatTime(quickCreateOverlapConflict.end_time)})
                  </span>
                </div>
              )}

              {/* Color Picker */}
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-2 block">
                  Color Tag
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTaskData({ ...newTaskData, color })}
                      className={`h-7 rounded-lg border-2 transition-all ${newTaskData.color === color
                        ? 'border-primary scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!!quickCreateOverlapConflict}
                  className="flex-1 font-semibold disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Task
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickCreateOpen(false)}
                  className="border-border text-foreground hover:bg-accent"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}