# Multiple Timetables Feature

## Overview

The application now supports multiple timetables, allowing users to create separate schedules for different purposes (e.g., work schedule, personal schedule, study schedule, etc.). Each timetable has its own set of tasks, and users can easily switch between them.

## Features Added

### 1. Multiple Timetables
- Create unlimited timetables with custom names, descriptions, and colors
- Each timetable maintains its own separate set of tasks
- Default timetable is automatically created for new users

### 2. Timetable Management
- **Create**: Add new timetables with custom properties
- **Edit**: Modify timetable name, description, and color
- **Copy**: Duplicate a timetable along with all its tasks
- **Delete**: Remove timetables (except default ones)
- **Switch**: Easily switch between different timetables

### 3. Copy Functionality
- Complete timetable duplication including all tasks
- Automatically generates new unique IDs for copied tasks
- Preserves all task properties (time, color, category, etc.)

## Database Schema Changes

### Timetable Model
```typescript
interface ITimetable {
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
```

### Task Model Updates
```typescript
interface ITask {
  // ... existing fields
  timetable_id: string; // NEW: Links task to specific timetable
}
```

## API Endpoints

### Timetables
- `GET /api/timetables` - Fetch all timetables
- `POST /api/timetables` - Create new timetable
- `PUT /api/timetables` - Update existing timetable
- `DELETE /api/timetables?id={id}` - Delete timetable
- `POST /api/timetables/copy` - Copy timetable with all tasks

### Tasks (Updated)
- `GET /api/tasks?timetableId={id}` - Fetch tasks for specific timetable
- Task CRUD operations now require `timetable_id`

## Components Added

### TimetableManager
Main component for managing timetables with grid layout showing all available timetables.

### TimetableCard
Individual timetable display with:
- Visual indicators (color, name, description)
- Task count display
- Action menu (edit, copy, delete)
- Selection state

### TimetableForm
Modal form for creating/editing timetables with:
- Name and description inputs
- Color picker with presets
- Form validation

## User Experience

### Navigation
1. **Timetables Tab**: Primary entry point to manage timetables
2. **Automatic Selection**: Default or first timetable is auto-selected
3. **Context Switching**: All other tabs (Clocks, Tasks, Analytics) show data for selected timetable
4. **Clear Indicators**: Selected timetable name shown in header

### Workflow
1. Start in Timetables view to select or create timetables
2. Switch to Clocks/Tasks/Analytics to work with selected timetable
3. Use copy feature to duplicate existing schedules
4. Create specialized timetables for different life areas

## Data Migration

Existing tasks will need to be migrated to include `timetable_id`:
- Create a default timetable if none exists
- Assign all existing tasks to the default timetable
- This maintains backward compatibility

## Local Storage Fallback

The application maintains localStorage fallback for offline functionality:
- Timetables stored in `timify-timetables`
- Tasks filtered by `timetable_id` when retrieved
- Copy functionality implemented in client-side fallback

## Benefits

1. **Organization**: Separate work, personal, and other schedules
2. **Flexibility**: Easy switching between different life contexts
3. **Templates**: Use copy feature to create schedule templates
4. **Scalability**: Unlimited timetables for different purposes
5. **Data Isolation**: Tasks are properly isolated between timetables
