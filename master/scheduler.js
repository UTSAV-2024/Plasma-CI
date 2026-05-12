const db = require('./db');
const pythonWorker = require('./workers/worker1');
const nodeWorker = require('./workers/worker2');
const dockerWorker = require('./workers/worker3');
const fallbackWorker = require('./workers/worker4');

const POLL_INTERVAL = 2000; // Check for new jobs every 2 seconds

// Helper to pause execution (simulating work)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to tell the Master server to update a stage's visual status
async function updateStageStatus(jobId, stageName, status) {
    try {
        await fetch(`http://localhost:3000/api/jobs/${jobId}/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stageName, status })
        });
    } catch (error) {
        console.error(`Failed to update stage ${stageName}:`, error.message);
    }
}

function processQueue() {
    // Select the oldest pending job
    const query = `SELECT * FROM jobs WHERE status = 'pending' ORDER BY priority DESC, id ASC LIMIT 1;`;

    db.get(query, (err, job) => {
        if (err) {
            console.error('❌ Scheduler DB Error:', err.message);
            return;
        }

        // If no pending jobs are found, just return and wait for the next poll
        if (!job) return; 

        // 1. Figure out which worker we need based on language
        let targetWorker;
        const lang = job.language.toLowerCase();
        
        if (lang === 'python') targetWorker = pythonWorker;
        else if (lang === 'nodejs') targetWorker = nodeWorker;
        else if (lang === 'docker') targetWorker = dockerWorker;
        else targetWorker = fallbackWorker;

        // 2. CHECK LOAD: Is the worker too busy? (Instruction 7)
        if (targetWorker.isBusy && targetWorker.isBusy()) {
            console.log(`⏳ [Scheduler] Worker for '${lang}' is at MAX CAPACITY. Leaving Job #${job.id} in queue...`);
            return; // Exit and leave the job as 'pending' in the database!
        }

        // 3. Worker is free! Mark as running so it isn't picked up twice
        db.run(`UPDATE jobs SET status = 'running' WHERE id = ?`, [job.id], (updateErr) => {
            if (updateErr) {
                console.error('❌ Error updating job status:', updateErr.message);
                return;
            }

            console.log(`\n📋 [Scheduler] Picked up job #${job.id} (${lang}). Routing to worker...`);
            
            // Pass the helpers down to the worker!
            targetWorker.execute(job, updateStageStatus, sleep);
        });
    });
}

console.log('⏱️ Pipeline Manager/Scheduler started. Polling queue...');
setInterval(processQueue, POLL_INTERVAL);