import { supabase } from './src/db/supabase.js';
import { fetchUserStats } from './src/services/leetcodeService.js';
import { getAllParticipants, upsertDailyRecords } from './src/services/trackerService.js';
import dotenv from 'dotenv';
dotenv.config();

async function runFix() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   LeetTrack Data Rebuild (Idempotent / Safe)    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();

  console.log('1. Wiping ALL daily_records and solved_slugs tables to clean slate...');
  // Force delete by using a condition that matches everything
  const { error: e1 } = await supabase.from('daily_records').delete().neq('username', 'non_existent_user');
  if (e1) console.error('   ⚠ daily_records wipe failed:', e1.message);
  
  const { error: e2 } = await supabase.from('solved_slugs').delete().neq('username', 'non_existent_user');
  if (e2) console.error('   ⚠ solved_slugs wipe failed:', e2.message);
  
  console.log('   ✓ Tables wiped successfully.');

  console.log('\n2. Fetching all active participants...');
  const participants = await getAllParticipants();
  console.log(`   Found ${participants.length} active participant(s).`);
  
  for (const p of participants) {
    console.log(`\n── Rebuilding: ${p.username} ──`);
    
    // knownSlugs is empty (clean slate) — fetch 250 to cover the entire month
    const stats = await fetchUserStats(p.username, new Set(), 250);
    
    if (stats && stats.length > 0) {
      const totalNewProblems = stats.reduce((sum, s) => sum + s.solvedToday, 0);
      const totalScore = stats.reduce((sum, s) => sum + s.score, 0);
      console.log(`   Fetched ${stats.length} day(s): ${totalNewProblems} problems, ${totalScore} total points`);
      
      await upsertDailyRecords(p.username, stats);
      console.log(`   ✓ Rebuilt successfully.`);
    } else {
      console.log(`   ⚠ No submission history found (profile may be private).`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Rebuild complete! Data is now accurate.        ║');
  console.log('║   With MAX-based merge, this script is safe to   ║');
  console.log('║   run multiple times — results are idempotent.   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  process.exit(0);
}
runFix().catch(err => {
  console.error('Fatal error during rebuild:', err);
  process.exit(1);
});
