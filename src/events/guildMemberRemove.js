const { Events } = require("discord.js");

const sdb = require("croxydb");
sdb.setFolder("./database/");

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    execute: async (member) => {
        if (!sdb.has(`servers_${member.guild.id}.connectedStatus`)) return;
        if (await sdb.get(`servers_${member.guild.id}.connectedStatus`) !== '1') return;
        const memberRoles = [];
        await member.roles.cache.forEach(async (role) => {
            if (role.name === "@everyone" || role.id === member.guild.id) return;
            memberRoles.push({
                id: role.id,
                name: role.name,
            });
        });

        await sdb.set(`memberRoles_${member.id}_${member.guild.id}`, memberRoles);
    },
};
