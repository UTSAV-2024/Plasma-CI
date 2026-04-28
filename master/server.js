const express = require('express');
const db = require('./db'); // Import our database connection

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

// This is our webhook endpoint (mimicking GitHub's push event payload)
app.post('/webhook', (req, res) => {
    const { repo_name, language } = req.body;

    if (!repo_name || !language) {
        return res.status(400).json({ error: 'Missing repo_name or language in payload' });
    }

    // Insert the new job into the database with a default 'pending' status
    const query = `INSERT INTO jobs (repo_name, language) VALUES (?, ?)`;
    
    db.run(query, [repo_name, language], function(err) {
        if (err) {
            console.error('❌ Failed to enqueue job:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`📥 Received job #${this.lastID}: ${repo_name} (${language}) -> Status: Pending`);
        res.status(202).json({ message: 'Job enqueued successfully', jobId: this.lastID });
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
            <title>Plasma-CI Dashboard</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 40px; color: #333; }
                h1 { text-align: center; color: #2c3e50; }
                .dashboard { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #2c3e50; color: white; }
                tr:hover { background-color: #f5f5f5; }
                
                /* Status Colors */
                .status-success { color: #27ae60; font-weight: bold; }
                .status-failed { color: #c0392b; font-weight: bold; }
                .status-running { color: #f39c12; font-weight: bold; }
                .status-pending { color: #7f8c8d; font-weight: bold; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="dashboard">
                <h1>⚙️ Plasma-CI Live Dashboard</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Job ID</th>
                            <th>Repository</th>
                            <th>Language / Worker</th>
                            <th>Status</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody id="jobs-table-body">
                        </tbody>
                </table>
            </div>

            <script>
                // This function fetches data from our API and updates the table
                async function fetchAndDisplayJobs() {
                    try {
                        const response = await fetch('/api/jobs');
                        const jobs = await response.json();
                        
                        const tableBody = document.getElementById('jobs-table-body');
                        
                        // Clear the table and build it with the fresh data
                        tableBody.innerHTML = jobs.map(job => {
                            return \`
                                <tr>
                                    <td>#\${job.id}</td>
                                    <td>\${job.repo_name}</td>
                                    <td>\${job.language.toUpperCase()}</td>
                                    <td class="status-\${job.status}">\${job.status.toUpperCase()}</td>
                                    <td>\${new Date(job.created_at).toLocaleTimeString()}</td>
                                </tr>
                            \`;
                        }).join('');
                    } catch (error) {
                        console.error('Error fetching jobs:', error);
                    }
                }

                // Fetch immediately on load
                fetchAndDisplayJobs();
                
                // Then fetch again every 2 seconds to create a "Live" effect
                setInterval(fetchAndDisplayJobs, 2000);
            </script>
        </body>
        </html>
    `);
});


app.listen(PORT, () => {
    console.log(`🚀 Jenkins Master listening on http://localhost:${PORT}`);
});