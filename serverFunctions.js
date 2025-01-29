const { exec } = require('child_process');
const { servers } = require("./config.json"); // Load servers config

let activeServers = {}; // To store running servers by PID

// Generic function to start any server
async function startServer(serverName) {
    const server = servers[serverName];
    if (!server) {
        console.log(`Server ${serverName} is not configured.`);
        return `${serverName} server is not configured.`;
    }

    const isServerRunning = await checkIfServerRunning(serverName);
    if (isServerRunning) {
        console.log(`${serverName} server is already running.`);
        return `${serverName} server is already running.`;
    }

    const command = `"${server.batFilePath || server.exePath}"`; // Use bat file or exe depending on config
    console.log(`Starting ${serverName} server with command: ${command}`);

    const serverProcess = exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return `${serverName} server failed to start.`;
        }
        console.log(`${serverName} server started: ${stdout}`);
        activeServers[serverProcess.pid] = { status: 'running', serverName };
    });

    return `${serverName} server started successfully.`;
}

// Generic function to check if a server is running
async function checkIfServerRunning(serverName) {
    const server = servers[serverName];
    if (!server) {
        console.log(`Server ${serverName} is not configured.`);
        return false;
    }

    const runningServers = await getRunningServers();
    return runningServers.some(server => server.name === server.exeName); // Compare with exeName from config
}

// Helper function to get running servers
async function getRunningServers() {
    console.log("Checking for running server instances...");
    const runningServers = [];

    // Check all configured servers
    for (let serverName in servers) {
        const server = servers[serverName];
        const serverStatus = await checkServerRunning(server.exeName);
        if (serverStatus) runningServers.push(serverStatus);
    }

    return runningServers;
}

// Helper function to check if a specific server is running
const checkServerRunning = (exeName) => {
    return new Promise((resolve, reject) => {
        exec(`tasklist /FI "IMAGENAME eq ${exeName}" /FO CSV /NH`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error checking ${exeName} status: ${stderr}`);
                reject(error);
            }

            const lines = stdout.trim().split('\n');
            if (lines.length > 0) {
                const serverInfo = lines[0].split(',');
                if (serverInfo.length >= 2) {
                    const pid = serverInfo[1].replace(/"/g, '').trim();
                    const name = serverInfo[0].replace(/"/g, '').trim();
                    resolve({ pid, name });
                }
            }
            resolve(null); // No server found
        });
    });
};

// Generic function to stop any server
async function stopServer(serverName) {
    console.log(`Stopping ${serverName} server...`);

    const serverConfig = servers[serverName];

    if (!serverConfig) {
        console.log(`Server configuration for ${serverName} not found.`);
        return `Server configuration for ${serverName} not found.`;
    }

    // Check if the server has a custom stopPath
    const stopPath = serverConfig.stopPath;
    const port = serverConfig.port;

    if (stopPath) {
        // If stopPath exists, execute the provided .bat file
        console.log(`Executing stopPath: ${stopPath}`);
        const stopCommand = `"${stopPath}"`; // Ensure the path is wrapped in quotes for spaces
        exec(stopCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error stopping server with stopPath: ${stderr}`);
                return `Error stopping the ${serverName} server with stopPath.`;
            }
            console.log(`Server stopped successfully using stopPath: ${stdout}`);
        });
        return `${serverName} server stopped successfully using stopPath.`;
    } else {
        // If stopPath doesn't exist, fall back to killing the process using the port
        console.log(`Executing killProcess.bat for port ${port}`);
        const killCommand = `"C:\\Optimus\\batFiles\\killProcess.bat" ${port}`; 
        exec(killCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error killing server process for port ${port}: ${stderr}`);
                return `Error killing the ${serverName} server process for port ${port}.`;
            }
            console.log(`${serverName} server with port ${port} stopped: ${stdout}`);
        });
        return `${serverName} server stopped successfully by killing process on port ${port}.`;
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

module.exports = { startServer, stopServer, showActiveServers };
