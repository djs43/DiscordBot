const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    registerCommands: async function(client) {
        const commands = [
            new SlashCommandBuilder().setName('ping').setDescription('Replies with pong'),
            new SlashCommandBuilder()
                .setName('start')
                .setDescription('Starts a game server')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('The type of server to start')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Arma 3', value: 'arma3' },
                            { name: 'Vintage Story', value: 'vintageStory' }  
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
                            { name: 'Vintage Story', value: 'vintageStory' } 
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
                .setDescription('Stops the current audio and leaves the voice channel'),
            new SlashCommandBuilder()
            .setName('ip')
            .setDescription('Shows your public IP address'),
        ];

        // Register commands to Discord
        try {
            await client.application.commands.set(commands.map(command => command.toJSON()));
            console.log("Commands successfully registered.");
        } catch (error) {
            console.error("Error registering commands:", error);
        }
    }
};