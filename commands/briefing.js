const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('briefing')
        .setDescription('Quick operational status update (Admin only)')
        .addStringOption(option =>
            option
                .setName('status')
                .setDescription('Current operational status')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 DEFCON 5 - Exercise Term', value: 'defcon5' },
                    { name: '🔵 DEFCON 4 - Normal Readiness', value: 'defcon4' },
                    { name: '🟡 DEFCON 3 - Increase Readiness', value: 'defcon3' },
                    { name: '🟠 DEFCON 2 - Next Step to Nuclear War', value: 'defcon2' },
                    { name: '🔴 DEFCON 1 - Nuclear War Imminent', value: 'defcon1' },
                    { name: '✅ All Clear', value: 'clear' },
                    { name: '⚠️ Training Exercise', value: 'training' }
                )
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Additional briefing message')
                .setRequired(false)
                .setMaxLength(500)
        ),

    async execute(interaction) {
        // Check admin permissions first
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can create briefings.',
                flags: 64
            });
            return;
        }

        const status = interaction.options.getString('status');
        const message = interaction.options.getString('message') || 'No additional information provided.';

        const statusInfo = {
            'defcon5': { color: 0x00FF00, title: '🟢 DEFCON 5 - Exercise Term', description: 'Lowest state of readiness' },
            'defcon4': { color: 0x0099FF, title: '🔵 DEFCON 4 - Normal Readiness', description: 'Normal peacetime readiness' },
            'defcon3': { color: 0xFFFF00, title: '🟡 DEFCON 3 - Increase Readiness', description: 'Increase in force readiness' },
            'defcon2': { color: 0xFF9900, title: '🟠 DEFCON 2 - Next Step to Nuclear War', description: 'Next step to nuclear war' },
            'defcon1': { color: 0xFF0000, title: '🔴 DEFCON 1 - Nuclear War Imminent', description: 'Nuclear war is imminent' },
            'clear': { color: 0x00FF00, title: '✅ All Clear', description: 'Normal operations resumed' },
            'training': { color: 0x9966FF, title: '⚠️ Training Exercise', description: 'Training exercise in progress' }
        };

        const info = statusInfo[status];

        const embed = new EmbedBuilder()
            .setTitle(`📡 OPERATIONAL BRIEFING`)
            .setDescription(`**Current Status:** ${info.title}\n${info.description}`)
            .addFields(
                { name: '📋 Additional Information', value: message },
                { name: '👤 Briefing Officer', value: interaction.user.tag, inline: true },
                { name: '📅 Time', value: this.formatTimeEST(new Date()), inline: true }
            )
            .setColor(info.color)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    formatTimeEST(date) {
        try {
            // **IMPROVED: Validate input date**
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                console.error('Invalid date passed to formatTimeEST:', date);
                return 'Invalid Date';
            }
            
            // Convert to EST (UTC-5)
            const estDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
            
            // Validate conversion
            if (isNaN(estDate.getTime())) {
                console.error('Error converting date to EST:', date);
                return 'Date Conversion Error';
            }
            
            const month = String(estDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(estDate.getUTCDate()).padStart(2, '0');
            const year = estDate.getUTCFullYear();
            const hours = String(estDate.getUTCHours()).padStart(2, '0');
            const minutes = String(estDate.getUTCMinutes()).padStart(2, '0');
            
            return `${month}/${day}/${year} @ ${hours}${minutes} EST`;
        } catch (error) {
            console.error('Error in formatTimeEST:', error);
            return 'Time Format Error';
        }
    }
};