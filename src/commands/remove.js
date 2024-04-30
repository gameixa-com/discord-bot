const { EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

const sdb = require("croxydb");
sdb.setFolder("./database/");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setNameLocalizations({
            tr: 'sil'
        })
        .setDescription('Deletes the support ticket.')
        .setDescriptionLocalizations({
            tr: 'Destek talebini siler.'
        }),
        run: async (client, interaction) => {
            let language = client.langFile;
        
            if (interaction.channel.parentId !== await sdb.get(`closedTicketCategory_${interaction.guild.id}`)) return await interaction.reply({ content: `${language['They should close the support channel first.']}`, ephemeral: true });
            await client.setupTicketSystem(interaction.guild.id);
            await client.sendLog('ticketRemove', {
                ticketRemover: interaction.user.tag,
                ticketChannel: interaction.channel,
            })
            await interaction.channel.delete();
        }
};
