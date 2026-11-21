import { closeDb, connectToDb } from './connect.js';
import { initializeDatabase } from './initialize.js';
import { Role } from '../models/schemas/roles.js';
import { User } from '../models/schemas/users.js';

try {
  const db = await connectToDb();
  await initializeDatabase(db);
  // Create collections and their unique indexes.
  await Role.init();
  await User.init();

  // Add missing roles while preserving existing role IDs.
  for (const name of ['customer', 'admin']) {
    await Role.updateOne(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, runValidators: true }
    );
  }
  console.log('MongoDB import complete.');
} finally {
  await closeDb();
}
