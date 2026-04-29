const db = require('../db');

module.exports = {
    // Notice we added 'async' and accepted the new helper functions!
    execute: async (job, updateStageStatus, sleep) => {
        console.log(`🐍 [Worker 3 - Node.js] Starting job #${job.id} for ${job.repo_name} (Attempt ${job.retry_count + 1})`);
        
        const MAX_RETRIES = 2; // Allow up to 2 retries (3 total attempts)
        
        try {
            // --- STAGE 1: Fetch Code ---
            await updateStageStatus(job.id, "Fetch Code", "running");
            await sleep(1500); // Simulate 1.5 seconds of downloading code
            await updateStageStatus(job.id, "Fetch Code", "completed");

            // --- STAGE 2: Install Dependencies ---
            await updateStageStatus(job.id, "Install Dependencies", "running");
            await sleep(2000); // Simulate 2 seconds of pip install
            await updateStageStatus(job.id, "Install Dependencies", "completed");

            // --- STAGE 3: Docker Build ---
            await updateStageStatus(job.id, "Docker Build", "running");
            await sleep(2500); // Simulate 2.5 seconds of building
            
            // Simulated 30% chance of failure at the build step!
            const isSuccess = Math.random() > 0.30; 

            if (isSuccess) {
                // Success path
                await updateStageStatus(job.id, "Docker Build", "completed");
                db.run(`UPDATE jobs SET status = 'success' WHERE id = ?`, [job.id]);
                console.log(`🐍 [Worker 3] Finished job #${job.id} -> ✅ SUCCESS`);
                console.log(`✅ [MASTER LOG] Job #${job.id} for ${job.repo_name} has officially COMPLETED.`);
            } else {
                // Failure path
                await updateStageStatus(job.id, "Docker Build", "failed");
                
                if (job.retry_count < MAX_RETRIES) {
                    // Reset the JSON stages back to pending so the UI resets!
                    const resetStages = JSON.stringify([
                        { name: "Fetch Code", status: "pending" },
                        { name: "Install Dependencies", status: "pending" },
                        { name: "Docker Build", status: "pending" }
                    ]);
                    
                    db.run(`UPDATE jobs SET status = 'pending', retry_count = retry_count + 1, stages = ? WHERE id = ?`, [resetStages, job.id]);
                    console.log(`🐍 [Worker 3] Job #${job.id} failed. 🔄 Returning to queue for retry...`);
                } else {
                    db.run(`UPDATE jobs SET status = 'failed' WHERE id = ?`, [job.id]);
                    console.log(`🐍 [Worker 3] Finished job #${job.id} -> ❌ FAILED (Max retries reached)`);
                }
            }
        } catch (err) {
            console.error(`🐍 [Worker 3] Execution error:`, err);
        }
    }
};