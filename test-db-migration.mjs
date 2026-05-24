#!/usr/bin/env node
import { createDatabaseWrapper } from './server/utils/database.ts';

try {
  console.log('🔄 Initializing SQLite database wrapper...');
  const db = createDatabaseWrapper();

  console.log('✓ Database wrapper created successfully');

  // Test a simple query
  const hackathon = db.prepare('SELECT * FROM hackathon').first();
  console.log('✓ Test query successful');

  if (hackathon) {
    console.log('📊 Hackathon data found:', {
      id: hackathon.id,
      name: hackathon.name,
    });
  } else {
    console.log('ℹ No hackathon data in database yet');
  }

  // Count users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').first();
  console.log(`👥 Total users: ${userCount.count}`);

  // Count teams
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').first();
  console.log(`🏢 Total teams: ${teamCount.count}`);

  console.log('\n✅ All tests passed! Database migration successful.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
