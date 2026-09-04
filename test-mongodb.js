/**
 * MongoDB Connection Test Script
 * Run this to verify MongoDB is working properly
 */

import connectToDatabase from './lib/mongodb.js';
import Task from './models/Task.js';

async function testMongoDB() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    // Test connection
    await connectToDatabase();
    console.log('✅ MongoDB connected successfully!');
    
    // Test creating a sample task
    const sampleTask = new Task({
      name: 'Test Task',
      start_time: '09:00',
      end_time: '10:00',
      color: '#3b82f6'
    });
    
    await sampleTask.save();
    console.log('✅ Sample task created successfully!');
    
    // Test retrieving tasks
    const tasks = await Task.find({});
    console.log(`✅ Found ${tasks.length} task(s) in database`);
    
    // Clean up test task
    await Task.findByIdAndDelete(sampleTask._id);
    console.log('✅ Test task cleaned up');
    
    console.log('\n🎉 All MongoDB tests passed! Your database is ready to use.');
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error.message);
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. Make sure MongoDB is running: net start MongoDB');
    console.log('2. Check your .env.local file has the correct MONGODB_URI');
    console.log('3. Verify MongoDB is accessible on localhost:27017');
  }
}

testMongoDB();
