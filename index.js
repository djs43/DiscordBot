const { Client, Events, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");
const { registerCommands } = require("./commands"); // Separate commands module for better structure
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const { exec } = require('child_process');
const si = require('systeminformation');
const os = require('os');
const inquirer = require('inquirer');  // Import inquirer for CLI prompts
const { StartServer, StopServer, showActiveServers } = require("./serverFunctions"); // Import server functions

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ]
});

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
        await StartServer(interaction); // Call StartServer from serverFunctions.js
    }

    if (interaction.commandName === "stop") {
        await StopServer(interaction); // Call StopServer from serverFunctions.js
    }

    if (interaction.commandName === "showactive") {
        await showActiveServers(interaction); // Call showActiveServers from serverFunctions.js
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
