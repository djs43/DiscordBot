const { Client, Events, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
const { token } = require("./config.json");
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ]
});

client.once(Events.ClientReady, async c => {
    console.log(`Logged in as ${c.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Replies with pong'),
        new SlashCommandBuilder()
            .setName('hello')
            .setDescription('Says hello to someone!'),
        new SlashCommandBuilder()
            .setName('hola')
            .setDescription('Says hello to someone!'),
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
                    .setRequired(true))
    ].map(command => command.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log('Commands registered successfully.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply("Pong!");
    }
    else if (interaction.commandName === "hello") {
        await interaction.reply(`Hello ${interaction.user.username}`);
    }
    else if (interaction.commandName === "hola") {
        await interaction.reply(`¡Hola ${interaction.user.username}!`);
    }
    else if (interaction.commandName === "play") {
        const voiceChannel = interaction.member.voice.channel;

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

        // Create a stream from the YouTube video
        const resource = createAudioResource(ytdl(url, { filter: 'audioonly' }));

        player.play(resource);
        connection.subscribe(player);

        await interaction.reply(`Now playing: ${url}`);

        player.on('idle', () => {
            connection.destroy();
            console.log('Left the voice channel.');
        });
    }
    else if (interaction.commandName === "playlocal") {
        const voiceChannel = interaction.member.voice.channel;

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

        // Resolve the path to the local audio file
        const resource = createAudioResource(path.resolve(filePath));

        player.play(resource);
        connection.subscribe(player);

        await interaction.reply(`Now playing local file: ${filePath}`);

        player.on('idle', () => {
            connection.destroy();
            console.log('Left the voice channel.');
        });
    }

    console.log(interaction);
});

client.login(token);
