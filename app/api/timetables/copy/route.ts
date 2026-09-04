import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import Task from '@/models/Task';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { sourceTimetableId, newName } = body;
    
    if (!sourceTimetableId || !newName) {
      return NextResponse.json(
        { error: 'Source timetable ID and new name are required' },
        { status: 400 }
      );
    }
    
    // Find the source timetable
    const sourceTimetable = await Timetable.findOne({ id: sourceTimetableId });
    if (!sourceTimetable) {
      return NextResponse.json(
        { error: 'Source timetable not found' },
        { status: 404 }
      );
    }
    
    // Create new timetable
    const newTimetableId = Math.random().toString(36).substr(2, 9);
    const newTimetable = new Timetable({
      id: newTimetableId,
      name: newName,
      description: sourceTimetable.description,
      color: sourceTimetable.color,
      user_id: sourceTimetable.user_id,
      is_default: false
    });
    
    await newTimetable.save();
    
    // Copy all tasks from source timetable to new timetable
    const sourceTasks = await Task.find({ timetable_id: sourceTimetableId });
    
    const newTasks = sourceTasks.map(task => ({
      id: Math.random().toString(36).substr(2, 9),
      name: task.name,
      start_time: task.start_time,
      end_time: task.end_time,
      color: task.color,
      category: task.category,
      user_id: task.user_id,
      timetable_id: newTimetableId
    }));
    
    if (newTasks.length > 0) {
      await Task.insertMany(newTasks);
    }
    
    return NextResponse.json({
      timetable: newTimetable,
      copiedTasksCount: newTasks.length
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error copying timetable:', error);
    return NextResponse.json(
      { error: 'Failed to copy timetable' },
      { status: 500 }
    );
  }
}
