import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Timetable from '@/models/Timetable';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const timetables = await Timetable.find({}).sort({ created_at: -1 });
    return NextResponse.json(timetables);
  } catch (error) {
    console.error('Error fetching timetables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const timetable = new Timetable(body);
    await timetable.save();
    
    return NextResponse.json(timetable, { status: 201 });
  } catch (error) {
    console.error('Error creating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to create timetable' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const updatedTimetable = await Timetable.findOneAndUpdate(
      { id: body.id },
      { ...body, updated_at: new Date() },
      { new: true }
    );
    
    if (!updatedTimetable) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedTimetable);
  } catch (error) {
    console.error('Error updating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to update timetable' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }
    
    const deletedTimetable = await Timetable.findOneAndDelete({ id });
    
    if (!deletedTimetable) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable:', error);
    return NextResponse.json(
      { error: 'Failed to delete timetable' },
      { status: 500 }
    );
  }
}
