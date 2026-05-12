const express = require('express');
const db = require('./db'); // Import our database connection

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

// This is our webhook endpoint (mimicking GitHub's push event payload)
// --- UPGRADED WEBHOOK ENDPOINT (Real GitHub Integration) ---
app.post('/webhook', (req, res) => {
    // GitHub sends a lot of data. Let's extract exactly what we need!
    const payload = req.body;

    // Safety check: Is this a valid push event?
    if (!payload.repository || !payload.commits) {
        return res.status(400).json({ error: 'Invalid GitHub payload' });
    }

    const repo_name = payload.repository.name;
    const branch = payload.ref.replace('refs/heads/', ''); // e.g., 'main'
    const commit_hash = payload.after; // The ID of the latest commit
    
    // Since real repos might use multiple languages, we'll assign 'docker' 
    // for now as a placeholder until we build the real Docker executor.
    const language = 'docker'; 

    console.log(`\n🔔 REAL WEBHOOK RECEIVED!`);
    console.log(`Repository: ${repo_name}`);
    console.log(`Branch: ${branch}`);
    console.log(`Commit: ${commit_hash.substring(0, 7)}...`);

    // Insert the real job into the database
    const query = `INSERT INTO jobs (repo_name, language) VALUES (?, ?)`;
    
    db.run(query, [repo_name, language], function(err) {
        if (err) {
            console.error('❌ Failed to enqueue job:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`📥 Enqueued Real Job #${this.lastID} -> Status: Pending`);
        res.status(202).json({ message: 'GitHub Job enqueued successfully' });
    });
});
// ... (your existing app.post('/webhook', ...) code stays up here) ...

// --- NEW CODE: API Endpoint to get jobs ---
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

// --- NEW CODE: The Web Dashboard ---
app.get('/', (req, res) => {
    // We send a string of HTML directly to the browser
    res.send(`
       <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plasma-CI Pipeline Dashboard</title>
    <style>
        /* Dark Theme inspired by your screenshots */
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #0f172a; margin: 0; padding: 40px; color: #cbd5e1; }
        h1 { color: #f8fafc; border-bottom: 2px solid #334155; padding-bottom: 10px; }
        .dashboard { max-width: 1100px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #334155; }
        th { background-color: #0f172a; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 12px; }
        tr:hover { background-color: #334155; }
        
        .commit-hash { font-family: monospace; background: #0f172a; padding: 4px 8px; border-radius: 4px; color: #38bdf8; }
        .branch { display: inline-block; background: #334155; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        
        /* Status Colors */
        .status-success { color: #22c55e; font-weight: bold; }
        .status-failed { color: #ef4444; font-weight: bold; }
        .status-running { color: #f59e0b; font-weight: bold; }
        .status-pending { color: #94a3b8; font-style: italic; }
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>🚀 Plasma-CI Pipeline Dashboard</h1>
        <table>
            <thead>
                <tr>
                    <th>Job ID</th>
                    <th>Repository</th>
                    <th>Branch</th>
                    <th>Commit</th>
                    <th>Worker</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="jobs-table-body">
                </tbody>
        </table>
    </div>

    <script>
        async function fetchAndDisplayJobs() {
            try {
                const response = await fetch('/api/jobs');
                const jobs = await response.json();
                
                const tableBody = document.getElementById('jobs-table-body');
                
                tableBody.innerHTML = jobs.map(job => {
                    const shortHash = job.commit_hash.substring(0, 7);
                    return \`
                        <tr>
                            <td>#\${job.id}</td>
                            <td><strong>\${job.repo_name}</strong></td>
                            <td><span class="branch">\${job.branch}</span></td>
                            <td><span class="commit-hash">\${shortHash}</span></td>
                            <td>\${job.language.toUpperCase()}</td>
                            <td class="status-\${job.status}">\${job.status.toUpperCase()}</td>
                        </tr>
                    \`;
                }).join('');
            } catch (error) {
                console.error('Error fetching jobs:', error);
            }
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