const { EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionOverwrites, BitField, GatewayIntentBits } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

const sdb = require("croxydb");
sdb.setFolder("./database/");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-user')
        .setNameLocalizations({
            tr: 'kullanıcı-ekle'
        })
        .setDescription('Adds a user to the support ticket.')
        .setDescriptionLocalizations({
            tr: 'Destek talebine bir kullanıcı ekler.'
        })
        .addUserOption(option => option
            .setName('user')
            .setNameLocalizations({
                tr: 'kullanıcı'
            })
            .setDescription('Select the user you want to add to the support ticket.')
            .setDescriptionLocalizations({
                tr: 'Destek talebine eklemek istediğiniz kullanıcıyı seçin.'
            })
            .setRequired(true)
        ),
        run: async (client, interaction) => {
            let language = client.langFile;
        
            await client.setupTicketSystem(interaction.guild.id);
            if (interaction.channel.parentId !== await sdb.get(`technicalTicketCategory_${interaction.guild.id}`) && interaction.channel.parentId !== await sdb.get(`preSalesTicketCategory_${interaction.guild.id}`)) return await interaction.reply({ content: `${language['This channel is not a support channel!']}`, ephemeral: true });
            if (interaction.user.id !== await sdb.get(`ticketOwner_${interaction.channel.id}`) && !interaction.member.roles.cache.has(await sdb.get(`supportRole_${interaction.guild.id}`)) && interaction.member.permissions.has(PermissionsBitField.FLAGS.ADMINISTRATOR)) return await interaction.reply({ content: `${language['Only the support request owner, support team, and administrators can use this command!']}`, ephemeral: true });
            const ticketType = interaction.channel.parentId === await sdb.get(`technicalTicketCategory_${interaction.guild.id}`) ? `${language['Technical Support']}` : `${language['Pre-Sales Support']}`;

            const ticketOwner = await sdb.get(`ticketOwner_${interaction.channel.id}`);

            if (interaction.options.getMember('user').user.id === ticketOwner) return await interaction.reply({ content: `${language['This user is already the owner of this support request!']}`, ephemeral: true });

            if (await sdb.get(`ticketUsers_${interaction.channel.id}`) && (await sdb.get(`ticketUsers_${interaction.channel.id}`)).includes(interaction.options.getMember('user').user.id)) return await interaction.reply({ content: `${language['This user is already in this support request!']}`, ephemeral: true });

            await interaction.channel.permissionOverwrites.edit(interaction.options.getMember('user').user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.channel.send(`${language['%user% user has been added to the support request!'].replaceAll('%user%', interaction.options.getMember('user').user)}`);
            await interaction.reply({ content: `${language['User added successfully!']}`, ephemeral: true });

            await client.sendLog('ticketAddUser', {
                ticketAdder: interaction.user.tag,
                ticketType: ticketType,
                ticketChannel: interaction.channel.name,
                ticketAddedUser: interaction.options.getMember('user').user.tag,
            })

            if (!await sdb.get(`ticketUsers_${interaction.channel.id}`)) await sdb.set(`ticketUsers_${interaction.channel.id}`, [interaction.options.getMember('user').user.id]);
            else sdb.push(`ticketUsers_${interaction.channel.id}`, interaction.options.getMember('user').user.id);
        }
};
