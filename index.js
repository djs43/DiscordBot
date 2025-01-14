const si = require('systeminformation');
const { Client, Events, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
const { token, arma3server } = require("./config.json");  // Destructure the new fields from config.json
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const path = require('path');
const os = require('os');
const { exec } = require('child_process'); // For running system commands (e.g., starting and stopping game servers)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ]
});

// Store the PIDs of active servers in memory
let activeServers = {};

client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Update bot status every 3 seconds
    setInterval(async () => {
        // Get CPU usage using systeminformation
        const cpuData = await si.currentLoad();
        const cpuUsage = cpuData.currentLoad.toFixed(2); // Get CPU load as a percentage

        // Get RAM usage
        const ramUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;

        // Format the status message
        const statusMessage = `CPU: ${cpuUsage}% | RAM: ${ramUsage.toFixed(2)}%`;

        // Update the bot's presence (status)
        client.user.setPresence({ activities: [{ name: statusMessage }] });
    }, 3000);  // Update the status every 3 seconds

    try {
        // Fetch existing commands to check for duplicates
        const existingCommands = await client.application.commands.fetch();
        console.log('Existing commands:', existingCommands);

        const commands = [
            new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Replies with pong'),
            new SlashCommandBuilder()
                .setName('start')
                .setDescription('Starts a game server')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('The type of server to start')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Arma 3', value: 'arma3' },
                        )
                ),
            new SlashCommandBuilder()
                .setName('stop')
                .setDescription('Stops a game server')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('The type of server to stop')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Arma 3', value: 'arma3' },
                        )
                ),
            new SlashCommandBuilder()
                .setName('showactive')
                .setDescription('Shows the active game servers and their PIDs'),
            new SlashCommandBuilder()
                .setName('play')
                .setDescription('Plays a YouTube video')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('The YouTube video URL to play')
                        .setRequired(true)),
            new SlashCommandBuilder()
                .setName('playlocal')
                .setDescription('Plays a local audio file')
                .addStringOption(option =>
                    option.setName('file')
                        .setDescription('The path to the local audio file')
                        .setRequired(true)),
            new SlashCommandBuilder()
                .setName('stopsound')
                .setDescription('Stops the current audio and leaves the voice channel')
        ].map(command => command.toJSON());

        // Filter out commands that already exist
        const commandsToRegister = commands.filter(command => {
            return !existingCommands.some(existingCommand => existingCommand.name === command.name);
        });

        if (commandsToRegister.length > 0) {
            await client.application.commands.set(commandsToRegister);
            console.log('New commands registered:', commandsToRegister);
        } else {
            console.log('No new commands to register (no duplicates).');
        }

    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const voiceChannel = interaction.member.voice.channel;

    // Handle /start command for starting servers
    if (interaction.commandName === "start") {
        const serverType = interaction.options.getString('server'); // Get the server type from the command options

        if (serverType === 'arma3') {
            StartServer(interaction);
        }
    }

    // Handle /stop command for stopping servers
    else if (interaction.commandName === "stop") {
        const serverType = interaction.options.getString('server'); // Get the server type from the command options

        if (serverType === 'arma3') {
            StopServer(interaction);
        }
    }

    // Handle /activeServers command to show active servers and their PIDs
    else if (interaction.commandName === "activeServers") {
        showActiveServers(interaction);
    }

    // Handle other commands
    else if (interaction.commandName === "ping") {
        await interaction.reply("Pong!");
    }
    else if (interaction.commandName === "play") {
        if (!voiceChannel) {
            return interaction.reply('You need to be in a voice channel to play music!');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        const url = interaction.options.getString('url');
        const player = createAudioPlayer();

        // Store the player for the current guild
        audioPlayers[interaction.guild.id] = player;

        // Create a stream from the YouTube video
        const resource = createAudioResource(ytdl(url, { filter: 'audioonly' }));

        player.play(resource);
        connection.subscribe(player);

        await interaction.reply(`Now playing: ${url}`);

        player.on('idle', () => {
            connection.destroy();
            delete audioPlayers[interaction.guild.id]; // Remove player reference
            console.log('Left the voice channel.');
        });
    }
    else if (interaction.commandName === "playlocal") {
        if (!voiceChannel) {
            return interaction.reply('You need to be in a voice channel to play music!');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        const filePath = interaction.options.getString('file');
        const player = createAudioPlayer();

        // Store the player for the current guild
        audioPlayers[interaction.guild.id] = player;

        // Resolve the path to the local audio file
        const resource = createAudioResource(path.resolve(filePath));

        player.play(resource);
        connection.subscribe(player);

        await interaction.reply(`Now playing local file: ${filePath}`);

        player.on('idle', () => {
            connection.destroy();
            delete audioPlayers[interaction.guild.id]; // Remove player reference
            console.log('Left the voice channel.');
        });
    }
    else if (interaction.commandName === "stopsound") {
        if (!voiceChannel) {
            return interaction.reply('You need to be in a voice channel to stop the music!');
        }

        const player = audioPlayers[interaction.guild.id];
        if (player) {
            player.stop();
            interaction.reply('Stopped the music and left the voice channel.');

            // Destroy the connection
            const connection = getVoiceConnection(interaction.guild.id);
            if (connection) {
                connection.destroy();
            }
            delete audioPlayers[interaction.guild.id]; // Remove player reference
        } else {
            await interaction.reply('No music is currently playing.');
        }
    }

    console.log(interaction);
});

// Function to start a game server (e.g., Arma 3)
async function StartServer(interaction) {
    // Check if Arma 3 server is already running
    const isServerRunning = await checkIfServerRunning();

    if (isServerRunning) {
        return interaction.reply('An Arma 3 server is already running. Please stop the current server before starting a new one.');
    }

    const batFilePath = arma3server.batFilePath;  // Get the path from config.json

    const serverProcess = exec(`"${batFilePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            interaction.reply('Failed to start the server. Please check the logs.');
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);

        // Store the PID of the started server process in memory
        const pid = serverProcess.pid;
        activeServers[pid] = { status: 'running' };

        // Notify the user that the server has been started
        interaction.reply(`Server has been started successfully with PID: ${pid}`);
    });
}

// Function to stop a game server (e.g., Arma 3)
function StopServer(interaction) {
    // Find the PID from activeServers (example assumes the first PID in memory)
    const pid = Object.keys(activeServers)[0];
    
    if (!pid) {
        return interaction.reply('No server is currently running.');
    }

    const killCommand = `taskkill /F /PID ${pid}`; // Kill the running arma3server_x64.exe process

    exec(killCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            interaction.reply('Failed to stop the server. Please check the logs.');
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);

        // Remove the server from activeServers
        delete activeServers[pid];

        // Notify the user that the server has been stopped
        interaction.reply('Server has been stopped successfully!');
    });
}

// Function to show active servers
function showActiveServers(interaction) {
    if (Object.keys(activeServers).length === 0) {
        return interaction.reply('No active servers currently.');
    }

    const activeServerList = Object.keys(activeServers).map(pid => `PID: ${pid}`).join('\n');

    interaction.reply(`Active servers:\n${activeServerList}`);
}

// Function to check if an Arma 3 server is already running
async function checkIfServerRunning() {
    return new Promise((resolve, reject) => {
        // Check the task list to see if the Arma 3 server is running
        exec('tasklist /FI "IMAGENAME eq arma3server_x64.exe"', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error checking server status: ${stderr}`);
                reject(error);
            }

            // If the task list contains the process, the server is running
            if (stdout.includes('arma3server_x64.exe')) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

client.login(token);
