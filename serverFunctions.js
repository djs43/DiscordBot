const { exec } = require('child_process');
const { arma3server, vintageStory } = require("./config.json"); // Import config.json

// Store the PIDs of active servers in memory
let activeServers = {};

// Function to start the server, takes the server name (either 'arma3' or 'vintageStory') as an argument
async function StartServer(serverName) {
    console.log(`Starting ${serverName} server...`);

    // Determine the server path based on the serverName argument
    let serverExePath;
    if (serverName === 'arma3') {
        serverExePath = arma3server.batFilePath;
    } else if (serverName === 'vintageStory') {
        serverExePath = vintageStory.exePath;
    } else {
        console.log(`Unknown server name: ${serverName}`);
        return `Unknown server name: ${serverName}`;
    }

    // Check if the selected server is already running
    const isServerRunning = await checkIfServerRunning();
    if (isServerRunning) {
        console.log(`${serverName} server is already running.`);
        return `${serverName} server is already running.`;
    }

    // If the server is not running, start it using the appropriate bat file or executable
    const batFilePath = `"${serverExePath}"`; // Wrap the path in quotes to handle spaces
    console.log(`Starting server with command: ${batFilePath}`);

    const serverProcess = exec(batFilePath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return `Error starting the ${serverName} server.`;
        }
        console.log(`${serverName} server started: ${stdout}`);
        activeServers[serverProcess.pid] = { status: 'running', serverName };
    });

    return `${serverName} server started successfully.`;
}

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

// Function to stop the server, takes the server name (either 'arma3' or 'vintageStory') as an argument
async function StopServer(serverName) {
    console.log(`Stopping ${serverName} server...`);

    // Determine the executable name based on the serverName argument
    let serverExeName;
    if (serverName === 'arma3') {
        serverExeName = 'arma3server_x64.exe';
    } else if (serverName === 'vintageStory') {
        serverExeName = 'VintagestoryServer.exe';
    } else {
        console.log(`Unknown server name: ${serverName}`);
        return `Unknown server name: ${serverName}`;
    }

    // Get the running servers' details
    const runningServers = await getRunningServers();

    // Filter the running servers to find the one matching the server name
    const serverToStop = runningServers.find(server => server.name === serverExeName);

    if (!serverToStop) {
        console.log(`${serverName} server is not running.`);
        return `${serverName} server is not running.`;
    }

    // If the server is running, stop it
    const killCommand = `taskkill /F /PID ${serverToStop.pid}`;
    exec(killCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error stopping server with PID ${serverToStop.pid}: ${stderr}`);
            return;
        }
        console.log(`${serverName} server with PID ${serverToStop.pid} stopped: ${stdout}`);
    });

    return `${serverName} server stopped successfully.`;
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

// Export the functions
module.exports = { StartServer, StopServer, showActiveServers };
