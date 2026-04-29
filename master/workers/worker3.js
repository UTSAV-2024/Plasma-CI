const db = require('../db');

// --- Track worker load ---
let activeJobs = 0;
const MAX_CAPACITY = 2; // This worker can only handle 2 jobs at a time

module.exports = {
    // New function for the scheduler to check if worker is full
    isBusy: () => activeJobs >= MAX_CAPACITY,

    execute: async (job, updateStageStatus, sleep) => {
        activeJobs++; // Job started, increase load!
        console.log(`🐳 [Worker 3 - Docker] Starting job #${job.id} for ${job.repo_name} (Active jobs: ${activeJobs}/${MAX_CAPACITY})`);
        
        const MAX_RETRIES = 2; 
        
        try {
            // --- STAGE 1: Fetch Code ---
            await updateStageStatus(job.id, "Fetch Code", "running");
            await sleep(1500); // Simulate downloading code
            await updateStageStatus(job.id, "Fetch Code", "completed");

            // --- STAGE 2: Install Dependencies ---
            await updateStageStatus(job.id, "Install Dependencies", "running");
            await sleep(2000); // Simulate installing dependencies
            await updateStageStatus(job.id, "Install Dependencies", "completed");

            // --- STAGE 3: Docker Build ---
            await updateStageStatus(job.id, "Docker Build", "running");
            await sleep(2500); // Simulate docker build
            
            // Simulated 30% chance of failure at the build step!
            const isSuccess = Math.random() > 0.30; 
            
            if (isSuccess) {
                await updateStageStatus(job.id, "Docker Build", "completed");
                db.run(`UPDATE jobs SET status = 'success' WHERE id = ?`, [job.id]);
                console.log(`✅ [Worker 3] SUCCESS job #${job.id}`);
            } else {
                await updateStageStatus(job.id, "Docker Build", "failed");
                if (job.retry_count < MAX_RETRIES) {
                    const resetStages = JSON.stringify([
                        { name: "Fetch Code", status: "pending" },
                        { name: "Install Dependencies", status: "pending" },
                        { name: "Docker Build", status: "pending" }
                    ]);
                    db.run(`UPDATE jobs SET status = 'pending', retry_count = retry_count + 1, stages = ? WHERE id = ?`, [resetStages, job.id]);
                    console.log(`🔄 [Worker 3] Failed job #${job.id}. Returning to queue...`);
                } else {
                    db.run(`UPDATE jobs SET status = 'failed' WHERE id = ?`, [job.id]);
                    console.log(`❌ [Worker 3] FAILED job #${job.id}`);
                }
            }
        } catch (err) {
            console.error(`🐳 [Worker 3] Error:`, err);
        } finally {
            // --- Job finished (success or fail), decrease load! ---
            activeJobs--; 
        }
    }
};