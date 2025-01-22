const { exec } = require('child_process');
const { arma3server } = require("./config.json"); // Import config.json

// Store the PIDs of active servers in memory
let activeServers = {};

// Helper function to check if a specific server is running
const checkServerRunning = (serverName) => {
    return new Promise((resolve, reject) => {
        exec(`tasklist /FI "IMAGENAME eq ${serverName}" /FO CSV /NH`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error checking ${serverName} status: ${stderr}`);
                reject(error);
            }

            const lines = stdout.trim().split('\n');
            if (lines.length > 0) {
                const serverInfo = lines[0].split(',');
                if (serverInfo.length >= 2) {
                    const pid = serverInfo[1].replace(/"/g, '').trim();
                    const name = serverInfo[0].replace(/"/g, '').trim();
                    resolve({ pid, name });  // Server is running, resolve with PID and name
                }
            }
            resolve(null); // No server found
        });
    });
};

// Function to get all running servers with details
async function getRunningServers() {
    console.log("Checking for running server instances...");

    try {
        const [arma3Server, vintagestoryServer] = await Promise.all([
            checkServerRunning('arma3server_x64.exe'),
            checkServerRunning('VintagestoryServer.exe')
        ]);

        const runningServers = [];
        if (arma3Server) runningServers.push(arma3Server);
        if (vintagestoryServer) runningServers.push(vintagestoryServer);

        return runningServers; // Return all running server details
    } catch (error) {
        console.error("Error checking running servers:", error);
        return [];
    }
}

// Function to check if any server is running
async function checkIfServerRunning() {
    const runningServers = await getRunningServers();
    return runningServers.length > 0; // If there are any running servers
}

// Function to start the server
async function StartServer() {
    console.log('Starting server...');

    const isServerRunning = await checkIfServerRunning();
    if (isServerRunning) {
        console.log('Server is already running.');
        return 'Server is already running.';
    }

    const batFilePath = `"${arma3server.batFilePath}"`; // Wrap the path in quotes to handle spaces
    console.log(batFilePath);

    const serverProcess = exec(batFilePath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return 'Error starting the server.';
        }
        console.log(`Server started: ${stdout}`);
        activeServers[serverProcess.pid] = { status: 'running' };
    });

    return 'Server started successfully.';
}

// Function to stop all running servers
async function StopServer() {
    try {
        const runningServers = await getRunningServers();

        if (runningServers.length === 0) {
            console.log("No active servers to stop.");
            return "No active servers to stop.";
        }

        const killedPIDs = [];
        for (let server of runningServers) {
            const killCommand = `taskkill /F /PID ${server.pid}`;
            exec(killCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error stopping server with PID ${server.pid}: ${stderr}`);
                    return;
                }
                console.log(`Server with PID ${server.pid} stopped: ${stdout}`);
                killedPIDs.push(server.pid);
            });
        }

        if (killedPIDs.length > 0) {
            console.log(`The following servers have been killed: ${killedPIDs.join(', ')}`);
            return `The following servers have been killed: ${killedPIDs.join(', ')}`;
        } else {
            console.log("No servers were killed.");
            return "No servers were killed.";
        }
    } catch (error) {
        console.error("Error stopping servers:", error);
        return "Error stopping servers.";
    }
}

// Function to show active servers with PID
async function showActiveServers() {
    try {
        const runningServers = await getRunningServers();

        if (runningServers.length > 0) {
            console.log("Active servers:");
            runningServers.forEach(server => {
                console.log(`PID: ${server.pid}, Name: ${server.name}`);
            });
            return runningServers.map(server => `PID: ${server.pid}, Name: ${server.name}`).join('\n');
        } else {
            console.log("No active servers.");
            return "No active servers.";
        }
    } catch (error) {
        console.error("Error checking active servers:", error);
        return "Error checking active servers.";
    }
}

module.exports = { StartServer, StopServer, showActiveServers };
