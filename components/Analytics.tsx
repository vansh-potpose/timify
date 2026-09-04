// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Task } from '@/lib/taskService';
import { getTaskDuration, formatDuration } from '@/lib/time-utils';
import { Button } from '@/components/ui/button';

interface AnalyticsProps {
  tasks: Task[];
}

export default function Analytics({ tasks }: AnalyticsProps) {
  const [groupBy, setGroupBy] = useState<'title' | 'category'>('title');
  
  // Group tasks based on selected option
  const getGroupedData = () => {
    if (groupBy === 'category') {
      // Group by category
      const categoryMap = new Map<string, { duration: number, color: string, tasks: Task[] }>();
      
      tasks.forEach(task => {
        const category = task.category || 'Uncategorized';
        const duration = getTaskDuration(task.start_time, task.end_time);
        
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          existing.duration += duration;
          existing.tasks.push(task);
        } else {
          categoryMap.set(category, { 
            duration, 
            color: task.color, 
            tasks: [task] 
          });
        }
      });
      
      return Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        duration: data.duration,
        color: data.color,
        formattedDuration: formatDuration(data.duration),
        taskCount: data.tasks.length
      }));
    } else {
      // Group by individual task title (original behavior)
      return tasks.map(task => ({
        name: task.name,
        duration: getTaskDuration(task.start_time, task.end_time),
        color: task.color,
        formattedDuration: formatDuration(getTaskDuration(task.start_time, task.end_time)),
        taskCount: 1
      }));
    }
  };

  const chartData = getGroupedData();

  const totalDuration = chartData.reduce((sum, item) => sum + item.duration, 0);
  const totalFormatted = formatDuration(totalDuration);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg border border-border shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-primary font-mono text-sm">
            {data.formattedDuration} ({Math.round((data.duration / totalDuration) * 100)}%)
          </p>
          {groupBy === 'category' && data.taskCount > 1 && (
            <p className="text-muted-foreground text-xs">{data.taskCount} tasks</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6 border border-border shadow-sm rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-foreground">Time Distribution</h3>
        <div className="flex gap-2">
          <Button
            variant={groupBy === 'title' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('title')}
            className="text-xs"
          >
            By Task
          </Button>
          <Button
            variant={groupBy === 'category' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('category')}
            className="text-xs"
          >
            By Category
          </Button>
        </div>
      </div>
      
      {tasks.length === 0 ? (
        <div className="text-muted-foreground text-center py-8">
          Add tasks to see analytics
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Total scheduled time: <span className="text-primary font-semibold font-mono">{totalFormatted}</span>
            </p>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="duration"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0 border border-border/50"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-foreground truncate">{item.name}</span>
                  {groupBy === 'category' && item.taskCount > 1 && (
                    <span className="text-xs text-muted-foreground shrink-0">({item.taskCount} tasks)</span>
                  )}
                </div>
                <span className="text-muted-foreground font-mono shrink-0 ml-2">{item.formattedDuration}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}