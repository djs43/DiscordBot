const { exec } = require('child_process');
const { token, arma3server } = require("./config.json"); // Import config.json

// Store the PIDs of active servers in memory
let activeServers = {};

// Function to start the server
async function StartServer() {
    // Logic for starting a server (e.g., Arma 3)
    console.log('Starting server...');

    const isServerRunning = await checkIfServerRunning();
    if (isServerRunning) {
        console.log('Server is already running.');
        return;
    }

    const batFilePath = `"${arma3server.batFilePath}"`; // Wrap the path in quotes to handle spaces
    console.log(batFilePath);

    const serverProcess = exec(batFilePath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return;
        }
        console.log(`Server started: ${stdout}`);
        activeServers[serverProcess.pid] = { status: 'running' };
    });
}

// Helper function to check all running instances of arma3server_x64.exe and get their PIDs
async function getRunningServers() {
    return new Promise((resolve, reject) => {
        console.log("Checking for running server instances...");
        exec('tasklist /FI "IMAGENAME eq arma3server_x64.exe" /FO CSV /NH', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error checking server status: ${stderr}`);
                reject(error);
            }

            // Parse the CSV output to get all running instances' PIDs
            const lines = stdout.trim().split('\n');
            if (lines.length > 0) {
                // Map each line and ensure that the correct data is available before processing
                const servers = lines.map(line => {
                    const serverInfo = line.split(',');

                    // Ensure that the serverInfo array has at least two elements (the first is the process name, the second is the PID)
                    if (serverInfo.length > 1) {
                        const pid = serverInfo[1].replace(/"/g, '').trim();
                        const name = serverInfo[0].replace(/"/g, '').trim();
                        return { pid, name }; // Return both PID and name of each running server
                    }
                    return null; // Return null if data is invalid
                }).filter(server => server !== null); // Remove any invalid entries

                resolve(servers);  // Return an array of running server objects
            } else {
                resolve([]);  // No active servers found
            }
        });
    });
}

// Function to stop all running servers
async function StopServer() {
    try {
        // Get all running server PIDs
        const runningServers = await getRunningServers();

        if (runningServers.length === 0) {
            console.log("No active servers to stop.");
            return "No active servers to stop.";
        }

        // Iterate over all PIDs and kill each server
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

        // Inform the user about the PIDs of killed servers
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
            return runningServers;
        } else {
            console.log("No active servers.");
            return "No active servers.";
        }
    } catch (error) {
        console.error("Error checking active servers:", error);
        return "Error checking active servers.";
    }
}

// Helper function to check if any instances of arma3server_x64.exe are running
async function checkIfServerRunning() {
    return new Promise((resolve, reject) => {
        console.log("Checking if server is running...");

        // Run tasklist command to check if 'arma3server_x64.exe' is running
        exec('tasklist /FI "IMAGENAME eq arma3server_x64.exe" /FO CSV /NH', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error checking server status: ${stderr}`);
                reject(error);
            }

            // Split the output into lines
            const lines = stdout.trim().split('\n');

            // If there is no output or the output is not valid, the server is not running
            if (lines.length === 0 || lines[0].trim() === '') {
                console.log('No running servers found.');
                resolve(false);
                return;
            }

            // If there's output, parse it to get the PID and name of the server
            const serverInfo = lines[0].split(',');

            // Ensure the expected fields are available
            if (serverInfo.length >= 2) {
                // Extract and clean the PID and name
                const pid = serverInfo[1].replace(/"/g, '').trim();
                const name = serverInfo[0].replace(/"/g, '').trim();

                // Log the server's PID and name
                console.log(`Server is running. PID: ${pid}, Name: ${name}`);
                resolve(true);
            } else {
                console.log('No valid server information found.');
                resolve(false);
            }
        });
    });
}

module.exports = { StartServer, StopServer, showActiveServers };
