const { EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, Attachment } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

const sdb = require("croxydb");
sdb.setFolder("./database/");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quick-setups')
        .setNameLocalizations({
            tr: 'hızlı-kurulumlar'
        })
        .setDescription('A panel for quick module installations.')
        .setDescriptionLocalizations({
            tr: 'Hızlı modül kurulumları için bir panel.'
        }),
        run: async (client, interaction) => {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: 'Bu komutu kullanabilmek için `Yönetici` yetkisine sahip olmalısınız.', ephemeral: true });
            const currentLanguage = client.language;

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

            await interaction.reply({ embeds: [quickSetupsEmbed], components: [quickSetupsActionRow], ephemeral: true });
        }
}