import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  _id: string;
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  category?: string;
  created_at: Date;
  user_id?: string;
  timetable_id: string;
}

const TaskSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  start_time: {
    type: String,
    required: true
  },
  end_time: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true,
    default: '#3b82f6'
  },
  category: {
    type: String,
    required: false,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  user_id: {
    type: String,
    required: false
  },
  timetable_id: {
    type: String,
    required: true
  }
});

// Add indexes for better performance
TaskSchema.index({ start_time: 1 });
TaskSchema.index({ user_id: 1 });
TaskSchema.index({ created_at: -1 });
TaskSchema.index({ timetable_id: 1 });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
