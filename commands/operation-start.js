
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

// Store active operations (in production, use a database)
const activeOperations = new Map();

// Store operation scheduling data temporarily
const operationSchedules = new Map();

// Target role ID for operation notifications
const TARGET_ROLE_ID = '1409027687736938537';

// Operation details channel ID
const OPERATION_DETAILS_CHANNEL_ID = '1403996752314372117';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('operation')
        .setDescription('Operation management commands (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new operation')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('Schedule an operation and notify role members')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Operation date (e.g., 9/23 or 12/15)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Operation time in EST (e.g., 12:20 or 18:30)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can manage operations.',
                flags: 64
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            // Create modal for operation start
            const modal = new ModalBuilder()
                .setCustomId('operation_start_form')
                .setTitle('Start New Operation');

            const operationNameInput = new TextInputBuilder()
                .setCustomId('operation_name')
                .setLabel('Operation Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter operation name...')
                .setRequired(true)
                .setMaxLength(100);

            const operationDetailsInput = new TextInputBuilder()
                .setCustomId('operation_details')
                .setLabel('Operation Details')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter operation details and objectives...')
                .setRequired(true)
                .setMaxLength(2000);

            const firstActionRow = new ActionRowBuilder().addComponents(operationNameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(operationDetailsInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);

        } else if (subcommand === 'schedule') {
            const date = interaction.options.getString('date');
            const time = interaction.options.getString('time');

            // Create modal for operation scheduling
            const modal = new ModalBuilder()
                .setCustomId(`operation_schedule_form_${Date.now()}`)
                .setTitle('Schedule Operation');

            const operationNameInput = new TextInputBuilder()
                .setCustomId('operation_name')
                .setLabel('Operation Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter operation name...')
                .setRequired(true)
                .setMaxLength(100);

            const operationDetailsInput = new TextInputBuilder()
                .setCustomId('operation_details')
                .setLabel('Operation Details')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter operation details...')
                .setRequired(true)
                .setMaxLength(2000);

            const firstActionRow = new ActionRowBuilder().addComponents(operationNameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(operationDetailsInput);

            modal.addComponents(firstActionRow, secondActionRow);

            // Store scheduling data
            operationSchedules.set(interaction.user.id, { date, time });

            await interaction.showModal(modal);
        }
    },

    async handleModal(interaction) {
        if (interaction.customId === 'operation_start_form') {
            const operationName = interaction.fields.getTextInputValue('operation_name');
            const operationDetails = interaction.fields.getTextInputValue('operation_details');

            // Create operation embed
            const embed = new EmbedBuilder()
                .setTitle('🎯 Operation Started')
                .setColor(0xFF0000)
                .addFields(
                    { name: '📋 Operation Name', value: operationName, inline: true },
                    { name: '👤 Started By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '🕐 Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📝 Details', value: operationDetails }
                )
                .setTimestamp();

            // Create response buttons
            const acceptButton = new ButtonBuilder()
                .setCustomId(`op_response_${Date.now()}_accept`)
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success);

            const declineButton = new ButtonBuilder()
                .setCustomId(`op_response_${Date.now()}_decline`)
                .setLabel('❌ Decline')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder()
                .addComponents(acceptButton, declineButton);

            // Store operation data
            activeOperations.set(operationName.toLowerCase(), {
                name: operationName,
                details: operationDetails,
                startedBy: interaction.user.id,
                startTime: Date.now(),
                responses: new Map()
            });

            await interaction.reply({
                content: `@everyone\n\n**🚨 NEW OPERATION STARTED 🚨**\n\nOperation **${operationName}** has been initiated. Please respond below.`,
                embeds: [embed],
                components: [actionRow]
            });

        } else if (interaction.customId.startsWith('operation_schedule_form_')) {
            const scheduleData = operationSchedules.get(interaction.user.id);
            if (!scheduleData) {
                await interaction.reply({
                    content: '❌ Schedule data not found. Please try again.',
                    flags: 64
                });
                return;
            }

            const operationName = interaction.fields.getTextInputValue('operation_name');
            const operationDetails = interaction.fields.getTextInputValue('operation_details');

            // Create operation embed
            const embed = new EmbedBuilder()
                .setTitle('📅 Operation Scheduled')
                .setColor(0x0099FF)
                .addFields(
                    { name: '📋 Operation Name', value: operationName, inline: true },
                    { name: '📅 Date', value: scheduleData.date, inline: true },
                    { name: '🕐 Time', value: `${scheduleData.time} EST`, inline: true },
                    { name: '👤 Scheduled By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 Details', value: operationDetails }
                )
                .setTimestamp();

            // Create response buttons
            const acceptButton = new ButtonBuilder()
                .setCustomId(`op_response_${Date.now()}_accept`)
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success);

            const declineButton = new ButtonBuilder()
                .setCustomId(`op_response_${Date.now()}_decline`)
                .setLabel('❌ Decline')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder()
                .addComponents(acceptButton, declineButton);

            await interaction.reply({
                content: `<@&${TARGET_ROLE_ID}>\n\n**📅 OPERATION SCHEDULED 📅**\n\nOperation **${operationName}** has been scheduled for **${scheduleData.date}** at **${scheduleData.time} EST**. Please respond below.`,
                embeds: [embed],
                components: [actionRow]
            });

            // Clean up schedule data
            operationSchedules.delete(interaction.user.id);
        }
    },

    async handleButton(interaction) {
        if (interaction.customId.startsWith('op_response_')) {
            const parts = interaction.customId.split('_');
            const response = parts[parts.length - 1]; // 'accept' or 'decline'
            const userId = interaction.user.id;

            // Update the user's response
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            
            const responseEmoji = response === 'accept' ? '✅' : '❌';
            const responseText = response === 'accept' ? 'Accepted' : 'Declined';

            await interaction.reply({
                content: `${responseEmoji} You have **${responseText}** the operation.`,
                flags: 64
            });
        }
    }
};
