const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database (creates a 'jobs.db' file in the master folder)
const dbPath = path.resolve(__dirname, 'jobs.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
    } else {
        console.log('✅ Connected to the SQLite database.');
        
        // Create the jobs table if it doesn't exist yet
        // Create the jobs table if it doesn't exist yet
        // Create the jobs table if it doesn't exist yet
        // Create the jobs table with our NEW columns
        db.run(`CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name TEXT NOT NULL,
            branch TEXT DEFAULT 'main',
            commit_hash TEXT DEFAULT 'manual',
            language TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('❌ Error creating jobs table:', err.message);
            } else {
                console.log('✅ Jobs table is ready.');
            }
        });
    }
});

// Export the database object so our server and scheduler can use it
module.exports = db;