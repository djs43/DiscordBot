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

// Store the audio player for each guild
const audioPlayers = {};

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
        //console.log('Bot status updated:', statusMessage); // Log the status for debugging
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
                            // Future server types can be added here
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
                            // Future server types can be added here
                        )
                ),
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
        // Add conditions here for stopping other server types in the future
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
function StartServer(interaction) {
    const batFilePath = arma3server.batFilePath;  // Get the path from config.json

    exec(`"${batFilePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            interaction.reply('Failed to start the server. Please check the logs.');
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);

        // Notify the user that the server has been started
        interaction.reply('Server has been started successfully!');
    });
}

// Function to stop a game server (e.g., Arma 3)
function StopServer(interaction) {
    const killCommand = 'taskkill /F /IM arma3server_x64.exe'; // Kill the running arma3server_x64.exe process

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

        // Notify the user that the server has been stopped
        interaction.reply('Server has been stopped successfully!');
    });
}

client.login(token);
