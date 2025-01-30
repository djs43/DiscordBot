const { Client, Events, GatewayIntentBits } = require("discord.js");
const { token, servers } = require("./config.json"); // Ensure servers is properly destructured from config.json
const { registerCommands } = require("./commands"); // Separate commands module for better structure
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
        const cpuData = await require('systeminformation').currentLoad();
        const cpuUsage = cpuData.currentLoad.toFixed(2);
        const ramUsage = (require('os').totalmem() - require('os').freemem()) / require('os').totalmem() * 100;

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
            const axios = require('axios');
            const response = await axios.get('https://api.ipify.org?format=json');
            const publicIP = response.data.ip;
            await interaction.reply(`Current IP address is: ${publicIP}`);
        } catch (error) {
            console.error("Error fetching public IP:", error);
            await interaction.reply("There was an error fetching the IP.");
        }
    }

    // Start server dynamically based on config.json
    if (interaction.commandName === "start") {
        const serverType = interaction.options.getString("server"); // Get the server type argument
        if (servers[serverType]) {
            const result = await startServer(serverType);  // Call StartServer dynamically
            await interaction.reply(result);  // Send the result back to Discord
        } else {
            await interaction.reply("That server is not configured.");
        }
    }

    // Stop server dynamically based on config.json
    if (interaction.commandName === "stop") {
        const serverType = interaction.options.getString("server"); // Get the server type argument
        if (servers[serverType]) {
            const result = await stopServer(serverType);  // Call StopServer dynamically
            await interaction.reply(result);  // Send the result back to Discord
        } else {
            await interaction.reply("That server is not configured.");
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
