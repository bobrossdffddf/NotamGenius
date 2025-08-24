const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

// Store active operations (in production, use a database)
const activeOperations = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('operation')
        .setDescription('Operation management commands (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new operation')
        ),

    async execute(interaction) {
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can manage operations.',
                flags: 64
            });
            return;
        }

        if (interaction.options.getSubcommand() === 'start') {
            await this.handleOperationStart(interaction);
        }
    },

    async handleOperationStart(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('operation_start_form')
            .setTitle('🚁 Start New Operation');

        const operationNameInput = new TextInputBuilder()
            .setCustomId('operation_name')
            .setLabel('Operation Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "Thunder Strike"')
            .setRequired(true)
            .setMaxLength(50);

        const durationInput = new TextInputBuilder()
            .setCustomId('operation_duration')
            .setLabel('Duration (in hours)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "4" for 4 hours')
            .setRequired(true)
            .setMaxLength(3);

        const objectiveInput = new TextInputBuilder()
            .setCustomId('operation_objective')
            .setLabel('Operation Objective')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Brief description of the operation objectives...')
            .setRequired(true)
            .setMaxLength(500);

        const classificationInput = new TextInputBuilder()
            .setCustomId('operation_classification')
            .setLabel('Classification Level')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "CONFIDENTIAL", "SECRET", "TOP SECRET"')
            .setRequired(false)
            .setMaxLength(20);

        const specialNotesInput = new TextInputBuilder()
            .setCustomId('operation_notes')
            .setLabel('Special Instructions (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Any special instructions or notes...')
            .setRequired(false)
            .setMaxLength(300);

        modal.addComponents(
            new ActionRowBuilder().addComponents(operationNameInput),
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(objectiveInput),
            new ActionRowBuilder().addComponents(classificationInput),
            new ActionRowBuilder().addComponents(specialNotesInput)
        );

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'operation_start_form') return;

        const operationName = interaction.fields.getTextInputValue('operation_name');
        const duration = parseInt(interaction.fields.getTextInputValue('operation_duration'));
        const objective = interaction.fields.getTextInputValue('operation_objective');
        const classification = interaction.fields.getTextInputValue('operation_classification') || 'RESTRICTED';
        const notes = interaction.fields.getTextInputValue('operation_notes') || 'None';

        if (isNaN(duration) || duration <= 0 || duration > 168) {
            await interaction.reply({
                content: '❌ Invalid duration. Please enter a number between 1 and 168 hours.',
                flags: 64
            });
            return;
        }

        try {
            const guild = interaction.guild;
            const operationId = Date.now().toString();
            const roleName = `OP-${operationName.replace(/[^a-zA-Z0-9]/g, '')}`;
            const categoryName = `🚁 Operation: ${operationName}`;

            // Create operation role
            const operationRole = await guild.roles.create({
                name: roleName,
                color: 0xFF4500,
                mentionable: true,
                reason: `Operation ${operationName} role`
            });

            // Create operation category
            const category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: operationRole.id,
                        allow: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });

            // Add admin permissions to category
            const adminRoles = guild.roles.cache.filter(role => 
                role.permissions.has(PermissionFlagsBits.Administrator) ||
                role.permissions.has(PermissionFlagsBits.ManageGuild)
            );

            for (const role of adminRoles.values()) {
                await category.permissionOverwrites.create(role, {
                    ViewChannel: true,
                    ManageChannels: true,
                    ManageMessages: true
                });
            }

            // Create voice channel
            const voiceChannel = await guild.channels.create({
                name: `🎧 Operation: ${operationName} Comms`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: operationRole.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
                    }
                ]
            });

            // Create information channel (admin only posting)
            const infoChannel = await guild.channels.create({
                name: `📋 Operation: ${operationName} Information`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: operationRole.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: [PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            // Create general chat channel
            const chatChannel = await guild.channels.create({
                name: `💬 Operation: ${operationName} Chat`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: operationRole.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            // Store operation data
            const endTime = Date.now() + (duration * 60 * 60 * 1000);
            const operationData = {
                id: operationId,
                name: operationName,
                commander: interaction.user.id,
                startTime: Date.now(),
                endTime: endTime,
                duration: duration,
                objective: objective,
                classification: classification,
                notes: notes,
                roleId: operationRole.id,
                categoryId: category.id,
                voiceChannelId: voiceChannel.id,
                infoChannelId: infoChannel.id,
                chatChannelId: chatChannel.id,
                guildId: guild.id,
                active: true
            };

            activeOperations.set(operationId, operationData);

            // Create operation briefing embed
            const briefingEmbed = new EmbedBuilder()
                .setTitle(`🚁 OPERATION ${operationName.toUpperCase()} - INITIATED`)
                .setColor(0xFF4500)
                .addFields(
                    { name: '👤 Operation Commander', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏱️ Duration', value: `${duration} hours`, inline: true },
                    { name: '🔒 Classification', value: classification, inline: true },
                    { name: '🎯 Objective', value: objective },
                    { name: '📝 Special Instructions', value: notes },
                    { name: '🏷️ Operation Role', value: `<@&${operationRole.id}>`, inline: true },
                    { name: '⏰ End Time', value: `<t:${Math.floor(endTime / 1000)}:F>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Operation ID: ${operationId}` });

            // Post briefing in info channel
            await infoChannel.send({ embeds: [briefingEmbed] });

            // Schedule operation end check
            setTimeout(async () => {
                await this.checkOperationEnd(operationId);
            }, duration * 60 * 60 * 1000);

            await interaction.reply({
                content: `✅ **Operation ${operationName} has been initiated!**\n\n` +
                        `🏷️ Role: <@&${operationRole.id}>\n` +
                        `📁 Category: ${categoryName}\n` +
                        `⏰ Duration: ${duration} hours\n\n` +
                        `Use \`/operation add\` to assign personnel to this operation.`,
                flags: 64
            });

        } catch (error) {
            console.error('❌ Error creating operation:', error);
            await interaction.reply({
                content: '❌ There was an error creating the operation. Please try again.',
                flags: 64
            });
        }
    },

    async checkOperationEnd(operationId) {
        const operation = activeOperations.get(operationId);
        if (!operation || !operation.active) return;

        try {
            const guild = await global.client.guilds.fetch(operation.guildId);
            const commander = await guild.members.fetch(operation.commander);

            const embed = new EmbedBuilder()
                .setTitle('⏰ Operation Time Expired')
                .setDescription(`Operation **${operation.name}** has reached its scheduled end time.`)
                .addFields(
                    { name: '🕐 Scheduled Duration', value: `${operation.duration} hours` },
                    { name: '📋 What to do next', value: 'Reply with:\n✅ `complete` - End the operation\n⏰ `extend` - Extend operation time' }
                )
                .setColor(0xFFAA00);

            await commander.send({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error checking operation end:', error);
        }
    },

    getActiveOperations() {
        return activeOperations;
    },

    getActiveOperation(guildId) {
        for (const [id, op] of activeOperations) {
            if (op.guildId === guildId && op.active) {
                return { id, ...op };
            }
        }
        return null;
    }
};