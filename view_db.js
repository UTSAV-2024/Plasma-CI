const db = require('./master/db');

console.log('🔍 Fetching the last 10 jobs from the database...\n');

db.all("SELECT * FROM jobs ORDER BY id DESC LIMIT 10", [], (err, rows) => {
    if (err) {
        console.error('❌ Error reading database:', err.message);
    } else if (rows.length === 0) {
        console.log('No jobs found in the database yet.');
    } else {
        // console.table prints an awesome formatted grid in the terminal!
        console.table(rows);
    }
    
    // Close the connection so the script exits automatically
    db.close(); 
});