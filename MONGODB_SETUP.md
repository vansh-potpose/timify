# MongoDB Setup and Start Guide

## Prerequisites
1. Install MongoDB Community Edition
   - Windows: Download from https://www.mongodb.com/try/download/community
   - Or use MongoDB Compass for a GUI interface

## Starting MongoDB

### Option 1: Using MongoDB Service (Recommended)
```bash
# Start MongoDB service
net start MongoDB

# Stop MongoDB service  
net stop MongoDB
```

### Option 2: Manual Start
```bash
# Navigate to MongoDB bin directory (usually)
cd "C:\Program Files\MongoDB\Server\7.0\bin"

# Start MongoDB server
mongod --dbpath "C:\data\db"
```

### Option 3: Using MongoDB Compass
1. Download and install MongoDB Compass
2. It will automatically start a local MongoDB instance

## Verify Connection
Once MongoDB is running, you can test the connection by visiting:
http://localhost:3000/api/health

## Default Configuration
- Host: localhost
- Port: 27017
- Database: timify

## Troubleshooting
1. Ensure MongoDB service is running
2. Check if port 27017 is available
3. Verify the database directory exists and has proper permissions
4. Check MongoDB logs for any error messages
