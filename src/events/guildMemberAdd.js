const { Events } = require("discord.js");

const sdb = require("croxydb");
sdb.setFolder("./database/");

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    execute: async (member) => {
        if (member.user.bot) return;
        if (!sdb.has(`servers_${member.guild.id}.connectedStatus`)) return;
        if (await sdb.get(`servers_${member.guild.id}.connectedStatus`) !== '1') return;
        if (!sdb.has(`memberRoles_${member.id}_${member.guild.id}`) && !sdb.has(`unClaimedRoles_${member.guild.id}_${member.id}`)) return;

        const autoRole = await sdb.get(`autoRole_${member.guild.id}`) || null;
        if (autoRole) {
            try {
                await member.roles.add(autoRole);
            } catch (error) {
                console.log(`${member.guild.id} | ${member.user.username} isimli kullanıcıya otomatik rol olan ${autoRole} rolü verilemedi!\nHata: ${error}`);
            }
        }

        const memberRoles = await sdb.get(`memberRoles_${member.id}_${member.guild.id}`);
        let memberUnClaimedRoles = await sdb.get(`unClaimedRoles_${member.guild.id}_${member.id}`);

        await memberRoles.forEach(async (role) => {
            try {
                await member.roles.add(role.id);
            } catch (error) {
                console.log(`${member.guild.id} | ${member.user.username} isimli kullanıcıya ${role.name} rolü verilemedi!\nHata: ${error}`);
            }
        });

        for await (const roleId of memberUnClaimedRoles) {
            try {
                await member.roles.add(roleId);
                memberUnClaimedRoles = memberUnClaimedRoles.filter((role) => role !== roleId);
            } catch (error) {
                console.log(`${member.guild.id} | ${member.user.username} isimli kullanıcıya ${roleId} rolü verilemedi!\nHata: ${error}`);
            }
        }

        await sdb.set(`unClaimedRoles_${member.guild.id}_${member.id}`, memberUnClaimedRoles);
    },
};