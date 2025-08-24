const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emergency')
        .setDescription('Emergency alert system')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Type of emergency')
                .setRequired(true)
                .addChoices(
                    { name: '🚨 General Emergency', value: 'general' },
                    { name: '🔥 Fire Emergency', value: 'fire' },
                    { name: '⚕️ Medical Emergency', value: 'medical' },
                    { name: '🔒 Security Breach', value: 'security' },
                    { name: '✈️ Aircraft Emergency', value: 'aircraft' },
                    { name: '🌪️ Weather Emergency', value: 'weather' },
                    { name: '🔧 Equipment Failure', value: 'equipment' },
                    { name: '📡 Communications Down', value: 'comms' }
                )
        )
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('Brief description of the emergency')
                .setRequired(true)
                .setMaxLength(500)
        )
        .addStringOption(option =>
            option
                .setName('location')
                .setDescription('Location of the emergency')
                .setRequired(false)
                .setMaxLength(100)
        ),

    async execute(interaction) {
        const emergencyType = interaction.options.getString('type');
        const description = interaction.options.getString('description');
        const location = interaction.options.getString('location') || 'Not specified';

        const emergencyInfo = {
            'general': { color: 0xFF0000, icon: '🚨', level: 'HIGH', title: 'GENERAL EMERGENCY' },
            'fire': { color: 0xFF4500, icon: '🔥', level: 'CRITICAL', title: 'FIRE EMERGENCY' },
            'medical': { color: 0xFF1493, icon: '⚕️', level: 'CRITICAL', title: 'MEDICAL EMERGENCY' },
            'security': { color: 0x8B0000, icon: '🔒', level: 'HIGH', title: 'SECURITY BREACH' },
            'aircraft': { color: 0xFF6347, icon: '✈️', level: 'HIGH', title: 'AIRCRAFT EMERGENCY' },
            'weather': { color: 0x4169E1, icon: '🌪️', level: 'MEDIUM', title: 'WEATHER EMERGENCY' },
            'equipment': { color: 0xFF8C00, icon: '🔧', level: 'MEDIUM', title: 'EQUIPMENT FAILURE' },
            'comms': { color: 0x9370DB, icon: '📡', level: 'HIGH', title: 'COMMUNICATIONS DOWN' }
        };

        const info = emergencyInfo[emergencyType];
        const alertId = `ALERT-${Date.now().toString().slice(-6)}`;

        const embed = new EmbedBuilder()
            .setTitle(`${info.icon} ${info.title}`)
            .setDescription(`**ALERT ID:** ${alertId}\n**PRIORITY LEVEL:** ${info.level}`)
            .addFields(
                { name: '📋 Description', value: description, inline: false },
                { name: '📍 Location', value: location, inline: true },
                { name: '👤 Reported By', value: interaction.user.tag, inline: true },
                { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📞 Emergency Actions', value: '• Contact emergency services if needed\n• Notify chain of command\n• Secure area if necessary\n• Document incident', inline: false }
            )
            .setColor(info.color)
            .setTimestamp()
            .setFooter({ text: `Emergency Alert System | ${alertId}` });

        // Create action buttons for admins
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`emergency_acknowledge_${alertId}`)
                    .setLabel('Acknowledge')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`emergency_respond_${alertId}`)
                    .setLabel('Responding')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🚑'),
                new ButtonBuilder()
                    .setCustomId(`emergency_resolved_${alertId}`)
                    .setLabel('Resolved')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✔️')
            );

        // Send emergency alert
        await interaction.reply({ 
            content: '@everyone', // Alert everyone for emergencies
            embeds: [embed], 
            components: [actionRow] 
        });

        // Log emergency
        console.log(`🚨 EMERGENCY ALERT: ${info.title} reported by ${interaction.user.tag} - ID: ${alertId}`);

        // If it's a critical emergency, also send DM to all admins
        if (info.level === 'CRITICAL') {
            const guild = interaction.guild;
            const adminMembers = guild.members.cache.filter(member => 
                member.permissions.has('Administrator') && !member.user.bot
            );

            for (const [id, member] of adminMembers) {
                try {
                    await member.send({ 
                        content: `🚨 **CRITICAL EMERGENCY ALERT**\nA critical emergency has been reported in ${guild.name}`, 
                        embeds: [embed] 
                    });
                } catch (error) {
                    console.error(`Failed to send emergency DM to ${member.displayName}`);
                }
            }
        }
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('emergency_')) return;

        const [action, type, alertId] = interaction.customId.split('_');
        
        let responseMessage;
        let embedColor;

        switch (type) {
            case 'acknowledge':
                responseMessage = `✅ **Emergency Acknowledged** by ${interaction.user.displayName}`;
                embedColor = 0x0099FF;
                break;
            case 'respond':
                responseMessage = `🚑 **Emergency Response Initiated** by ${interaction.user.displayName}`;
                embedColor = 0x00FF00;
                break;
            case 'resolved':
                responseMessage = `✔️ **Emergency Resolved** by ${interaction.user.displayName}`;
                embedColor = 0x808080;
                break;
            default:
                return;
        }

        const updateEmbed = new EmbedBuilder()
            .setDescription(responseMessage)
            .setColor(embedColor)
            .setTimestamp()
            .setFooter({ text: `Alert ID: ${alertId}` });

        await interaction.reply({ embeds: [updateEmbed] });
    }
};