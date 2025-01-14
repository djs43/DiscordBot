const { exec } = require('child_process');
const activeServers = {};

async function StartServer() {
    // Logic to start server, such as spawning a process
    console.log('Starting server...');
    const serverProcess = exec('your-start-server-command', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return;
        }
        console.log(`Server started: ${stdout}`);
        activeServers[serverProcess.pid] = { status: 'running' };
    });
}

function StopServer() {
    if (Object.keys(activeServers).length === 0) {
        console.log('No server is currently running.');
        return;
    }

    const pid = Object.keys(activeServers)[0];  // Stop the first active server
    const killCommand = `taskkill /F /PID ${pid}`;
    console.log(`Stopping server with PID: ${pid}`);

    exec(killCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error stopping server: ${stderr}`);
            return;
        }
        console.log(`Server stopped: ${stdout}`);
        delete activeServers[pid];
    });
}

function showActiveServers() {
    if (Object.keys(activeServers).length === 0) {
        console.log('No active servers.');
    } else {
        console.log('Active servers:', activeServers);
    }
}

module.exports = { StartServer, StopServer, showActiveServers };