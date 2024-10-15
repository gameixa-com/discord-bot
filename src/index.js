const { WebhookClient, Collection, PermissionsBitField, Client, ChannelType, ActivityType, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const client = new Client({ intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMembers', 'GuildPresences'] });
let clientStatus = false;

const express = require('express');
const app = express();
app.use(express.urlencoded({ 
    extended: true
}));

const { readdirSync, readFileSync } = require('node:fs');

var configLoader = require('node-env-config-file-loader');
var config = configLoader.load('./config.yml');

const sdb = require('croxydb');
sdb.setFolder("./database/");

const trLangFile = JSON.parse(readFileSync('./languages/tr.json', 'utf8'));
const enLangFile = JSON.parse(readFileSync('./languages/en.json', 'utf8'));
const customLangFile = JSON.parse(readFileSync('./languages/custom.json', 'utf8'));

client.slashcommands = new Collection();
client.slashdatas = [];
client.guildslashdatas = [];



const slashcommands = [];
readdirSync("./src/commands").forEach(async (file) => {
    const command = await require(__dirname + `/commands/${file}`);
    config.debug.logs ? config.general.lang === 'tr' ? console.log(`[LOG] ${command.data.name} komutu yüklendi!`) : console.log(`[LOG] ${command.data.name} command loaded!`) : '';

    client.slashdatas.push(command.data.toJSON());
    client.slashcommands.set(command.data.name, command);
});



readdirSync("./src/events").forEach(async (file) => {
    const event = await require(__dirname + `/events/${file}`);

    config.debug.logs ? config.general.lang === 'tr' ? console.log(`[LOG] ${file.split('.js')[0]} eventi yüklendi!`) : console.log(`[LOG] ${file.split('.js')[0]} event loaded!`) : '';
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
});



app.post('/api/giveRole', checkUserAgent, async (req, res) => {
    if (!clientStatus) {
        config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verme API\'si çalıştırılamadı, bot aktif değil!') : console.log('[LOG] Role giving API could not be run, bot is not active!') : '';
        res.send({ status: false, message: 'Bot not active!' });
        return;
    }

    const body = req.body || {};
    console.log(body);

    if (!body.guildID && !body.roles && !body.discordID && !body.type) {
        config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verme API\'si çalıştırılamadı, eksik parametre!') : console.log('[LOG] Role giving API could not be run, missing parameter!') : '';
        res.send({ status: false, message: body }); 
        return;
    }

    await checkAndCreateLogChannel(body.guildID);

    let guild = client.guilds.cache.has(body.guildID) ? client.guilds.cache.get(body.guildID) : client.guilds.fetch(body.guildID).catch(() => { null });
    if (!guild) return res.send({ status: false, message: 'Guild not found!' });

    const currentLanguage = client.language;
    if (body.type === 2 || body.type === '2') {
        if (Array.isArray(body.roles)) body.roles = [...new Set(body.roles)];
        body.roles.forEach(async roleId => {
            if (Array.isArray(roleId)) {
                roleId = [...new Set(roleId)];
                roleId.forEach(async roleId => {
                    let role = guild.roles.cache.has(roleId) ? guild.roles.cache.get(roleId) : await guild.roles.fetch(roleId).catch(() => {null});

                    let logChannel = guild.channels.cache.has(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) ? guild.channels.cache.get(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) : await guild.channels.fetch(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)).catch(() => {null});
                    if (!logChannel) config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verdirilmeye çalışan sunucuda log kanalı yok! sunucu id\'si ' + String(body.guildID)) : console.log('[LOG] There is no log channel in the server trying to give the role! server id ' + String(body.guildID)) : '';

                    if (!role) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına \`${roleId}\` rolü verilemedi, sunucuda bu rol yer almıyor!` : `<@${body.discordID}> user could not be given the role \`${roleId}\`, this role does not exist in the server!`) : false;

                    let targetMember = guild.members.cache.has(body.discordID) ? guild.members.cache.get(body.discordID) : await guild.members.fetch(body.discordID).catch(() => {null});
                    if (!targetMember) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${typeof role === undefined ? '\`\`' : `${role}`} rolü verilemedi, kullanıcı sunucuda yer almıyor!` : `<@${body.discordID}> user could not be given the role ${typeof role === undefined ? '\`\`' : `${role}`}, this user does not exist in the server!`) : false;
                    
                    if (!role.editable) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${role} rolü verilemedi, rolüm bu rolün altında kalıyor!` : `<@${body.discordID}> user could not be given the role ${role}, my role is below this role!`) : false;

                    await targetMember.roles.add(roleId);
                });
            } else {
                let role = guild.roles.cache.has(roleId) ? guild.roles.cache.get(roleId) : await guild.roles.fetch(roleId).catch(() => {null});

                let logChannel = guild.channels.cache.has(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) ? guild.channels.cache.get(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) : await guild.channels.fetch(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)).catch(() => {null});
                if (!logChannel) config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verdirilmeye çalışan sunucuda log kanalı yok! sunucu id\'si ' + String(body.guildID)) : console.log('[LOG] There is no log channel in the server trying to give the role! server id ' + String(body.guildID)) : '';

                if (!role) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına \`${roleId}\` rolü verilemedi, sunucuda bu rol yer almıyor!` : `<@${body.discordID}> user could not be given the role \`${roleId}\`, this role does not exist in the server!`) : false;

                let targetMember = guild.members.cache.has(body.discordID) ? guild.members.cache.get(body.discordID) : await guild.members.fetch(body.discordID).catch(() => {null});
                if (!targetMember) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${typeof role === undefined ? '\`\`' : `${role}`} rolü verilemedi, kullanıcı sunucuda yer almıyor!` : `<@${body.discordID}> user could not be given the role ${typeof role === undefined ? '\`\`' : `${role}`}, this user does not exist in the server!`) : false;
                
                if (!role.editable) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${role} rolü verilemedi, rolüm bu rolün altında kalıyor!` : `<@${body.discordID}> user could not be given the role ${role}, my role is below this role!`) : false;

                await targetMember.roles.add(roleId);
            }
        });
    } else {
        config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verme api türü ' + String(body.type) + ' döndü, herhangibir işlem yapılmadı!') : console.log('[LOG] Role giving api type ' + String(body.type) + ' returned, no operation was performed!') : '';
    }

    config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verme API\'si çalıştırıldı!') : console.log('[LOG] Role giving API has been run!') : '';
    return res.send({ status: true, message: body });
});



