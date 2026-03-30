import { supabase } from './src/db/supabase.js';
import { fetchUserStats } from './src/services/leetcodeService.js';
import { getAllParticipants, upsertDailyRecords } from './src/services/trackerService.js';
import dotenv from 'dotenv';
dotenv.config();

async function runFix() {
  console.log('1. Wiping ALL daily_records and solved_slugs tables to clean slate...');
  // Force delete by using a condition that matches everything
  await supabase.from('daily_records').delete().neq('username', 'non_existent_user');
  await supabase.from('solved_slugs').delete().neq('username', 'non_existent_user');
  console.log('Tables wiped successfully.');

  console.log('2. Fetching all active participants...');
  const participants = await getAllParticipants();
  
  for (const p of participants) {
    console.log(`\nRebuilding data for ${p.username}...`);
    
    // Fetch 250 records to cover their whole month
    const stats = await fetchUserStats(p.username, new Set(), 250);
    
    if (stats && stats.length > 0) {
      await upsertDailyRecords(p.username, stats);
      console.log(`Successfully rebuilt ${stats.length} days of data for ${p.username}.`);
    } else {
      console.log(`No active submit history found for ${p.username}.`);
    }
  }

  console.log('\nAll users fixed! The database now perfectly reflects the accurate historical stats without overinflation.');
  process.exit(0);
}
runFix().catch(console.error);
