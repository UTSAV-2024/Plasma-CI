const db = require('../db');

// --- NEW: Track worker load ---
let activeJobs = 0;
const MAX_CAPACITY = 2; // This worker can only handle 2 jobs at a time

module.exports = {
    // New function for the scheduler to check if worker is full
    isBusy: () => activeJobs >= MAX_CAPACITY,

    execute: async (job, updateStageStatus, sleep) => {
        activeJobs++; // Job started, increase load!
        console.log(`🐍 [Worker 4] Starting job #${job.id} (Active jobs: ${activeJobs}/${MAX_CAPACITY})`);
        
        const MAX_RETRIES = 2; 
        
        try {
            // ... (Keep all your existing Stage 1, Stage 2, Stage 3 await logic here) ...
            
            // Just for completeness, here is the end of the logic:
            const isSuccess = Math.random() > 0.30; 
            if (isSuccess) {
                await updateStageStatus(job.id, "Docker Build", "completed");
                db.run(`UPDATE jobs SET status = 'success' WHERE id = ?`, [job.id]);
                console.log(`✅ [Worker 4] SUCCESS job #${job.id}`);
            } else {
                await updateStageStatus(job.id, "Docker Build", "failed");
                if (job.retry_count < MAX_RETRIES) {
                    const resetStages = JSON.stringify([
                        { name: "Fetch Code", status: "pending" },
                        { name: "Install Dependencies", status: "pending" },
                        { name: "Docker Build", status: "pending" }
                    ]);
                    db.run(`UPDATE jobs SET status = 'pending', retry_count = retry_count + 1, stages = ? WHERE id = ?`, [resetStages, job.id]);
                    console.log(`🔄 [Worker 4] Failed job #${job.id}. Returning to queue...`);
                } else {
                    db.run(`UPDATE jobs SET status = 'failed' WHERE id = ?`, [job.id]);
                    console.log(`❌ [Worker 4] FAILED job #${job.id}`);
                }
            }
        } catch (err) {
            console.error(`🐍 [Worker 4] Error:`, err);
        } finally {
            // --- NEW: Job finished (success or fail), decrease load! ---
            activeJobs--; 
        }
    }
};