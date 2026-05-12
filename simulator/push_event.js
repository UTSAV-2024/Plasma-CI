// A list of fake repositories and their associated languages
const repositories = [
    { name: 'data-analyzer', language: 'python' },
    { name: 'web-frontend', language: 'nodejs' },
    { name: 'auth-service', language: 'nodejs' },
    { name: 'ml-model-trainer', language: 'python' },
    { name: 'legacy-backend', language: 'docker' },
    { name: 'docs-site', language: 'general' }
];

const MASTER_URL = 'http://localhost:3000/webhook';

async function simulatePushEvent() {
    // Pick a random repo from our list
    const randomRepo = repositories[Math.floor(Math.random() * repositories.length)];
    
    try {
        // Send the fake webhook payload to our Jenkins Master using native fetch
        const response = await fetch(MASTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repo_name: randomRepo.name,
                language: randomRepo.language
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`📤 Pushed event: ${randomRepo.name} (${randomRepo.language}) -> Got Job ID: ${data.jobId}`);
        } else {
            console.error(`⚠️ Failed to push event. Master responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error connecting to master. Is server.js running?', error.message);
    }

    // Schedule the next push event randomly between 2 to 8 seconds
    const nextInterval = Math.floor(Math.random() * 6000) + 2000;
    setTimeout(simulatePushEvent, nextInterval);
}

console.log('🤖 Starting GitHub Webhook Simulator...');
simulatePushEvent(); // Kick off the infinite loop