const { Client, Events, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
const { token } = require("./config.json");
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

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
            .setDescription('Plays a music file')
            .addStringOption(option =>
                option.setName('file')
                    .setDescription('The audio file to play')
                    .setRequired(true))
    ].map(command => command.toJSON());

    try {
        await client.application.commands.set(commands, "929092597505462362");
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

        const audioFile = interaction.options.getString('file');
        const player = createAudioPlayer();
        const resource = createAudioResource(audioFile); // Make sure the file is accessible

        player.play(resource);
        connection.subscribe(player);

        await interaction.reply(`Now playing: ${audioFile}`);

        player.on('idle', () => {
            connection.destroy();
            console.log('Left the voice channel.');
        });
    }

    console.log(interaction);
});

client.login(token);