app.post('/api/takeRole', checkUserAgent, async (req, res) => {
    if (!clientStatus) {
        config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol alma API\'si çalıştırılamadı, bot aktif değil!') : console.log('[LOG] Role taking API could not be run, bot is not active!') : '';
        return res.send({ status: false, message: 'Bot not active!' });
    }

    const body = req.body || {};
    console.log(body);

    if (!body.guildID && !body.roles && !body.discordID && !body.type) {
        config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol alma API\'si çalıştırılamadı, eksik parametre!') : console.log('[LOG] Role taking API could not be run, missing parameter!') : '';
        return res.send({ status: false, message: body });
    }

    await checkAndCreateLogChannel(body.guildID);

    let guild = client.guilds.cache.has(body.guildID) ? client.guilds.cache.get(body.guildID) : client.guilds.fetch(body.guildID).catch(() => { null });
    if (!guild) return res.send({ status: false, message: 'Guild not found!' });

    const currentLanguage = client.language;
    if (body.type === 1 || body.type === "1") {
        if (Array.isArray(body.roles)) body.roles = [...new Set(body.roles)];
        body.roles.forEach(async roleId => {
            if (Array.isArray(roleId)) {
                roleId = [...new Set(roleId)];
                roleId.forEach(async roleId => {
                    let role = guild.roles.cache.has(roleId) ? guild.roles.cache.get(roleId) : await guild.roles.fetch(roleId).catch(() => {null});

                    let logChannel = guild.channels.cache.has(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) ? guild.channels.cache.get(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) : await guild.channels.fetch(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)).catch(() => {null});
                    if (!logChannel) config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verdirilmeye çalışan sunucuda log kanalı yok! sunucu id\'si ' + String(body.guildID)) : console.log('[LOG] There is no log channel in the server trying to give the role! server id ' + String(body.guildID)) : '';

                    if (!role) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına \`${roleId}\` rolü alınamadı, sunucuda bu rol yer almıyor!` : `<@${body.discordID}> user could not be taken the role \`${roleId}\`, this role does not exist in the server!`) : false;

                    let targetMember = guild.members.cache.has(body.discordID) ? guild.members.cache.get(body.discordID) : await guild.members.fetch(body.discordID).catch(() => {null});
                    if (!targetMember) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${typeof role === undefined ? '\`\`' : `${role}`} rolü alınamadı, kullanıcı sunucuda yer almıyor!` : `<@${body.discordID}> user could not be taken the role ${typeof role === undefined ? '\`\`' : `${role}`}, this user does not exist in the server!`) : false;
                    
                    if (!role.editable) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${role} rolü alınamadı, rolüm bu rolün altında kalıyor!` : `<@${body.discordID}> user could not be taken the role ${role}, my role is below this role!`) : false;

                    await targetMember.roles.remove(roleId);
                });
            } else {
                let role = guild.roles.cache.has(roleId) ? guild.roles.cache.get(roleId) : await guild.roles.fetch(roleId).catch(() => {null});

                let logChannel = guild.channels.cache.has(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) ? guild.channels.cache.get(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)) : await guild.channels.fetch(await sdb.get(`gameixaOauthLogChannel_${body.guildID}`)).catch(() => {null});
                if (!logChannel) config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol verdirilmeye çalışan sunucuda log kanalı yok! sunucu id\'si ' + String(body.guildID)) : console.log('[LOG] There is no log channel in the server trying to give the role! server id ' + String(body.guildID)) : '';

                if (!role) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına \`${roleId}\` rolü alınamadı, sunucuda bu rol yer almıyor!` : `<@${body.discordID}> user could not be taken the role \`${roleId}\`, this role does not exist in the server!`) : false;

                let targetMember = guild.members.cache.has(body.discordID) ? guild.members.cache.get(body.discordID) : await guild.members.fetch(body.discordID).catch(() => {null});
                if (!targetMember) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${typeof role === undefined ? '\`\`' : `${role}`} rolü alınamadı, kullanıcı sunucuda yer almıyor!` : `<@${body.discordID}> user could not be taken the role ${typeof role === undefined ? '\`\`' : `${role}`}, this user does not exist in the server!`) : false;
                
                if (!role.editable) return logChannel ? logChannel.send(currentLanguage === 'tr' ? `<@${body.discordID}> kullanıcısına ${role} rolü alınamadı, rolüm bu rolün altında kalıyor!` : `<@${body.discordID}> user could not be taken the role ${role}, my role is below this role!`) : false;

                await targetMember.roles.remove(roleId);
            }
        });
    } else {
        config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol alma api türü ' + String(body.type) + ' döndü, herhangibir işlem yapılmadı!') : console.log('[LOG] Role taking api type ' + String(body.type) + ' returned, no operation was performed!') : '';
    }

    config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] Rol alma API\'si çalıştırıldı!') : console.log('[LOG] Role taking API has been run!') : '';
    return res.send({ status: true, message: body });
});



async function checkUserAgent(req, res, next) {
    if (req.headers['user-agent'] !== config.server.apiKey) {
        config.debug.logs ? config.general.lang === 'tr' ? console.log('[LOG] API\'ye yetkisiz erişim sağlandı!') : console.log('[LOG] Unauthorized access to the API!') : '';
        return res.send({
            status: false,
            message: req.headers
        });
    }

    next();
}



async function setupTicketSystem(guildId, channel, interaction) {
    let language = client.langFile;

    let ticketStaffRole = sdb.has(`ticketStaffRole_${guildId}`) ? await client.guilds.cache.get(guildId).roles.cache.get(await sdb.get(`ticketStaffRole_${guildId}`)) : null;
    let technicalTicketCategory = sdb.has(`technicalTicketCategory_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`technicalTicketCategory_${guildId}`)) : null;
    let preSalesTicketCategory = sdb.has(`preSalesTicketCategory_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`preSalesTicketCategory_${guildId}`)) : null;
    let closedTicketCategory = sdb.has(`closedTicketCategory_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`closedTicketCategory_${guildId}`)) : null;
    let ticketLogChannel = sdb.has(`ticketLogChannel_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`ticketLogChannel_${guildId}`)) : null;
    let ticketTranscriptChannel = sdb.has(`ticketTranscriptChannel_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`ticketTranscriptChannel_${guildId}`)) : null;
    let ticketPannelMessageChannel = sdb.has(`ticketPannelMessageChannel_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`ticketPannelMessageChannel_${guildId}`)) : null;
    let ticketPannelMessage = sdb.has(`ticketPannelMessage_${guildId}`) ? ticketPannelMessageChannel ? await ticketPannelMessageChannel.messages.fetch(await sdb.get(`ticketPannelMessage_${guildId}`)).catch(() => {}) : null : null;

    if (ticketStaffRole && technicalTicketCategory && preSalesTicketCategory && closedTicketCategory && ticketLogChannel && ticketTranscriptChannel && ticketPannelMessageChannel && ticketPannelMessage) {
        if (interaction) {
            return interaction.editReply({ content: `${language['Ticket system is already installed!']}`, ephemeral: true });
        } else if (channel) {
            return channel.send(`${language['Ticket system is already installed!']}`)
        } else {
            return true;
        }
    }

    if (!ticketStaffRole) {
        const newTicketStaffRole = await client.guilds.cache.get(guildId).roles.create({
            name: `${language['Support Team']}`,
            color: 1752220,
        });
        await sdb.set(`ticketStaffRole_${guildId}`, String(newTicketStaffRole.id));
    }

    if (!technicalTicketCategory) {
        const newOpenedTicketCategory = await client.guilds.cache.get(guildId).channels.create({
            name: `${language['Technical Tickets']}`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guildId,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        await sdb.set(`technicalTicketCategory_${guildId}`, String(newOpenedTicketCategory.id));
    }

    if (!preSalesTicketCategory) {
        const newPreSalesTicketCategory = await client.guilds.cache.get(guildId).channels.create({
            name: `${language['Pre-Sales Tickets']}`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guildId,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        await sdb.set(`preSalesTicketCategory_${guildId}`, String(newPreSalesTicketCategory.id));
    }

    if (!closedTicketCategory) {
        const newClosedTicketCategory = await client.guilds.cache.get(guildId).channels.create({
            name: `${language['Closed Tickets']}`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guildId,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        await sdb.set(`closedTicketCategory_${guildId}`, String(newClosedTicketCategory.id));
    }
 
    if (!ticketLogChannel) {
        const newTicketLogChannel = await client.guilds.cache.get(guildId).channels.create({
            name: `${language['ticket-log']}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guildId,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        await sdb.set(`ticketLogChannel_${guildId}`, String(newTicketLogChannel.id));
    }

    if (!ticketTranscriptChannel) {
        const newTicketTranscriptChannel = await client.guilds.cache.get(guildId).channels.create({
            name: `${language['ticket-transcript']}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guildId,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        await sdb.set(`ticketTranscriptChannel_${guildId}`, String(newTicketTranscriptChannel.id));
    }

    if (!ticketPannelMessageChannel) {
        const newTicketPannelMessageChannel = await client.guilds.cache.get(guildId).channels.create({
            name: `${language['ticket-panel']}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guildId,
                    deny: [PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        ticketPannelMessageChannel = newTicketPannelMessageChannel;
        await sdb.set(`ticketPannelMessageChannel_${guildId}`, String(newTicketPannelMessageChannel.id));
    }

    if (!ticketPannelMessage) {
        const ticketPannelMessageEmbed = new EmbedBuilder()
            .setTitle(`${language['Gameixa Support Menu']}`)
            .setDescription(`${language['> You can choose the support topic from the menu below!\n> \n> Do not open a support ticket unnecessarily!']}`)
            .setColor('Aqua')
            .setThumbnail('https://i.hizliresim.com/swb15i0.png')
            .setFooter({text: '© TeamScript @2024'});

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
                    description: `${language['Select this option to get pre-sales support!']}`,
                },
            ]);

        const ticketPannelMessageActionRow = new ActionRowBuilder()
            .addComponents(ticketPannelMessageSelectMenu);

        const newTicketPannelMessage = await ticketPannelMessageChannel.send({
            embeds: [ticketPannelMessageEmbed],
            components: [ticketPannelMessageActionRow],
        });
        await sdb.set(`ticketPannelMessage_${guildId}`, String(newTicketPannelMessage.id));
    }

    if (interaction) {
        return interaction.editReply({ content: `${language['Ticket system has been successfully installed!']}`, ephemeral: true });
    } else if (channel) {
        return channel.send(`${language['Ticket system has been successfully installed!']}`)
    } else {
        return true;
    }
}
client.setupTicketSystem = setupTicketSystem;



