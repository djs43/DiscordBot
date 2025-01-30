const { Client, Events, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");
const { registerCommands } = require("./commands"); // Separate commands module for better structure
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const { exec } = require('child_process');
const si = require('systeminformation');
const os = require('os');
const axios = require('axios');
const inquirer = require('inquirer');  // Import inquirer for CLI prompts
const { startServer, stopServer, showActiveServers } = require("./serverFunctions"); // Import server functions

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

    if (interaction.commandName === 'ip') {
        try {
            // Fetch public IP using ipify API
            const response = await axios.get('https://api.ipify.org?format=json');
            const publicIP = response.data.ip;
            await interaction.reply(`Current IP address is: ${publicIP}`);
        } catch (error) {
            console.error("Error fetching public IP:", error);
            await interaction.reply("There was an error fetching the IP.");
        }
    }

    if (interaction.commandName === "start") {
        const serverType = interaction.options.getString("server"); // Get the server type argument
        if (serverType === "arma3") {
            const result = await startServer("arma3");  // Call StartServer for Arma 3
            await interaction.reply(result);  // Send the result back to Discord
        } else if (serverType === "vintageStory") {
            const result = await startServer("vintageStory");  // Call StartServer for Vintage Story
            await interaction.reply(result);  // Send the result back to Discord
        }
    }

    // Stop server
    if (interaction.commandName === "stop") {
        const serverType = interaction.options.getString("server"); // Get the server type argument
        if (serverType === "arma3") {
            const result = await stopServer("arma3");  // Call StopServer for Arma 3
            await interaction.reply(result);  // Send the result back to Discord
        } else if (serverType === "vintageStory") {
            const result = await stopServer("vintageStory");  // Call StopServer for Vintage Story
            await interaction.reply(result);  // Send the result back to Discord
        }
    }

    // Show active servers
    if (interaction.commandName === "showactive") {
        const result = await showActiveServers();  // Call showActiveServers from serverFunctions.js
        await interaction.reply(result);  // Send the result back to Discord
    }

    
});

// Start the bot
client.login(token);