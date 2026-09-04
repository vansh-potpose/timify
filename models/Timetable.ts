import mongoose, { Schema, Document } from 'mongoose';

export interface ITimetable extends Document {
  _id: string;
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: Date;
  updated_at: Date;
  user_id?: string;
  is_default: boolean;
}

const TimetableSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substr(2, 9)
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: '#3b82f6'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  user_id: {
    type: String,
    required: false
  },
  is_default: {
    type: Boolean,
    default: false
  }
});

// Add indexes for better performance
TimetableSchema.index({ user_id: 1 });
TimetableSchema.index({ created_at: -1 });
TimetableSchema.index({ is_default: 1 });

// Update the updated_at field before saving
TimetableSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema);