async function removeTicketSystem(guildId, channel, interaction) {
    let ticketStaffRole = sdb.has(`ticketStaffRole_${guildId}`) ? await client.guilds.cache.get(guildId).roles.cache.get(await sdb.get(`ticketStaffRole_${guildId}`)) : null;
    let technicalTicketCategory = sdb.has(`technicalTicketCategory_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`technicalTicketCategory_${guildId}`)) : null;
    let preSalesTicketCategory = sdb.has(`preSalesTicketCategory_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`preSalesTicketCategory_${guildId}`)) : null;
    let closedTicketCategory = sdb.has(`closedTicketCategory_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`closedTicketCategory_${guildId}`)) : null;
    let ticketLogChannel = sdb.has(`ticketLogChannel_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`ticketLogChannel_${guildId}`)) : null;
    let ticketTranscriptChannel = sdb.has(`ticketTranscriptChannel_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`ticketTranscriptChannel_${guildId}`)) : null;
    let ticketPannelMessageChannel = sdb.has(`ticketPannelMessageChannel_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.get(await sdb.get(`ticketPannelMessageChannel_${guildId}`)) : null;
    let ticketPannelMessage = sdb.has(`ticketPannelMessage_${guildId}`) ? ticketPannelMessageChannel ? await ticketPannelMessageChannel.messages.fetch(await sdb.get(`ticketPannelMessage_${guildId}`)).catch(() => {}) : null : null;

    sdb.delete(`modules_${guildId}.ticket`);

    if (ticketStaffRole) {
        await ticketStaffRole.delete();
        sdb.delete(`ticketStaffRole_${guildId}`);
    }

    if (technicalTicketCategory) {
        await technicalTicketCategory.delete();
        sdb.delete(`technicalTicketCategory_${guildId}`);
    }

    if (preSalesTicketCategory) {
        await preSalesTicketCategory.delete();
        sdb.delete(`preSalesTicketCategory_${guildId}`);
    }

    if (closedTicketCategory) {
        await closedTicketCategory.delete();
        sdb.delete(`closedTicketCategory_${guildId}`);
    }

    if (ticketLogChannel) {
        await ticketLogChannel.delete();
        sdb.delete(`ticketLogChannel_${guildId}`);
    }

    if (ticketTranscriptChannel) {
        await ticketTranscriptChannel.delete();
        sdb.delete(`ticketTranscriptChannel_${guildId}`);
    }

    if (ticketPannelMessage) {
        await ticketPannelMessage.delete();
        sdb.delete(`ticketPannelMessage_${guildId}`);
    }

    if (ticketPannelMessageChannel) {
        await ticketPannelMessageChannel.delete();
        sdb.delete(`ticketPannelMessageChannel_${guildId}`);
    }
    
    const currentLanguage = client.language;
    if (interaction) {
        return interaction.editReply({ content: currentLanguage === 'tr' ? 'Başarılı bir şekilde destek modülü kapatıldı.' : 'The support module has been successfully turned off.', ephemeral: true });
    } else if (channel) {
        return channel.send(currentLanguage === 'tr' ? `Başarılı bir şekilde destek modülü kapatıldı.` : `The support module has been successfully turned off.`)
    } else {
        return true;
    }
}
client.removeTicketSystem = removeTicketSystem;



