const { Client, Events, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
const { token } = require("./config.json");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
            .setDescription('Says hello to someone!')
    ].map(command => command.toJSON());

    try {
        await client.application.commands.set(commands,"929092597505462362");
        console.log('Commands registered successfully.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on(Events.InteractionCreate, interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        interaction.reply("Pong!");
    }
    if (interaction.commandName === "hello") {
        interaction.reply(`Hello ${interaction.user.username}`);
    }
    if (interaction.commandName === "hola") {
        interaction.reply(`¡Hola ${interaction.user.username}!`);
    }

    console.log(interaction);
});

client.login(token);