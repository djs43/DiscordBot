const { SlashCommandBuilder } = require("discord.js");
const { servers } = require("./config.json"); // Import the 'servers' object from config.json

module.exports = {
    registerCommands: async function(client) {
        const guildId = "929092597505462362"; // Replace with your actual Guild ID

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
                            ...Object.keys(servers).map(server => ({
                                name: server.charAt(0).toUpperCase() + server.slice(1),
                                value: server
                            }))
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
                            ...Object.keys(servers).map(server => ({
                                name: server.charAt(0).toUpperCase() + server.slice(1),
                                value: server
                            }))
                        )
                ),
            new SlashCommandBuilder()
                .setName('showactive')
                .setDescription('Shows the active game servers and their PIDs'),
            new SlashCommandBuilder()
                .setName('ip')
                .setDescription('Shows your public IP address'),
        ];

        // Register commands to the specific guild
        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found.`);
                return;
            }

            // Register commands to the specified guild (immediate availability)
            await guild.commands.set(commands.map(command => command.toJSON()));
            console.log("Commands successfully registered for the guild.");
        } catch (error) {
            console.error("Error registering commands for the guild:", error);
        }

        // Register commands globally (takes time to propagate)
        try {
            await client.application.commands.set(commands.map(command => command.toJSON()));
            console.log("Commands successfully registered globally.");
        } catch (error) {
            console.error("Error registering commands globally:", error);
        }
    }
};
