const db = require('../db');

module.exports = {
    execute: (job) => {
        // Show which attempt this is
        console.log(`🐍 [Worker 4 - Go] Starting job #${job.id} for ${job.repo_name} (Attempt ${job.retry_count + 1})`);
        
        const executionTime = Math.floor(Math.random() * 5000) + 3000;
        const MAX_RETRIES = 2; // Allow up to 2 retries (3 total attempts)
        
        setTimeout(() => {
            // Simulated 30% chance of failure so we can see retries in action
            const isSuccess = Math.random() > 0.30; 
            
            if (isSuccess) {
                // If it succeeds, mark as success
                db.run(`UPDATE jobs SET status = 'success' WHERE id = ?`, [job.id]);
                console.log(`🐍 [Worker 4 - Go] Finished job #${job.id} -> ✅ SUCCESS`);
                console.log(`✅ [MASTER LOG] Job #${job.id} for ${job.repo_name} has officially COMPLETED.`);
            } else {
                // If it fails, check if we can retry
                if (job.retry_count < MAX_RETRIES) {
                    // Put it back in the queue and increment the retry count
                    db.run(`UPDATE jobs SET status = 'pending', retry_count = retry_count + 1 WHERE id = ?`, [job.id]);
                    console.log(`🐍 [Worker 4 - Go] Job #${job.id} failed. 🔄 Returning to queue for retry...`);
                } else {
                    // Max retries reached, mark as permanently failed
                    db.run(`UPDATE jobs SET status = 'failed' WHERE id = ?`, [job.id]);
                    console.log(`🐍 [Worker 4 - Go] Finished job #${job.id} -> ❌ FAILED (Max retries reached)`);
                }
            }
        }, executionTime);
    }
};