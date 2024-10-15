const { EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

const discordTranscripts = require('discord-html-transcripts');

const sdb = require("croxydb");
sdb.setFolder("./database/");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setNameLocalizations({
            tr: 'kapat'
        })
        .setDescription('Closes the support ticket.')
        .setDescriptionLocalizations({
            tr: 'Destek talebini kapatır.'
        }),
        run: async (client, interaction) => {
            await interaction.deferReply({ ephemeral: true });
            let language = client.langFile;

            if (interaction.channel.parentId !== await sdb.get(`technicalTicketCategory_${interaction.guild.id}`) && interaction.channel.parentId !== await sdb.get(`preSalesTicketCategory_${interaction.guild.id}`)) return await interaction.editReply({ content: `${language['This channel is not a support channel!']}`, ephemeral: true });
            await client.setupTicketSystem(interaction.guild.id);
            const ticketType = interaction.channel.parentId === await sdb.get(`technicalTicketCategory_${interaction.guild.id}`) ? `${language['Technical Support']}` : `${language['Pre-Sales Support']}`;
            const ticketId = await sdb.get(`ticketId_${interaction.channel.id}`);
            let downloadLink = "";

            const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1,
                returnType: 'attachment',
                filename: interaction.channel.name + '.html',
                saveImages: true,
                footerText: "",
                poweredBy: false,
                ssr: true
            });

            await client.channels.cache.get(await sdb.get(`ticketTranscriptChannel_${interaction.guild.id}`)).send({ files: [attachment] }).then(async message => {
                await message.attachments.forEach(attachment => {
                    downloadLink = attachment.url.replace('https://cdn.discordapp.com', `${config.cdnServer.host}:${config.cdnServer.port}`).split('?ex=')[0];
                });
            });

            const ticketOwner = await sdb.get(`ticketOwner_${interaction.channel.id}`);

            if (await client.getChannelSize(interaction.guild.id, await sdb.get(`closedTicketCategory_${interaction.guild.id}`)) >= 50) {
                await client.sendLog('ticketClose', {
                    ticketCloser: interaction.user.id,
                    ticketType: ticketType,
                    ticketChannel: interaction.channel,
                    downloadLink: downloadLink,
                    ticketId: ticketId,
                    ticketOwner: ticketOwner
                })
                await client.sendLog('ticketRemove', {
                    ticketRemover: interaction.user.tag,
                    ticketChannel: interaction.channel.name,
                })
                await interaction.channel.delete();
                return;
            }

            await interaction.editReply({ content: `${language['Support request has been successfully closed!']}`, ephemeral: true });
            await interaction.channel.setParent(await sdb.get(`closedTicketCategory_${interaction.guild.id}`));

            interaction.channel.permissionOverwrites.set([
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ]);

            sdb.delete(`ticketChannel_${ticketOwner}_${interaction.guild.id}`);
            sdb.delete(`ticketOwner_${interaction.channel.id}`);
            sdb.delete(`ticketId_${interaction.channel.id}`)

            await client.sendLog('ticketClose', {
                ticketCloser: interaction.user.id,
                ticketType: ticketType,
                ticketChannel: interaction.channel,
                downloadLink: downloadLink,
                ticketId: ticketId,
                ticketOwner: ticketOwner
            })
        }
};
