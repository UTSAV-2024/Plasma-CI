const db = require('../db');
const { exec } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const util = require('util');

// Promisify 'exec' so we can use await with terminal commands
const execPromise = util.promisify(exec);

let activeJobs = 0;
const MAX_CAPACITY = 2; 

module.exports = {
    isBusy: () => activeJobs >= MAX_CAPACITY,

    execute: async (job, updateStageStatus, sleep) => {
        activeJobs++; 
        console.log(`🚀 [Dynamic Worker] Starting job #${job.id} for ${job.repo_name}`);

        // Define a temporary workspace folder for this specific job
        const workspace = path.join(__dirname, '..', 'workspaces', `job-${job.id}`);
        
        // Construct the GitHub URL (Update 'UTSAV-2024' if your username is different)
        const repoUrl = `https://github.com/UTSAV-2024/${job.repo_name}.git`; 

        try {
            // --- 1. Prepare Workspace ---
            await fs.mkdir(workspace, { recursive: true });

            // --- 2. Clone Repository ---
            console.log(`[Job ${job.id}] 📥 Cloning repository...`);
            await execPromise(`git clone -b ${job.branch} ${repoUrl} .`, { cwd: workspace });

            // --- 3. Read the Pipeline Config ---
            console.log(`[Job ${job.id}] 📄 Reading forge-pipeline.json...`);
            const configPath = path.join(workspace, 'forge-pipeline.json');
            const configData = await fs.readFile(configPath, 'utf-8');
            const pipelineConfig = JSON.parse(configData);

            // --- 4. Overwrite Database Stages dynamically ---
            // This takes whatever stages you wrote in your JSON and pushes them to the UI!
            const dynamicStages = pipelineConfig.stages.map(s => ({ name: s.name, status: "pending" }));
            await new Promise((resolve, reject) => {
                db.run(`UPDATE jobs SET stages = ? WHERE id = ?`, [JSON.stringify(dynamicStages), job.id], (err) => {
                    if (err) reject(err); else resolve();
                });
            });

            // Give the UI a half-second to render the new stages before we start running them
            await sleep(500); 

            // --- 5. Execute Stages Dynamically! ---
            let pipelineFailed = false;
            
            for (const stage of pipelineConfig.stages) {
                console.log(`[Job ${job.id}] ▶️ Running: ${stage.name} (${stage.command})`);
                await updateStageStatus(job.id, stage.name, "running");

                try {
                    // This runs the actual command in the terminal inside the workspace folder!
                    const { stdout, stderr } = await execPromise(stage.command, { cwd: workspace });
                    console.log(`[Job ${job.id}] 💬 Output:\n${stdout}`);
                    
                    await updateStageStatus(job.id, stage.name, "completed");
                } catch (cmdErr) {
                    console.error(`[Job ${job.id}] ❌ FAILED at ${stage.name}:\n${cmdErr.message}`);
                    await updateStageStatus(job.id, stage.name, "failed");
                    pipelineFailed = true;
                    break; // Stop running further stages if one fails!
                }
            }

            // --- 6. Finalize Job Status ---
            if (pipelineFailed) {
                db.run(`UPDATE jobs SET status = 'failed' WHERE id = ?`, [job.id]);
                console.log(`❌ [Job ${job.id}] Pipeline FAILED`);
            } else {
                db.run(`UPDATE jobs SET status = 'success' WHERE id = ?`, [job.id]);
                console.log(`✅ [Job ${job.id}] Pipeline SUCCESS`);
            }

        } catch (err) {
            console.error(`❌ [Job ${job.id}] Critical Execution Error:`, err.message);
            db.run(`UPDATE jobs SET status = 'failed' WHERE id = ?`, [job.id]);
        } finally {
            // --- 7. Cleanup ---
            // Always delete the downloaded code when finished to save disk space
            try {
                await fs.rm(workspace, { recursive: true, force: true });
                console.log(`🧹 [Job ${job.id}] Cleaned up workspace.`);
            } catch (e) { 
                console.error(`[Job ${job.id}] Cleanup error:`, e.message); 
            }
            
            activeJobs--;
        }
    }
};