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
    const query = `SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`;

    db.get(query, (err, job) => {
        if (err) {
            console.error('❌ Scheduler DB Error:', err.message);
            return;
        }

        // If no pending jobs are found, just return and wait for the next poll
        if (!job) return; 

        // Mark the job as 'running' so it isn't picked up twice
        db.run(`UPDATE jobs SET status = 'running' WHERE id = ?`, [job.id], (updateErr) => {
            if (updateErr) {
                console.error('❌ Error updating job status:', updateErr.message);
                return;
            }

            console.log(`\n📋 [Scheduler] Picked up job #${job.id} (${job.language}). Routing to worker...`);

            // Route to the appropriate worker based on the language
            // Route to the appropriate worker based on the language
            switch (job.language.toLowerCase()) {
                case 'python':
                    pythonWorker.execute(job, updateStageStatus, sleep);
                    break;
                case 'nodejs':
                    nodeWorker.execute(job, updateStageStatus, sleep);
                    break;
                case 'docker':
                    dockerWorker.execute(job, updateStageStatus, sleep);
                    break;
                default:
                    fallbackWorker.execute(job, updateStageStatus, sleep);
                    break;
            }
        });
    });
}

console.log('⏱️ Pipeline Manager/Scheduler started. Polling queue...');
// Run the processQueue function repeatedly
setInterval(processQueue, POLL_INTERVAL);