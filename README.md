# Simulated Jenkins CI/CD Pipeline as of 28th April 11:30p.m

This project is a custom, simulated Jenkins CI/CD system built from scratch using Node.js. It mimics the core architecture of a real-world CI/CD master by handling webhook events, queuing jobs, scheduling them, and executing them across simulated worker nodes.

## 🌟 Features Implemented

1. **Webhook Simulator (`simulator/push_event.js`)**: Acts as GitHub, sending randomized `POST` requests to the master to trigger builds for different repositories and languages.
2. **Jenkins Master API (`master/server.js`)**: An Express.js server that receives webhook payloads and enqueues them into the database.
3. **Persistent Job Queue (`master/db.js`)**: An SQLite database that tracks job states (`pending`, `running`, `success`, `failed`) and retry counts.
4. **Pipeline Scheduler (`master/scheduler.js`)**: A polling manager that constantly checks the queue for `pending` jobs and routes them to the appropriate worker based on language requirements.
5. **Worker Nodes (`master/workers/*.js`)**: Simulates execution environments (Python, Node.js, Docker, etc.) with randomized execution times and a realistic failure rate.
6. **Resilience / Retry Mechanism**: If a worker fails a job, the system automatically returns it to the queue for a retry (up to 2 times) before permanently marking it as failed.
7. **Live Web Dashboard**: A real-time UI served at the root URL that polls the API to visually track jobs as they transition through the pipeline.

## 📂 Project Architecture

\`\`\`text
simulated-jenkins/
├── master/
│   ├── server.js        ← Jenkins Master API & Live Dashboard (Express)
│   ├── db.js            ← SQLite Job Queue connection & schema
│   ├── scheduler.js     ← Pipeline Manager (polls DB & assigns jobs)
│   └── workers/         ← Execution environments
│       ├── worker1.js   ← Python job worker
│       ├── worker2.js   ← Node.js job worker
│       ├── worker3.js   ← Docker/shell worker
│       └── worker4.js   ← General fallback worker
├── simulator/
│   └── push_event.js    ← Script simulating random GitHub push events
└── package.json         ← Project dependencies
\`\`\`

## 🚀 How to Run the System

To see the full pipeline in action, you need to open **three separate terminal windows** in the project root.

**Terminal 1: Start the Jenkins Master**
This starts the webhook listener, initializes the database, and hosts the Live Dashboard.
\`\`\`bash
node master/server.js
\`\`\`

**Terminal 2: Start the Scheduler & Workers**
This starts the brain of the operation, pulling jobs from the queue and executing them.
\`\`\`bash
node master/scheduler.js
\`\`\`

**Terminal 3: Start the GitHub Simulator**
This script will start pushing random commits to the master.
\`\`\`bash
node simulator/push_event.js
\`\`\`

## 📊 Viewing the Dashboard

Once all three terminals are running, open your web browser and navigate to:
**http://localhost:3000**

You will see a live-updating table showing jobs arriving, entering the `running` state, and concluding with `success` or `failed` (including automatic retries for failed jobs).
