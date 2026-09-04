# Timify Dashboard

A time tracking dashboard built with Next.js, React, TypeScript, and MongoDB.

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- MongoDB (Community Edition or MongoDB Atlas)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Update `.env.local` with your MongoDB connection string

### Environment Variables

The project uses MongoDB as the database:

```env
MONGODB_URI=mongodb://localhost:27017/timify
JWT_SECRET=your-super-secret-jwt-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here
```

### Database Setup (MongoDB)

#### Local MongoDB Setup:
1. Install MongoDB Community Edition from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   ```bash
   net start MongoDB
   ```
3. The database `timify` and `tasks` collection will be created automatically

#### MongoDB Atlas (Cloud):
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string and update `MONGODB_URI` in `.env.local`

For detailed MongoDB setup instructions, see `MONGODB_SETUP.md`

### Running the Application

#### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build
```bash
npm run build
npm start
```

#### Static Export
To create a static export (note: this disables server-side features):
1. Uncomment `output: 'export'` in `next.config.js`
2. Run `npm run build`

## Features

- **Time Tracking**: Visual circular clock interface
- **Task Management**: Add, edit, delete, and split tasks
- **Analytics**: View time tracking statistics and charts
- **MongoDB Integration**: Robust database storage with automatic failover to localStorage
- **API Routes**: RESTful API for task operations (GET, POST, PUT, DELETE)
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Automatic task synchronization

## API Endpoints

- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks` - Update an existing task
- `DELETE /api/tasks?id={taskId}` - Delete a task
- `GET /api/health` - Check MongoDB connection status

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── tasks/          # Task API endpoints
│   │   └── health/         # Database health check
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── ui/                # UI components (shadcn/ui)
│   └── *.tsx              # Main application components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
│   ├── mongodb.ts         # MongoDB connection
│   └── taskService.ts     # Task service layer
├── models/                # Mongoose models
│   └── Task.ts           # Task schema definition
└── .env.local            # Environment variables
```

## Dependencies Optimized

- **mongoose**: MongoDB object modeling for Node.js
- **date-fns**: Modern JavaScript date utility library (v3.6.0 for compatibility)
- All peer dependency conflicts resolved

## Troubleshooting

### Dependency Conflicts
If you encounter dependency conflicts, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Not Loading
- Ensure `.env.local` is in the project root
- Restart the development server after changing environment variables

### MongoDB Connection Issues
1. **Check if MongoDB is running**:
   ```bash
   net start MongoDB
   ```
2. **Test connection**: Visit `http://localhost:3000/api/health`
3. **Check MongoDB logs** for connection errors
4. **Verify port 27017** is not blocked by firewall
5. **Fallback**: The app will use localStorage if MongoDB is unavailable

### Common MongoDB Errors
- **Connection refused**: MongoDB service is not running
- **Authentication failed**: Check connection string credentials
- **Database not found**: Database will be created automatically on first write
