const express = require('express');
const db = require('./db'); // Import our database connection

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

// --- UPGRADED WEBHOOK ENDPOINT (Real GitHub Integration) ---
app.post('/webhook', (req, res) => {
    // 1. Extract the payload sent by GitHub
    const payload = req.body;

    // Safety check: Is this a valid push event?
    if (!payload.repository || !payload.commits) {
        return res.status(400).json({ error: 'Invalid GitHub payload' });
    }

    // 2. Define the variables based on the incoming GitHub data
    const repo_name = payload.repository.name;
    const branch = payload.ref.replace('refs/heads/', ''); // e.g., 'main'
    const commit_hash = payload.after; // The ID of the latest commit
    const language = 'docker'; // Placeholder for our workers

    console.log(`\n🔔 REAL WEBHOOK RECEIVED!`);
    console.log(`Repository: ${repo_name}`);
    console.log(`Branch: ${branch}`);
    console.log(`Commit: ${commit_hash.substring(0, 7)}...`);

    // 3. Define the default stages every new job will go through
    const initialStages = JSON.stringify([
        { name: "Fetch Code", status: "pending" },
        { name: "Install Dependencies", status: "pending" },
        { name: "Docker Build", status: "pending" }
    ]);

    // 4. Insert into the database
    const query = `INSERT INTO jobs (repo_name, branch, commit_hash, language, stages) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [repo_name, branch, commit_hash, language, initialStages], function(err) {
        if (err) {
            console.error('❌ Failed to enqueue job:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`📥 Enqueued Real Job #${this.lastID} -> Status: Pending`);
        res.status(202).json({ message: 'GitHub Job enqueued successfully' });
    });
});

// --- API Endpoint to get jobs ---
app.get('/api/jobs', (req, res) => {
    // Fetch the 50 most recent jobs
    const query = `SELECT * FROM jobs ORDER BY id DESC LIMIT 50`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// --- The Web Dashboard ---
app.get('/', (req, res) => {
    // We send a string of HTML directly to the browser
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ForgeCI Pipeline Dashboard</title>
    <style>
        /* Advanced Dark Theme */
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #0b1120; color: #cbd5e1; margin: 0; padding: 30px; }
        h1 { color: #f8fafc; margin-bottom: 30px; }
        
        /* 3-Column Kanban Layout */
        .board { display: flex; gap: 25px; align-items: flex-start; }
        .column { flex: 1; background: transparent; }
        .col-header { padding-bottom: 10px; margin-bottom: 15px; font-weight: bold; font-size: 18px; border-bottom: 2px solid; }
        
        /* Specific Column Colors */
        .queued .col-header { border-color: #3b82f6; color: #3b82f6; }
        .in-progress .col-header { border-color: #f59e0b; color: #f59e0b; }
        .completed .col-header { border-color: #22c55e; color: #22c55e; }

        /* Job Cards */
        .card { background-color: #1e293b; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 1px solid #334155; }
        .card-title { font-weight: bold; color: #f8fafc; margin-bottom: 8px; font-size: 16px; }
        .card-meta { font-size: 12px; color: #94a3b8; margin-bottom: 15px; font-family: monospace; }
        
        /* Stages inside Cards */
        .stage { font-size: 13px; margin-bottom: 6px; padding: 4px 8px; border-radius: 4px; display: flex; justify-content: space-between; }
        .stage.pending { background: #334155; color: #94a3b8; }
        .stage.running { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-left: 3px solid #f59e0b; }
        .stage.completed { background: rgba(34, 197, 94, 0.1); color: #22c55e; border-left: 3px solid #22c55e; }
        
        /* Failed Card Override */
        .card.failed { border: 1px solid #ef4444; }
        .card.failed .stage.completed { border-left-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    </style>
</head>
<body>
    <h1>🚀 ForgeCI Pipeline Dashboard</h1>
    
    <div class="board">
        <div class="column queued">
            <div class="col-header">Queued (<span id="count-queued">0</span>)</div>
            <div id="queued-list"></div>
        </div>

        <div class="column in-progress">
            <div class="col-header">In Progress (<span id="count-running">0</span>)</div>
            <div id="running-list"></div>
        </div>

        <div class="column completed">
            <div class="col-header">Completed (<span id="count-completed">0</span>)</div>
            <div id="completed-list"></div>
        </div>
    </div>

    <script>
        function renderCard(job) {
            const shortHash = job.commit_hash.substring(0, 7);
            
            // Parse the JSON stages from the database
            let stagesHtml = '';
            try {
                const stages = JSON.parse(job.stages || '[]');
                stagesHtml = stages.map(s => \`
                    <div class="stage \${s.status}">
                        <span>\${s.name}</span>
                        <span>\${s.status}</span>
                    </div>
                \`).join('');
            } catch(e) { stagesHtml = '<div class="stage pending">Loading stages...</div>'; }

            // Handle the visual card failure state
            const isFailed = job.status === 'failed' ? 'failed' : '';

            return \`
                <div class="card \${isFailed}">
                    <div class="card-title">\${job.repo_name} — branch: \${job.branch}</div>
                    <div class="card-meta">
                        commit: \${shortHash}<br>
                        id: job-\${job.id}-\${shortHash}
                    </div>
                    <div class="stages-container">
                        \${job.status === 'failed' ? \`<div class="stage completed">Pipeline Failed ❌</div>\` : stagesHtml}
                    </div>
                </div>
            \`;
        }

        async function fetchAndDisplayJobs() {
            try {
                const response = await fetch('/api/jobs');
                const jobs = await response.json();
                
                // Sort jobs into their respective columns based on status
                const queuedJobs = jobs.filter(j => j.status === 'pending');
                const runningJobs = jobs.filter(j => j.status === 'running');
                const completedJobs = jobs.filter(j => j.status === 'success' || j.status === 'failed');

                // Update Counts
                document.getElementById('count-queued').innerText = queuedJobs.length;
                document.getElementById('count-running').innerText = runningJobs.length;
                document.getElementById('count-completed').innerText = completedJobs.length;

                // Render HTML
                document.getElementById('queued-list').innerHTML = queuedJobs.map(renderCard).join('') || '<div style="color:#64748b; font-size:14px; padding: 10px;">No jobs queued.</div>';
                document.getElementById('running-list').innerHTML = runningJobs.map(renderCard).join('') || '<div style="color:#64748b; font-size:14px; padding: 10px;">No running jobs.</div>';
                document.getElementById('completed-list').innerHTML = completedJobs.map(renderCard).join('') || '<div style="color:#64748b; font-size:14px; padding: 10px;">No completed jobs.</div>';
                
            } catch (error) { console.error('Error fetching jobs:', error); }
        }

        fetchAndDisplayJobs();
        setInterval(fetchAndDisplayJobs, 2000);
    </script>
</body>
</html>
`);
});


app.listen(PORT, () => {
    console.log(`🚀 Jenkins Master listening on http://localhost:${PORT}`);
});