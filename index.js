const { Client, Events, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");
const { registerCommands } = require("./commands"); // Separate commands module for better structure
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const { exec } = require('child_process');
const si = require('systeminformation');
const os = require('os');
const inquirer = require('inquirer');  // Import inquirer for CLI prompts

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ]
});

// Store the PIDs of active servers in memory
let activeServers = {};

// Register commands on bot startup
client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Register commands in the server (this ensures commands are always up to date)
    try {
        await registerCommands(client);
        console.log("Commands registered successfully.");
    } catch (error) {
        console.error("Error registering commands:", error);
    }

    // Update bot status periodically
    setInterval(async () => {
        const cpuData = await si.currentLoad();
        const cpuUsage = cpuData.currentLoad.toFixed(2);
        const ramUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;

        const statusMessage = `CPU: ${cpuUsage}% | RAM: ${ramUsage.toFixed(2)}%`;
        client.user.setPresence({ activities: [{ name: statusMessage }] });
    }, 3000); // Update every 3 seconds
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const voiceChannel = interaction.member.voice.channel;
    if (interaction.commandName === "ping") {
        return interaction.reply("Pong!");
    }

    // Example command handlers (can be moved to separate functions)
    if (interaction.commandName === "start") {
        await StartServer(interaction);
    }

    if (interaction.commandName === "stop") {
        await StopServer(interaction);
    }

    if (interaction.commandName === "showactive") {
        await showActiveServers(interaction);
    }

    if (interaction.commandName === "play") {
        await playMusic(interaction, voiceChannel);
    }

    if (interaction.commandName === "playlocal") {
        await playLocalMusic(interaction, voiceChannel);
    }

    if (interaction.commandName === "stopsound") {
        await stopSound(interaction, voiceChannel);
    }
});

// Start the bot
client.login(token);

// Helper functions for server and music commands
async function StartServer(interaction) {
    // Logic for starting a server (e.g., Arma 3)
    console.log("Starting server...");
    const isServerRunning = await checkIfServerRunning();
    
    if (isServerRunning) {
        console.log('Server is already running.');
        return interaction.reply('The server is already running!');
    }

    const batFilePath = "your/server/start/script.bat"; // Replace with your path
    const serverProcess = exec(batFilePath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return interaction.reply('Failed to start the server!');
        }
        console.log(`Server started: ${stdout}`);
        const pid = serverProcess.pid;
        activeServers[pid] = { status: 'running' };
        interaction.reply(`Server started with PID: ${pid}`);
    });
}

async function StopServer(interaction) {
    // Logic for stopping a server
    const pid = Object.keys(activeServers)[0];
    if (!pid) {
        console.log("No server running.");
        return interaction.reply("No active server to stop.");
    }

    const killCommand = `taskkill /F /PID ${pid}`;
    exec(killCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return interaction.reply("Failed to stop the server!");
        }
        console.log(`Server stopped: ${stdout}`);
        delete activeServers[pid];
        interaction.reply("Server stopped successfully.");
    });
}

async function showActiveServers(interaction) {
    // Show active servers
    if (Object.keys(activeServers).length === 0) {
        return interaction.reply("No active servers.");
    }

    const activeServerList = Object.keys(activeServers)
        .map(pid => `PID: ${pid}`)
        .join('\n');
    interaction.reply(`Active servers:\n${activeServerList}`);
}

// CLI Interface using inquirer
async function cliMenu() {
    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: 'Start Server', value: 'start' },
                { name: 'Stop Server', value: 'stop' },
                { name: 'Show Active Servers', value: 'show' },
                { name: 'Exit', value: 'exit' }
            ]
        }
    ]);

    switch (answer.action) {
        case 'start':
            await StartServer();
            break;
        case 'stop':
            await StopServer();
            break;
        case 'show':
            await showActiveServers();
            break;
        case 'exit':
            console.log('Exiting CLI...');
            process.exit(0);
            break;
    }

    cliMenu(); // Recursively show the menu again after an action
}

// Start CLI in the terminal
cliMenu();

async function checkIfServerRunning() {
    return new Promise((resolve, reject) => {
        exec('tasklist /FI "IMAGENAME eq arma3server_x64.exe"', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error checking server status: ${stderr}`);
                reject(error);
            }

            if (stdout.includes('arma3server_x64.exe')) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}