async function checkAndCreateLogChannel(guildId) {
    let ticketLogChannel = sdb.has(`gameixaOauthLogChannel_${guildId}`) ? await client.guilds.cache.get(guildId).channels.cache.has(await sdb.get(`gameixaOauthLogChannel_${guildId}`)) : null;

    if (!ticketLogChannel) {
        const newTicketLogChannel = await client.guilds.cache.get(guildId).channels.create({
            name: `gameixa-oauth-logs`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guildId,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        await sdb.set(`gameixaOauthLogChannel_${guildId}`, String(newTicketLogChannel.id));
    }
}
client.checkAndCreateLogChannel = checkAndCreateLogChannel;



async function getChannelSize(guildId, categoryId) {
    let channelSize = 0;
    const guild = await client.guilds.cache.has(guildId) ? await client.guilds.cache.get(guildId) : await client.guilds.fetch(guildId).then(guild => guild).catch(() => null);
    if (!guild) return channelSize;
    
    const x = await guild.channels.cache.forEach((channel) => {
        if (channel.parentId === categoryId) channelSize++;
    });

    return channelSize;
}
client.getChannelSize = getChannelSize;



async function sendLog(type, variables) {
    let language = client.langFile;

    if (type === 'ticketCreate') {
        const ticketCreateEmbed = new EmbedBuilder()
            .setAuthor({ name: `${language['Gameixa | Support Opened | Logs']}`, iconURL: client.user.avatarURL() })
            .setColor('Green')
            .addFields(
                { name: `${language['Support ID']}`, value: `${variables.ticketId}`, inline: true },
                { name: `${language['Support Owner']}`, value: `<@${variables.ticketOwner}>`, inline: true },
                { name: `${language['Support Category']}`, value: `${variables.ticketType}`, inline: true },
                { name: `${language['Support Opening Date']}`, value: `<t:${Math.floor(variables.ticketChannel.createdTimestamp / 1000).toString().split('.')[0]}:R>`, inline: true },
            )

        await client.channels.cache.get(await sdb.get(`ticketLogChannel_${variables.ticketChannel.guild.id}`)).send({ embeds: [ticketCreateEmbed] });
    }

    if (type === 'ticketClose') {
        const ticketCloseEmbed = new EmbedBuilder()
            .setAuthor({ name: `${language['Gameixa | Support Closed | Logs']}`, iconURL: client.user.avatarURL() })
            .setColor('Red')
            .addFields(
                { name: `${language['Support ID']}`, value: `${variables.ticketId}`, inline: true },
                { name: `${language['Support Owner']}`, value: `<@${variables.ticketOwner}>`, inline: true },
                { name: `${language['Closed by']}`, value: `<@${variables.ticketCloser}>`, inline: true },
                { name: `${language['Support Category']}`, value: `${variables.ticketType}`, inline: true },
                { name: `${language['Support Archive']}`, value: `[${language['Click']}](${variables.downloadLink})`, inline: true },
                { name: `${language['Support Opening Date']}`, value: `<t:${Math.floor(variables.ticketChannel.createdTimestamp / 1000).toString().split('.')[0]}:R>`, inline: true },
            )

        await client.channels.cache.get(await sdb.get(`ticketLogChannel_${variables.ticketChannel.guild.id}`)).send({ embeds: [ticketCloseEmbed] });
        await client.users.cache.get(variables.ticketOwner).send({ embeds: [ticketCloseEmbed] }).catch(() => {});
    }

    if (type === 'ticketRemove') {
        const ticketRemoveEmbed = new EmbedBuilder()
            .setTitle(`${language['A support request has been deleted!']}`)
            .setDescription(`${language['> Support request named `%ticketRemover%` was deleted by user `%ticketChannelName%`!'].replaceAll('%ticketRemover%', variables.ticketRemover).replaceAll('%ticketChannelName%', variables.ticketChannel.name)}`)
            .setColor('Aqua')
            .setFooter({text: '© TeamScript @2024'});

        await client.channels.cache.get(await sdb.get(`ticketLogChannel_${variables.ticketChannel.guild.id}`)).send({ embeds: [ticketRemoveEmbed] });
    }
}
client.sendLog = sendLog;



let textResponseI = 0;
async function setBotPresence() {
    clientStatus = true;
    setInterval(async () => {
        if (textResponseI === config.bot.status.text.length) textResponseI = 0;
        
        let presenceType = ActivityType.Playing;
        let presenceStatus = 'online';
        let textResponse = config.bot.status.text[textResponseI];

        if (config.bot.status.activity === 'playing' || config.bot.status.activity === 'PLAYING') presenceType = ActivityType.Playing;
        if (config.bot.status.activity === 'watching' || config.bot.status.activity === 'WATCHING') presenceType = ActivityType.Watching;
        if (config.bot.status.activity === 'listening' || config.bot.status.activity === 'LISTENING') presenceType = ActivityType.Listening;
        if (config.bot.status.activity === 'streaming' || config.bot.status.activity === 'STREAMING') presenceType = ActivityType.Streaming;
        if (config.bot.status.activity === 'competing' || config.bot.status.activity === 'COMPETING') presenceType = ActivityType.Competing;
        if (config.bot.status.status === 'online' || config.bot.status.status === 'ONLINE') presenceStatus = 'online';
        if (config.bot.status.status === 'idle' || config.bot.status.status === 'IDLE') presenceStatus = 'idle';
        if (config.bot.status.status === 'dnd' || config.bot.status.status === 'DND') presenceStatus = 'dnd';
        if (config.bot.status.status === 'invisible' || config.bot.status.status === 'INVISIBLE') presenceStatus = 'invisible';

        if (config.bot.status.activity === 'streaming' || config.bot.status.activity === 'STREAMING') {
            client.user.setPresence({
                activities: [{ name: `${textResponse.replaceAll('%usersCount%', client.guilds.cache.reduce((a, b) => a + b.memberCount, 0))}`, type: presenceType, url: config.bot.status.twitch }],
                status: presenceStatus,
            });
            textResponseI++;
        } else {
            client.user.setPresence({
                activities: [{ name: `${textResponse.replaceAll('%usersCount%', client.guilds.cache.reduce((a, b) => a + b.memberCount, 0))}`, type: presenceType }],
                status: presenceStatus,
            });
            textResponseI++;
        }
    }, 30000);
}
client.setBotPresence = setBotPresence;


client.config = config;
client.langFile = config.general.lang === 'tr' ? trLangFile : config.general.lang === 'en' ? enLangFile : customLangFile;
client.language = config.general.lang;



client.login(config.bot.token).then(async () => {
    app.listen(config.server.port, () => config.general.lang === 'tr' ? console.log(`${config.server.port} portu ile api sunucusu aktif edildi!`) : console.log(`The api server has been activated with port ${config.server.port}!`));
    const cdnServer = require('./lib/cdnServer');
});