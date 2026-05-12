const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'jobs.db'));

db.serialize(() => {
    // This adds the priority column to your existing table
    db.run("ALTER TABLE jobs ADD COLUMN priority INTEGER DEFAULT 3", (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("✅ Column 'priority' already exists.");
            } else {
                console.error("❌ Error adding column:", err.message);
            }
        } else {
            console.log("🚀 Column 'priority' added successfully!");
        }
    });
});

db.close();