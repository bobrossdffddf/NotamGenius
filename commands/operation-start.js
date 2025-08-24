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

        if (interaction.options.getSubcommand() === 'start') {
            await this.handleOperationStart(interaction);
        } else if (interaction.options.getSubcommand() === 'schedule') {
            await this.handleOperationSchedule(interaction);
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

    async handleOperationSchedule(interaction) {
        // Get date and time from command options
        const operationDate = interaction.options.getString('date');
        const operationTime = interaction.options.getString('time');
        const fullDateTime = `${operationDate} at ${operationTime} EST`;
        
        // Store the time for use in modal handling
        const tempId = Date.now().toString();
        operationSchedules.set(`temp_${interaction.user.id}_${tempId}`, { 
            tempTime: fullDateTime
        });
        
        // Create modal to collect operation details
        const modal = new ModalBuilder()
            .setCustomId(`operation_schedule_form_${tempId}`)
            .setTitle(`Schedule Operation - ${operationDate} ${operationTime} EST`);

        // Operation Name
        const operationNameInput = new TextInputBuilder()
            .setCustomId('schedule_operation_name')
            .setLabel('Operation Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "Anchorage Resolution"')
            .setRequired(true)
            .setMaxLength(100);

        // Operation Details
        const operationDetailsInput = new TextInputBuilder()
            .setCustomId('schedule_operation_details')
            .setLabel('Operation Details & Briefing')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Brief description of the operation, objectives, and important information...')
            .setRequired(true)
            .setMaxLength(1500);

        // Operation Leader/Contact
        const operationLeaderInput = new TextInputBuilder()
            .setCustomId('schedule_operation_leader')
            .setLabel('Operation Leader/Contact')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., @alexbillyjoil')
            .setRequired(true)
            .setMaxLength(100);

        // Additional Notes
        const additionalNotesInput = new TextInputBuilder()
            .setCustomId('schedule_additional_notes')
            .setLabel('Additional Notes (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Any additional information, requirements, or special instructions...')
            .setRequired(false)
            .setMaxLength(1000);

        const row1 = new ActionRowBuilder().addComponents(operationNameInput);
        const row3 = new ActionRowBuilder().addComponents(operationDetailsInput);
        const row4 = new ActionRowBuilder().addComponents(operationLeaderInput);
        const row5 = new ActionRowBuilder().addComponents(additionalNotesInput);

        modal.addComponents(row1, row3, row4, row5);

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        if (interaction.customId === 'operation_start_form') {
            await this.handleOperationStartModal(interaction);
        } else if (interaction.customId.startsWith('operation_schedule_form_')) {
            await this.handleOperationScheduleModal(interaction);
        }
    },

    async handleOperationScheduleModal(interaction) {
        try {
            // Defer reply immediately to prevent timeout
            await interaction.deferReply({ flags: 64 });

            // Extract temp ID from custom ID
            const tempId = interaction.customId.split('_').pop();
            const tempKey = `temp_${interaction.user.id}_${tempId}`;
            const tempData = operationSchedules.get(tempKey);
            
            if (!tempData) {
                await interaction.editReply({
                    content: '❌ Session expired. Please try the command again.'
                });
                return;
            }
            
            // Get form data
            const operationName = interaction.fields.getTextInputValue('schedule_operation_name');
            const operationTime = tempData.tempTime; // Use combined date/time from command
            
            const operationDetails = interaction.fields.getTextInputValue('schedule_operation_details');
            const operationLeader = interaction.fields.getTextInputValue('schedule_operation_leader');
            const additionalNotes = interaction.fields.getTextInputValue('schedule_additional_notes') || 'None';
            
            // Clean up temp data
            operationSchedules.delete(tempKey);

            // Store operation data
            const operationId = `op_${Date.now()}`;
            const operationData = {
                name: operationName,
                time: operationTime,
                details: operationDetails,
                leader: operationLeader,
                notes: additionalNotes,
                responses: new Map(),
                scheduledBy: interaction.user.id,
                guildId: interaction.guild.id,
                attendingCount: 0,
                operationRoleId: null,
                detailsMessageId: null
            };
            operationSchedules.set(operationId, operationData);

            // Find target role
            const targetRole = interaction.guild.roles.cache.get(TARGET_ROLE_ID);
            if (!targetRole) {
                await interaction.editReply({
                    content: '❌ **Error**: Target role not found. Please check the role configuration.'
                });
                return;
            }

            // Get all members with the target role
            const membersWithRole = targetRole.members;
            
            if (membersWithRole.size === 0) {
                await interaction.editReply({
                    content: '❌ **No Members**: No members found with the target role.'
                });
                return;
            }

            // Create NOTAM-style operation notification
            const notamContent = `**🚁 NOTICE TO AIRMEN (NOTAM) - OPERATION ALERT**

` +
                `**OPERATION DESIGNATION:** ${operationName.toUpperCase()}
` +
                `**EFFECTIVE TIME:** ${operationTime}
` +
                `**OPERATION COMMANDER:** ${operationLeader}
` +
                `**CLASSIFICATION:** RESTRICTED

` +
                `**MISSION BRIEF:**
${operationDetails}

` +
                `**ADDITIONAL DIRECTIVES:**
${additionalNotes}

` +
                `**PERSONNEL RESPONSE REQUIRED:**
Confirm your operational availability using the response options below.

` +
                `**OPERATION ID:** ${operationId}
` +
                `**ISSUED BY:** ${interaction.user.tag} | ${new Date().toISOString().replace('T', ' ').substring(0, 19)}Z`;

            const operationEmbed = new EmbedBuilder()
                .setTitle('⚠️ **OPERATIONAL DEPLOYMENT NOTICE**')
                .setDescription(notamContent)
                .setColor(0xFF4500)
                .setFooter({ text: `RESPOND IMMEDIATELY | Operation ${operationId}` })
                .setTimestamp();

            // Create response buttons
            const responseRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`op_response_yes_${operationId}`)
                        .setLabel('✅ Yes, I\'ll Join')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`op_response_tbd_${operationId}`)
                        .setLabel('❔ To Be Determined')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`op_response_no_${operationId}`)
                        .setLabel('❌ No Thank You')
                        .setStyle(ButtonStyle.Danger)
                );

            // Show preview to admin first
            const previewEmbed = new EmbedBuilder()
                .setTitle('🔍 **OPERATION PREVIEW**')
                .setDescription('This is how the message will appear to users. Confirm to send to all members with the target role.')
                .setColor(0x0099FF);

            const confirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm_send_${operationId}`)
                        .setLabel('✅ Send to All')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`cancel_send_${operationId}`)
                        .setLabel('❌ Cancel')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.editReply({
                content: `**📝 PREVIEW - Operation: ${operationName}**`,
                embeds: [previewEmbed, operationEmbed],
                components: [confirmButtons]
            });

            // Store additional data for confirmation
            operationData.membersWithRole = membersWithRole;
            operationData.targetRole = targetRole;
            operationData.responseRow = responseRow;
            operationData.operationEmbed = operationEmbed;
            operationSchedules.set(operationId, operationData);

            // Create operation role
            const operationRoleName = `Op-${operationName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
            let operationRole;
            try {
                operationRole = await interaction.guild.roles.create({
                    name: operationRoleName,
                    color: 0xFF6B35,
                    mentionable: true,
                    reason: `Operation ${operationName} participant role`
                });
                operationData.operationRoleId = operationRole.id;
            } catch (error) {
                console.error('Error creating operation role:', error);
            }

            // Post operation details to the specified channel
            const detailsChannel = interaction.guild.channels.cache.get(OPERATION_DETAILS_CHANNEL_ID);
            if (detailsChannel) {
                const detailsEmbed = new EmbedBuilder()
                    .setTitle(`🚁 ${operationName.toUpperCase()}`)
                    .setDescription('**OPERATION DETAILS**')
                    .addFields(
                        { name: '📅 Date & Time', value: operationTime, inline: true },
                        { name: '👤 Leader', value: operationLeader, inline: true },
                        { name: '👥 Attending', value: '0', inline: true },
                        { name: '📋 Details', value: operationDetails, inline: false },
                        { name: '📝 Notes', value: additionalNotes, inline: false }
                    )
                    .setColor(0xFF6B35)
                    .setFooter({ text: `Operation ID: ${operationId}` })
                    .setTimestamp();

                try {
                    const detailsMessage = await detailsChannel.send({ embeds: [detailsEmbed] });
                        operationData.detailsMessageId = detailsMessage.id;
                } catch (error) {
                    console.error('Error posting to details channel:', error);
                }
            }

            // Send confirmation to admin
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ **Operation Scheduled Successfully**')
                .setDescription(`**${operationName}** notifications have been sent.`)
                .addFields(
                    { name: '📊 **Delivery Stats**', value: `✅ Sent: ${successCount}\n❌ Failed: ${failCount}\n👥 Total: ${membersWithRole.size}`, inline: true },
                    { name: '🎯 **Target Role**', value: targetRole.name, inline: true },
                    { name: '🆔 **Operation ID**', value: operationId, inline: true },
                    { name: '🏷️ **Operation Role**', value: operationRole ? `<@&${operationRole.id}>` : 'Failed to create', inline: true }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.editReply({
                embeds: [confirmEmbed]
            });

            // Auto-cleanup operation data after 24 hours
            setTimeout(() => {
                operationSchedules.delete(operationId);
            }, 24 * 60 * 60 * 1000);

        } catch (error) {
            console.error('Error processing operation schedule modal:', error);
            await interaction.editReply({
                content: '❌ **Error**: There was an error processing your operation schedule. Please try again.'
            });
        }
    },

    async handleOperationStartModal(interaction) {
        // Defer reply immediately to prevent timeout
        await interaction.deferReply({ flags: 64 });

        const operationName = interaction.fields.getTextInputValue('operation_name');
        const duration = parseInt(interaction.fields.getTextInputValue('operation_duration'));
        const objective = interaction.fields.getTextInputValue('operation_objective');
        const classification = interaction.fields.getTextInputValue('operation_classification') || 'RESTRICTED';
        const notes = interaction.fields.getTextInputValue('operation_notes') || 'None';

        if (isNaN(duration) || duration <= 0 || duration > 168) {
            await interaction.editReply({
                content: '❌ Invalid duration. Please enter a number between 1 and 168 hours.'
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

            await interaction.editReply({
                content: `✅ **Operation ${operationName} has been initiated!**\n\n` +
                        `🏷️ Role: <@&${operationRole.id}>\n` +
                        `📁 Category: ${categoryName}\n` +
                        `⏰ Duration: ${duration} hours\n\n` +
                        `Use \`/operation add\` to assign personnel to this operation.`
            });

        } catch (error) {
            console.error('❌ Error creating operation:', error);
            await interaction.editReply({
                content: '❌ There was an error creating the operation. Please try again.'
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
    },

    async handleButton(interaction) {
        // Handle confirmation buttons for sending operation alerts
        if (interaction.customId.startsWith('confirm_send_') || interaction.customId.startsWith('cancel_send_')) {
            await this.handleConfirmationButton(interaction);
            return;
        }
        
        // Handle operation response buttons
        if (!interaction.customId.startsWith('op_response_')) return;

        const [, , response, operationId] = interaction.customId.split('_');
        const operation = operationSchedules.get(operationId);

        if (!operation) {
            await interaction.reply({
                content: '❌ **Operation Expired**: This operation is no longer accepting responses.',
                flags: 64
            });
            return;
        }

        const previousResponse = operation.responses.get(interaction.user.id);
        
        // Store/update user response
        operation.responses.set(interaction.user.id, {
            response: response,
            username: interaction.user.tag,
            timestamp: new Date()
        });

        // Update attending count
        if (response === 'yes' && (!previousResponse || previousResponse.response !== 'yes')) {
            operation.attendingCount++;
        } else if (response !== 'yes' && previousResponse && previousResponse.response === 'yes') {
            operation.attendingCount = Math.max(0, operation.attendingCount - 1);
        }

        // Give operation role if they said yes
        if (response === 'yes' && operation.operationRoleId) {
            try {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                const operationRole = interaction.guild.roles.cache.get(operation.operationRoleId);
                if (operationRole && !member.roles.cache.has(operation.operationRoleId)) {
                    await member.roles.add(operationRole);
                }
            } catch (error) {
                console.error('Error adding operation role:', error);
            }
        } else if (response !== 'yes' && operation.operationRoleId) {
            // Remove role if they changed from yes to no/tbd
            try {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                const operationRole = interaction.guild.roles.cache.get(operation.operationRoleId);
                if (operationRole && member.roles.cache.has(operation.operationRoleId)) {
                    await member.roles.remove(operationRole);
                }
            } catch (error) {
                console.error('Error removing operation role:', error);
            }
        }

        // Update details message with new attending count
        if (operation.detailsMessageId) {
            try {
                const detailsChannel = interaction.guild.channels.cache.get(OPERATION_DETAILS_CHANNEL_ID);
                if (detailsChannel) {
                    const detailsMessage = await detailsChannel.messages.fetch(operation.detailsMessageId);
                    const updatedEmbed = EmbedBuilder.from(detailsMessage.embeds[0])
                        .setFields(
                            { name: '📅 Date & Time', value: operation.time, inline: true },
                            { name: '👤 Leader', value: operation.leader, inline: true },
                            { name: '👥 Attending', value: operation.attendingCount.toString(), inline: true },
                            { name: '📋 Details', value: operation.details, inline: false },
                            { name: '📝 Notes', value: operation.notes, inline: false }
                        );
                    await detailsMessage.edit({ embeds: [updatedEmbed] });
                }
            } catch (error) {
                console.error('Error updating details message:', error);
            }
        }

        // Response messages
        const responseMessages = {
            'yes': `✅ **Confirmed!** You have confirmed your participation and received the operation role.`,
            'tbd': '❔ **Noted!** You have marked your availability as "To Be Determined".',
            'no': '❌ **Understood!** You have declined participation in this operation.'
        };

        await interaction.reply({
            content: responseMessages[response] + `\n\n**Operation**: ${operation.name}\n**Time**: ${operation.time}\n**Currently Attending**: ${operation.attendingCount}`,
            flags: 64
        });

        console.log(`📋 Operation Response: ${interaction.user.tag} responded "${response}" to operation "${operation.name}" (Attending: ${operation.attendingCount})`);
    },

    async handleConfirmationButton(interaction) {
        // Check admin permissions
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can manage operations.',
                flags: 64
            });
            return;
        }

        const operationId = interaction.customId.split('_')[2];
        const operation = operationSchedules.get(operationId);

        if (!operation) {
            await interaction.reply({
                content: '❌ **Error**: Operation not found or expired.',
                flags: 64
            });
            return;
        }

        if (interaction.customId.startsWith('cancel_send_')) {
            // Cancel the operation
            operationSchedules.delete(operationId);
            
            // Clean up operation role if created
            if (operation.operationRoleId) {
                try {
                    const role = interaction.guild.roles.cache.get(operation.operationRoleId);
                    if (role) {
                        await role.delete('Operation cancelled by admin');
                    }
                } catch (error) {
                    console.error('Error deleting operation role:', error);
                }
            }

            await interaction.update({
                content: '❌ **Operation Cancelled**',
                embeds: [],
                components: []
            });
            return;
        }

        if (interaction.customId.startsWith('confirm_send_')) {
            // Send DMs to all members with the role
            await interaction.deferUpdate();
            
            let successCount = 0;
            let failCount = 0;

            const membersWithRole = operation.membersWithRole;
            const operationEmbed = operation.operationEmbed;
            const responseRow = operation.responseRow;

            for (const [memberId, member] of membersWithRole) {
                try {
                    await member.send({
                        content: `**🚨 URGENT - OPERATIONAL DEPLOYMENT NOTIFICATION**\n**FROM: ${interaction.guild.name} COMMAND**`,
                        embeds: [operationEmbed],
                        components: [responseRow]
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Failed to send DM to ${member.user.tag}:`, error);
                    failCount++;
                }
            }

            // Send final confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ **Operation Scheduled Successfully**')
                .setDescription(`**${operation.name}** notifications have been sent.`)
                .addFields(
                    { name: '📊 **Delivery Stats**', value: `✅ Sent: ${successCount}\n❌ Failed: ${failCount}\n👥 Total: ${membersWithRole.size}`, inline: true },
                    { name: '🎯 **Target Role**', value: operation.targetRole.name, inline: true },
                    { name: '🆔 **Operation ID**', value: operationId, inline: true }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.editReply({
                content: `🚁 **Operation ${operation.name} Deployed!**`,
                embeds: [confirmEmbed],
                components: []
            });
        }
    }
};