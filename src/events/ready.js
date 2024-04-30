const { ActivityType, Events } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async (client) => {
        const rest = new REST({ version: "10" }).setToken(client.token);
        await client.setBotPresence();

        client.config.general.lang === 'tr' ? console.log(`${client.user.username} hesabı ile giriş yapıldı.`) : console.log(`Logged in as ${client.user.username}.`);

        try {
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: client.slashdatas,
            });
        } catch (error) {
            console.error(error);
        }
    },
};