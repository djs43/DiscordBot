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

    // Check if the server is running by checking its port
    const pid = await getPIDFromPort(server.port);
    if (pid) {
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
                return `Error stopping ${serverName} server with stopPath.`;
            }
            console.log(`Server stopped successfully using stopPath: ${stdout}`);
        });
        return `${serverName} server stopped successfully using stopPath.`;
    } else {
        // If stopPath doesn't exist, use the kill_process.bat to stop by port
        console.log(`No stopPath found, attempting to stop server by calling kill_process.bat with port ${port}`);
        
        const killCommand = `"C:\\Optimus\\batFiles\\kill_process.bat" ${port}`;

        exec(killCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error stopping server with kill_process.bat for port ${port}: ${stderr}`);
                return `Error stopping ${serverName} server with kill_process.bat.`;
            }
            console.log(`Server stopped successfully using kill_process.bat for port ${port}: ${stdout}`);
        });

        return `${serverName} server stopped successfully using kill_process.bat for port ${port}.`;
    }
}



// Helper function to find the PID from the port using netstat
async function getPIDFromPort(port) {
    return new Promise((resolve, reject) => {
        exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running netstat command: ${stderr || error.message}`);
                resolve(null); // Resolve with null instead of rejecting
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                resolve(null); // Resolve with null if there's an issue in stderr
                return;
            }

            if (stdout) {
                const pid = stdout.trim().split(/\s+/).pop(); // Get the PID from netstat output
                resolve(pid);
            } else {
                resolve(null); // No process found for the port, resolve with null
            }
        });
    });
}




// Function to show active servers with PID
async function showActiveServers() {
    const runningServers = []; // This will store active server info

    for (let serverName in servers) {
        const server = servers[serverName];  // Retrieve server object for the current serverName
        const pid = await getPIDFromPort(server.port);  // Get the PID for the current server's port
    
        if (pid === null) {
            // Log and continue if no server is found for this port
            console.log(`No active server found on port ${server.port}`);
        } else {
            // Log if a server is found and add it to runningServers
            console.log(`Active server is running with PID: ${pid} on port ${server.port}`);
            runningServers.push({ pid, name: serverName });  // Store active server details
        }
    }

    if (runningServers.length > 0) {
        console.log("Active servers:");
        runningServers.forEach(server => {
            console.log(`PID: ${server.pid}, Name: ${server.name}`);
        });
        // Return a formatted string to Discord with the list of running servers
        return runningServers.map(server => `PID: ${server.pid}, Name: ${server.name}`).join('\n');
    } else {
        console.log("No active servers.");
        return "No active servers.";  // Return a message if no active servers are found
    }
}


module.exports = { startServer, stopServer, showActiveServers };
