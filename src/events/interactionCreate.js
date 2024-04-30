const { ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, InteractionType, Events, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder } = require("discord.js");

const discordTranscripts = require('discord-html-transcripts');

const sdb = require("croxydb");
sdb.setFolder("./database/");

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    execute: async (interaction) => {
        let client = interaction.client;
        var config = client.config;

        let language = client.langFile;
        const currentLanguage = client.language;

        if (interaction.type === InteractionType.ApplicationCommand) {
            const command = client.slashcommands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.run(client, interaction);
                return;
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `${language['An error occurred!']}`, ephemeral: true });
                return;
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'ticketCloseButton') {
                await interaction.deferReply({ ephemeral: true });
                if (interaction.channel.parentId !== await sdb.get(`technicalTicketCategory_${interaction.guild.id}`) && interaction.channel.parentId !== await sdb.get(`preSalesTicketCategory_${interaction.guild.id}`)) return await interaction.editReply({ content: `${language['This channel is not a support channel!"']}`, ephemeral: true });
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
    
                await client.channels.cache.get(await sdb.get(`ticketLogChannel_${interaction.guild.id}`)).send({ files: [attachment] }).then(async message => {
                    await message.attachments.forEach(attachment => {
                        downloadLink = attachment.url;
                    });
                    await message.delete();
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
                        ticketChannel: interaction.channel,
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

                await client.sendLog('ticketClose', {
                    ticketCloser: interaction.user.id,
                    ticketType: ticketType,
                    ticketChannel: interaction.channel,
                    downloadLink: downloadLink,
                    ticketId: ticketId,
                    ticketOwner: ticketOwner
                })
            }

            if (interaction.customId === 'ticketRemoveButton') {
                if (interaction.channel.parentId !== await sdb.get(`closedTicketCategory_${interaction.guild.id}`)) return await interaction.reply({ content: `${language['They should close the support channel first.']}`, ephemeral: true });
                await client.setupTicketSystem(interaction.guild.id);
                await client.sendLog('ticketRemove', {
                    ticketRemover: interaction.user.tag,
                    ticketChannel: interaction.channel,
                })
                await interaction.channel.delete();
            }

            if (interaction.customId === 'ticketSetup') {
                await interaction.reply({ content: currentLanguage === 'tr' ? 'Destek modülü kuruluyor..' : 'Setting up the support module..', ephemeral: true });
                await client.setupTicketSystem(interaction.guild.id, null, interaction);
            }

            if (interaction.customId === 'autoRoleSetup') {
                const autoRole = await sdb.get(`autoRole_${interaction.guild.id}`) || ' ';

                const setupAutoRoleModal = new ModalBuilder()
                    .setTitle(currentLanguage === 'tr' ? 'Otomatik Rol Modülü' : 'Auto Role Module')
                    .setCustomId('autoRoleSetupModal')

                const roleIdInput = new TextInputBuilder()
                    .setCustomId('roleId')
                    .setLabel("Rol ID")
                    .setValue(autoRole)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const setupAutoRoleActionRow = new ActionRowBuilder().addComponents(roleIdInput);

                setupAutoRoleModal.addComponents(setupAutoRoleActionRow);

                await interaction.showModal(setupAutoRoleModal);
            }

            if (interaction.customId.startsWith('qsc-')) {
                const type = interaction.customId.replace('qsc-', '');

                switch (type) {
                    case 'ticket':
                        await interaction.reply({ content: currentLanguage === 'tr' ? 'Destek modülü kapatılıyor..' : 'Closing the support module..', ephemeral: true });
                        await client.removeTicketSystem(interaction.guild.id, null, interaction);
                        break;
                    case 'autoRole':
                        const autoRole = await sdb.get(`autoRole_${interaction.guild.id}`) || null;
                        if (!autoRole) return await interaction.reply({ content: currentLanguage === 'tr' ? 'Otomatik rol modülü zaten kapalı.' : 'Auto role module is already closed.', ephemeral: true });

                        await interaction.reply({ content: currentLanguage === 'tr' ? 'Otomatik rol modülü kapatıldı.' : 'Auto role module is closed.', ephemeral: true });
                        sdb.delete(`autoRole_${interaction.guild.id}`);
                    default:
                        break;
                }
            }

            if (interaction.customId === 'quickSetupGoBack') {
                const quickSetupsEmbed = new EmbedBuilder()
                    .setAuthor({ name: currentLanguage === 'tr' ? 'Hızlı Kurulumlar' : 'Quick Setups', iconURL: client.user.avatarURL() })
                    .setDescription(currentLanguage === 'tr' ? 'Aşağıdaki butonlardan istediğiniz modülü hızlıca kurabilirsiniz.' : 'You can quickly install the module you want using the buttons below.')
                    .setImage(currentLanguage === 'tr' ? 'https://media.discordapp.net/attachments/1188589350934548564/1193164583112810556/Group_44.png' : 'https://media.discordapp.net/attachments/1188589350934548564/1193164592268967936/Group_45.png')
                    .setColor('White');

                const quickSetupsSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId('quickSetupsSelectMenu')
                    .setPlaceholder(currentLanguage === 'tr' ? 'Bir modül seçin...' : 'Select a module...')
                    .addOptions([
                        {
                            label: currentLanguage === 'tr' ? 'Destek' : 'Ticket',
                            value: 'ticket',
                            description: currentLanguage === 'tr' ? 'Ticket modülünü yönetir.' : 'Manages the Ticket module.',
                            emoji: '🎫'
                        },
                        {
                            label: currentLanguage === 'tr' ? 'Hoşgeldin' : 'Welcome',
                            value: 'welcome',
                            description: currentLanguage === 'tr' ? 'Hoşgeldin modülünü yönetir.' : 'Manages the Welcome module.',
                            emoji: '👋'
                        },
                        {
                            label: currentLanguage === 'tr' ? 'Güle güle' : 'Goodbye',
                            value: 'goodbye',
                            description: currentLanguage === 'tr' ? 'Güle güle modülünü yönetir.' : 'Manages the Goodbye module.',
                            emoji: '👋'
                        },
                        {
                            label: currentLanguage === 'tr' ? 'Otomatik Rol' : 'Auto Role',
                            value: 'autoRole',
                            description: currentLanguage === 'tr' ? 'Otomatik Rol modülünü yönetir.' : 'Manages the Auto Role module.',
                            emoji: '⚛️'
                        },
                    ]);

                const quickSetupsActionRow = new ActionRowBuilder()
                    .addComponents(quickSetupsSelectMenu);

                await interaction.update({ embeds: [quickSetupsEmbed], components: [quickSetupsActionRow], ephemeral: true });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'ticketPannelMessageSelectMenu') {
                const ticketPannelMessageSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId('ticketPannelMessageSelectMenu')
                    .setPlaceholder(`${language['Select the support topic!']}`)
                    .addOptions([
                        {
                            label: `${language['🔧 Technical Support']}`,
                            value: 'technicalTicket',
                            description: `${language['Select this option to get technical support!']}`,
                        },
                        {
                            label: `${language['📝 Pre-Sales Support']}`,
                            value: 'pre-salesTicket',
                            description: `${language['Select this option to get pre-sales support!"']}`,
                        },
                    ]);

                const ticketPannelMessageActionRow = new ActionRowBuilder()
                    .addComponents(ticketPannelMessageSelectMenu);

                interaction.message.edit({
                    components: [ticketPannelMessageActionRow]
                });

                if (sdb.has(`ticketChannel_${interaction.user.id}_${interaction.guild.id}`)) return await interaction.reply({ content: `${language['You already have a support request!']}`, ephemeral: true });
                await client.setupTicketSystem(interaction.guild.id);
                let ticketCategoryType = interaction.values[0] === 'technicalTicket' ? true : false;
                if (await client.getChannelSize(interaction.guild.id, ticketCategoryType ? await sdb.get(`technicalTicketCategory_${interaction.guild.id}`) : await sdb.get(`preSalesTicketCategory_${interaction.guild.id}`)) >= 50) return await interaction.reply({ content: `${language['There are currently 50 open support requests, notify the administrators about this situation!']}`, ephemeral: true });

                ticketCategoryType ? sdb.has(`tticketNumbers_${interaction.guild.id}`) ? await sdb.add(`tticketNumbers_${interaction.guild.id}`, 1) : await sdb.set(`tticketNumbers_${interaction.guild.id}`, 1) : sdb.has(`pticketNumbers_${interaction.guild.id}`) ? await sdb.add(`pticketNumbers_${interaction.guild.id}`, 1) : await sdb.set(`pticketNumbers_${interaction.guild.id}`, 1);
                interaction.guild.channels.create({
                    name: `${language['support-%ticketID%'].replaceAll('%ticketID%', ticketCategoryType ? await sdb.get(`tticketNumbers_${interaction.guild.id}`) : await sdb.get(`pticketNumbers_${interaction.guild.id}`))}`,
                    type: ChannelType.GuildText,
                    parent: ticketCategoryType ? await sdb.get(`technicalTicketCategory_${interaction.guild.id}`) : await sdb.get(`preSalesTicketCategory_${interaction.guild.id}`),
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        },
                        {
                            id: await sdb.get(`ticketStaffRole_${interaction.guild.id}`),
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        }
                    ],
                }).then(async (channel) => {
                    await sdb.set(`ticketChannel_${interaction.user.id}_${interaction.guild.id}`, channel.id);
                    await sdb.set(`ticketId_${channel.id}`, ticketCategoryType ? await sdb.get(`tticketNumbers_${interaction.guild.id}`) : await sdb.get(`pticketNumbers_${interaction.guild.id}`));
                    await sdb.set(`ticketOwner_${channel.id}`, interaction.user.id);
                    await interaction.reply({ content: `${language['Your support request has been created! %channel%'].replaceAll('%channel%', channel)}`, ephemeral: true });

                    const ticketCloseButton = new ButtonBuilder()
                        .setCustomId('ticketCloseButton')
                        .setLabel(`${language['Close']}`)
                        .setStyle(ButtonStyle.Secondary);

                    const ticketRemoveButton = new ButtonBuilder()
                        .setCustomId('ticketRemoveButton')
                        .setLabel(`${language['Delete']}`)
                        .setStyle(ButtonStyle.Danger);

                    const ticketActionRow = new ActionRowBuilder()
                        .addComponents(ticketCloseButton, ticketRemoveButton);

                    const ticketEmbed = new EmbedBuilder()
                        .setAuthor({name: `${language['Gameixa New Support Request']}`, iconURL: interaction.user.avatarURL({dynamic: true})})
                        .setColor('Green')
                        .setDescription(`${language['Below are the details of the successfully opened request.\nTo close the request, click the `Close` button or type `/close`.']}`)
                        .addFields(
                            { name: `${language['👨 Request Owner']}`, value: `<@${interaction.user.id}>`, inline: true },
                            { name: `${language['📌 Request Subject']}`, value: `${ticketCategoryType ? `${language['Technical Support']}` : `${language['Pre-Sales Support']}`}`, inline: true },
                            { name: `${language['📝 Request Number']}`, value: `${ticketCategoryType ? await sdb.get(`tticketNumbers_${interaction.guild.id}`) : await sdb.get(`pticketNumbers_${interaction.guild.id}`)}`, inline: true },
                            { name: `${language['📆 Request Opening Date']}`, value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        )

                    await channel.send('@everyone').then(async (message) => {
                        await message.delete();
                    });

                    await channel.send({
                        embeds: [ticketEmbed],
                        components: [ticketActionRow]
                    });

                    await client.sendLog('ticketCreate', {
                        ticketOwner: interaction.user.id,
                        ticketType: ticketCategoryType ? `${language['Technical Support']}` : `${language['Pre-Sales Support']}`,
                        ticketChannel: channel,
                        ticketId: ticketCategoryType ? await sdb.get(`tticketNumbers_${interaction.guild.id}`) : await sdb.get(`pticketNumbers_${interaction.guild.id}`)
                    })
                });
            }

            if (interaction.customId === 'quickSetupsSelectMenu') {
                const transaction = interaction.values[0];

                switch(transaction) {
                    case 'ticket':
                        const ticketSetupEmbed = new EmbedBuilder()
                            .setAuthor({ name: currentLanguage === 'tr' ? 'Destek Kurulumu' : 'Ticket Setup', iconURL: client.user.avatarURL() })
                            .setDescription(currentLanguage === 'tr' ? 'Aşağıdaki butonlardan destek sistemini kurabilir veya iptal edebilirsiniz.' : 'You can set up or cancel the support system using the buttons below.')
                            .setImage(currentLanguage === 'tr' ? 'https://cdn.discordapp.com/attachments/1188589350934548564/1193164609121685584/Group_36.png' : 'https://cdn.discordapp.com/attachments/1188589350934548564/1193164619213185144/Group_37.png')
                            .setColor('White');

                        const setupButton = new ButtonBuilder()
                            .setCustomId('ticketSetup')
                            .setLabel(currentLanguage === 'tr' ? 'Kur' : 'Setup')
                            .setStyle(ButtonStyle.Success);

                        const cancelButton = new ButtonBuilder()
                            .setCustomId('qsc-ticket')
                            .setLabel(currentLanguage === 'tr' ? 'Kaldır' : 'Remove')
                            .setStyle(ButtonStyle.Danger);

                        const goBackButton = new ButtonBuilder()
                            .setCustomId('quickSetupGoBack')
                            .setLabel(currentLanguage === 'tr' ? 'Geri Git' : 'Go Back')
                            .setStyle(ButtonStyle.Primary)

                        const buttonActionRow = new ActionRowBuilder()
                            .addComponents(setupButton, cancelButton, goBackButton);

                        interaction.update({ embeds: [ticketSetupEmbed], components: [buttonActionRow] });
                        break;
                    case 'autoRole':
                        const autoRoleSetupEmbed = new EmbedBuilder()
                            .setAuthor({ name: currentLanguage === 'tr' ? 'Otomatik Rol Kurulumu' : 'Auto Role Setup', iconURL: client.user.avatarURL() })
                            .setDescription(currentLanguage === 'tr' ? 'Aşağıdaki butonlardan otomatik rol sistemini kurabilir veya iptal edebilirsiniz.' : 'You can set up or cancel the auto role system using the buttons below.')
                            .setImage(currentLanguage === 'tr' ? 'https://cdn.discordapp.com/attachments/1188589350934548564/1193164518046568538/Group_42.png' : 'https://cdn.discordapp.com/attachments/1188589350934548564/1193164544625868940/Group_43.png')
                            .setColor('White');

                        const autoRoleSetupButton = new ButtonBuilder()
                            .setCustomId('autoRoleSetup')
                            .setLabel(currentLanguage === 'tr' ? 'Kur' : 'Setup')
                            .setStyle(ButtonStyle.Success);

                        const autoRoleCancelButton = new ButtonBuilder()
                            .setCustomId('qsc-autoRole')
                            .setLabel(currentLanguage === 'tr' ? 'Kaldır' : 'Remove')
                            .setStyle(ButtonStyle.Danger);

                        const autoRoleGoBackButton = new ButtonBuilder()
                            .setCustomId('quickSetupGoBack')
                            .setLabel(currentLanguage === 'tr' ? 'Geri Git' : 'Go Back')
                            .setStyle(ButtonStyle.Primary)

                        const autoRoleButtonActionRow = new ActionRowBuilder()
                            .addComponents(autoRoleSetupButton, autoRoleCancelButton, autoRoleGoBackButton);

                        interaction.update({ embeds: [autoRoleSetupEmbed], components: [autoRoleButtonActionRow] });
                        break;
                    default:
                        interaction.reply({ content: currentLanguage === 'tr' ? 'Bu özellik henüz yayımlanmadı!' : 'This feature has not been released yet!', ephemeral: true });
                        break;
                }
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'autoRoleSetupModal') {
                const roleId = interaction.fields.getTextInputValue('roleId') || null;

                if (!roleId) return interaction.reply({ content: 'Rol ID belirtilmedi.', ephemeral: true });

                if (!interaction.guild.roles.cache.has(roleId)) return interaction.reply({ content: 'Belirtilen rol sunucuda bulunamadı.', ephemeral: true });

                await sdb.set(`autoRole_${interaction.guild.id}`, roleId);

                interaction.reply({ content: 'Otomatik rol modülü başarılı bir şekilde kuruldu.', ephemeral: true });
            }
        }
    },
};