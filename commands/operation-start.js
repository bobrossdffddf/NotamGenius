const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');
const fs = require('fs').promises;
const path = require('path');

// Store active operations (in production, use a database)
const activeOperations = new Map();

// Store operation scheduling data temporarily
const operationSchedules = new Map();

// Target role ID for operation notifications - ALL OPERATIONS USE THIS ROLE
const TARGET_ROLE_ID = '1409027687736938537';

// Operation details channel ID
const OPERATION_DETAILS_CHANNEL_ID = '1403915496256176148';

// Certification role IDs
const CERTIFICATION_ROLES = {
    'F-22': '1409300377463165079',
    'F-16': '1409300512062574663',
    'F-35': '1409300434967072888'
};

// Data persistence paths
const ACTIVE_OPERATIONS_FILE = path.join(__dirname, '..', 'data', 'active-operations.json');
const SCHEDULED_OPERATIONS_FILE = path.join(__dirname, '..', 'data', 'scheduled-operations.json');

// Persistence functions
async function saveOperations() {
    try {
        const activeOpsData = {};
        const scheduledOpsData = {};
        
        // Convert Maps to objects for JSON storage
        for (const [id, op] of activeOperations) {
            const serializedOp = { ...op };
            // Convert Maps to objects
            if (op.responses) {
                serializedOp.responses = Object.fromEntries(op.responses);
            }
            if (op.jobAssignments) {
                serializedOp.jobAssignments = Object.fromEntries(op.jobAssignments);
            }
            activeOpsData[id] = serializedOp;
        }
        
        for (const [id, op] of operationSchedules) {
            const serializedOp = { ...op };
            if (op.responses) {
                serializedOp.responses = Object.fromEntries(op.responses);
            }
            if (op.jobAssignments) {
                serializedOp.jobAssignments = Object.fromEntries(op.jobAssignments);
            }
            scheduledOpsData[id] = serializedOp;
        }
        
        await fs.writeFile(ACTIVE_OPERATIONS_FILE, JSON.stringify(activeOpsData, null, 2));
        await fs.writeFile(SCHEDULED_OPERATIONS_FILE, JSON.stringify(scheduledOpsData, null, 2));
        
        console.log('💾 Operations data saved to disk');
    } catch (error) {
        console.error('❌ Error saving operations:', error);
    }
}

async function loadOperations() {
    try {
        // Load active operations
        try {
            const activeData = await fs.readFile(ACTIVE_OPERATIONS_FILE, 'utf8');
            const activeOpsData = JSON.parse(activeData);
            
            for (const [id, op] of Object.entries(activeOpsData)) {
                // Restore Maps from objects
                if (op.responses) {
                    op.responses = new Map(Object.entries(op.responses));
                } else {
                    op.responses = new Map();
                }
                if (op.jobAssignments) {
                    op.jobAssignments = new Map(Object.entries(op.jobAssignments));
                } else {
                    op.jobAssignments = new Map();
                }
                activeOperations.set(id, op);
            }
            
            console.log(`📁 Loaded ${activeOperations.size} active operations from disk`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Error loading active operations:', error);
            }
        }
        
        // Load scheduled operations
        try {
            const scheduledData = await fs.readFile(SCHEDULED_OPERATIONS_FILE, 'utf8');
            const scheduledOpsData = JSON.parse(scheduledData);
            
            for (const [id, op] of Object.entries(scheduledOpsData)) {
                if (op.responses) {
                    op.responses = new Map(Object.entries(op.responses));
                } else {
                    op.responses = new Map();
                }
                if (op.jobAssignments) {
                    op.jobAssignments = new Map(Object.entries(op.jobAssignments));
                } else {
                    op.jobAssignments = new Map();
                }
                operationSchedules.set(id, op);
            }
            
            console.log(`📁 Loaded ${operationSchedules.size} scheduled operations from disk`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Error loading scheduled operations:', error);
            }
        }
    } catch (error) {
        console.error('❌ Error in loadOperations:', error);
    }
}

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
                    option.setName('datetime')
                        .setDescription('Date/time (e.g., "9/23 at 12:20 EST" or Discord timestamp <t:1756175400:t>)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an active operation')
                .addStringOption(option =>
                    option.setName('operation_id')
                        .setDescription('Operation ID to edit')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('announce')
                .setDescription('Send announcement to operation participants (Admin only)')
                .addStringOption(option =>
                    option.setName('operation_id')
                        .setDescription('Operation ID to announce to')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Announcement message')
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
        } else if (interaction.options.getSubcommand() === 'edit') {
            await this.handleOperationEdit(interaction);
        } else if (interaction.options.getSubcommand() === 'announce') {
            await this.handleOperationAnnounce(interaction);
        }
    },

    async handleOperationEdit(interaction) {
        const operationId = interaction.options.getString('operation_id');
        const operation = operationSchedules.get(operationId) || activeOperations.get(operationId);

        if (!operation) {
            await interaction.reply({
                content: '❌ **Operation Not Found**: No operation found with that ID. Make sure the operation is still active.',
                flags: 64
            });
            return;
        }

        // Show current operation details and editing options
        const currentAssignments = Array.from(operation.jobAssignments.entries())
            .map(([userId, job]) => `• <@${userId}> - ${job}`)
            .join('\n') || '• None assigned yet';

        const editEmbed = new EmbedBuilder()
            .setTitle(`📝 **Edit Operation: ${operation.name}**`)
            .setColor(0x0099FF)
            .addFields(
                { name: '📅 Time', value: operation.time, inline: true },
                { name: '👨‍✈️ Leader', value: operation.leader, inline: true },
                { name: '🆔 Operation ID', value: operationId, inline: true },
                { name: '📍 Available Positions', value: operation.availableJobs.map(job => 
                    `${job.name}${job.maxCount ? ` (${job.maxCount} slots)` : ' (unlimited)'}`
                ).join('\n') || 'None specified' },
                { name: '🎯 Current Assignments', value: currentAssignments },
                { name: '📋 Details', value: operation.details.substring(0, 1000) + (operation.details.length > 1000 ? '...' : '') }
            )
            .setFooter({ text: 'Use the buttons below to edit specific aspects of the operation' });

        const editButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`edit_details_${operationId}`)
                    .setLabel('📋 Edit Details')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`edit_positions_${operationId}`)
                    .setLabel('📍 Edit Positions')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`manage_assignments_${operationId}`)
                    .setLabel('🎯 Manage Assignments')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [editEmbed],
            components: [editButtons],
            flags: 64
        });
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
        // Check admin permissions first
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can schedule operations.',
                flags: 64
            });
            return;
        }

        // Get datetime from command options
        const datetimeInput = interaction.options.getString('datetime');
        let fullDateTime;
        
        // Check if it's a Discord timestamp format
        const timestampMatch = datetimeInput.match(/<t:(\d+):([dDfFtTR])>/);
        if (timestampMatch) {
            const timestamp = parseInt(timestampMatch[1]);
            const date = new Date(timestamp * 1000);
            fullDateTime = `${date.toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'})} at ${date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})} EST`;
        } else {
            // Use the input as-is for traditional format
            fullDateTime = datetimeInput;
        }

        // Store the time for use in modal handling
        const tempId = Date.now().toString();
        operationSchedules.set(`temp_${interaction.user.id}_${tempId}`, { 
            tempTime: fullDateTime
        });

        // Create modal to collect operation details
        const modal = new ModalBuilder()
            .setCustomId(`operation_schedule_form_${tempId}`)
            .setTitle(`Schedule Operation - ${fullDateTime}`);

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

        // Available Jobs/Positions
        const availableJobsInput = new TextInputBuilder()
            .setCustomId('schedule_available_jobs')
            .setLabel('Positions')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('F-22 Escort:2, F-16 CAP:3, AWACS Support:1, Ground Control')
            .setRequired(true)
            .setMaxLength(500);

        // Additional Notes
        const additionalNotesInput = new TextInputBuilder()
            .setCustomId('schedule_additional_notes')
            .setLabel('Additional Notes (Optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Any additional information, requirements, or special instructions...')
            .setRequired(false)
            .setMaxLength(200);

        const row1 = new ActionRowBuilder().addComponents(operationNameInput);
        const row2 = new ActionRowBuilder().addComponents(operationDetailsInput);
        const row3 = new ActionRowBuilder().addComponents(operationLeaderInput);
        const row4 = new ActionRowBuilder().addComponents(availableJobsInput);
        const row5 = new ActionRowBuilder().addComponents(additionalNotesInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        try {
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error opening form. Please try again.',
                    flags: 64
                });
            }
        }
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
            // Check if interaction is already handled
            if (interaction.replied || interaction.deferred) {
                console.log('Interaction already handled, skipping...');
                return;
            }

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
            const availableJobs = interaction.fields.getTextInputValue('schedule_available_jobs');
            const additionalNotes = interaction.fields.getTextInputValue('schedule_additional_notes') || 'None';

            // Clean up temp data
            operationSchedules.delete(tempKey);

            // Parse available jobs with capacity limits (Position:Count format)
            const jobsList = availableJobs.split(/[,\n]/).map(job => job.trim()).filter(job => job.length > 0).map(job => {
                if (job.includes(':')) {
                    const [name, count] = job.split(':');
                    return { name: name.trim(), maxCount: parseInt(count.trim()) || 1 };
                } else {
                    return { name: job, maxCount: null }; // null = unlimited
                }
            });

            // Store operation data
            const operationId = `op_${Date.now()}`;
            const operationData = {
                name: operationName,
                time: operationTime,
                details: operationDetails,
                leader: operationLeader,
                availableJobs: jobsList,
                notes: additionalNotes,
                responses: new Map(),
                jobAssignments: new Map(), // Track user -> job assignments
                scheduledBy: interaction.user.id,
                guildId: interaction.guild.id,
                attendingCount: 0,
                operationRoleId: null,
                detailsMessageId: null,
                categoryId: null,
                voiceChannelId: null,
                infoChannelId: null,
                chatChannelId: null
            };
            operationSchedules.set(operationId, operationData);
            
            // Save to disk
            await saveOperations();

            // Create operation infrastructure (role, category, channels)
            const scheduleOperationRoleName = `Op-${operationName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
            const scheduleCategoryName = `🚁 Operation: ${operationName}`;

            let scheduleOperationRole, scheduleCategory, scheduleVoiceChannel, scheduleInfoChannel, scheduleChatChannel;

            try {
                // Create operation role
                scheduleOperationRole = await interaction.guild.roles.create({
                    name: scheduleOperationRoleName,
                    color: 0xFF6B35,
                    mentionable: true,
                    reason: `Operation ${operationName} participant role`
                });
                operationData.operationRoleId = scheduleOperationRole.id;

                // Create operation category
                scheduleCategory = await interaction.guild.channels.create({
                    name: scheduleCategoryName,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: scheduleOperationRole.id,
                            allow: [PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });
                operationData.categoryId = scheduleCategory.id;

                // Add admin permissions to category
                const adminRoles = interaction.guild.roles.cache.filter(role => 
                    role.permissions.has(PermissionFlagsBits.Administrator) ||
                    role.permissions.has(PermissionFlagsBits.ManageGuild)
                );

                for (const role of adminRoles.values()) {
                    await scheduleCategory.permissionOverwrites.create(role, {
                        ViewChannel: true,
                        ManageChannels: true,
                        ManageMessages: true
                    });
                }

                // Create voice channel
                scheduleVoiceChannel = await interaction.guild.channels.create({
                    name: `🎧 Operation: ${operationName} Comms`,
                    type: ChannelType.GuildVoice,
                    parent: scheduleCategory.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: scheduleOperationRole.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
                        }
                    ]
                });
                operationData.voiceChannelId = scheduleVoiceChannel.id;

                // Create information channel (admin only posting)
                scheduleInfoChannel = await interaction.guild.channels.create({
                    name: `📋 Operation: ${operationName} Information`,
                    type: ChannelType.GuildText,
                    parent: scheduleCategory.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: scheduleOperationRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages]
                        }
                    ]
                });
                operationData.infoChannelId = scheduleInfoChannel.id;

                // Create general chat channel
                scheduleChatChannel = await interaction.guild.channels.create({
                    name: `💬 Operation: ${operationName} Chat`,
                    type: ChannelType.GuildText,
                    parent: scheduleCategory.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: scheduleOperationRole.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        }
                    ]
                });
                operationData.chatChannelId = scheduleChatChannel.id;

            } catch (error) {
                console.error('Error creating operation infrastructure:', error);
            }

            // Find target role
            const targetRole = interaction.guild.roles.cache.get(TARGET_ROLE_ID);
            if (!targetRole) {
                await interaction.editReply({
                    content: '❌ **Error**: Target role not found. Please check the role configuration.'
                });
                return;
            }

            console.log(`🔍 Target role "${targetRole.name}" (${TARGET_ROLE_ID}) found`);

            // Simple approach: get all members with the role (Discord handles offline/online automatically)
            const membersWithRole = targetRole.members;
            console.log(`👥 Found ${membersWithRole.size} members with role "${targetRole.name}"`);
            
            // If we don't find members, try a quick fetch without hanging
            if (membersWithRole.size === 0) {
                console.log(`🔄 No members found, trying quick fetch...`);
                try {
                    await interaction.guild.members.fetch({ limit: 100 });
                    const refetchedMembers = targetRole.members;
                    console.log(`✅ After quick fetch: Found ${refetchedMembers.size} members`);
                } catch (error) {
                    console.log(`⚠️ Quick fetch failed: ${error.message}`);
                }
            }

            console.log(`📝 Final member list (${membersWithRole.size} members):`);
            for (const [memberId, member] of membersWithRole) {
                console.log(`   - ${member.user.tag} (${memberId})`);
            }

            // Simple timestamp for issued time
            const timeStamp = new Date().toLocaleString();

            // Format available positions for display with capacity
            const positionsText = jobsList.map((job, index) => {
                const capacity = job.maxCount ? ` (${job.maxCount} slots)` : ' (unlimited)';
                return `${index + 1}. ${job.name}${capacity}`;
            }).join('\n');

            const dmNotamContent = `## 🔴 OPERATIONAL DEPLOYMENT NOTICE\n### 📡 NOTICE TO AIRMEN (NOTAM) - OPERATION ALERT\n_______________________________________________\n### **OPERATION DESIGNATION: ${operationName.toUpperCase()}**\n**📅 DATE & TIME:** ${operationTime}\n**👨‍✈️ OPERATION COMMANDER:** ${operationLeader}\n**🔐 CLASSIFICATION:** RESTRICTED\n**👥 CURRENTLY ATTENDING:** ${operationData.attendingCount || 0}\n_________________________________________________\n### **📋 OPERATION DETAILS:**\n${operationDetails}\n\n### **📍 POSITIONS:**\n${positionsText}\n\n### **📝 ADDITIONAL NOTES:**\n${additionalNotes}\n_________________________________________________\n### **🎯 PERSONNEL RESPONSE REQUIRED:**\nConfirm your operational availability using the response options below.\n**NOTE:** If you join, you'll be able to select your specific position.\n________________________________________________________\n**🆔 OPERATION ID:** ${operationId}\n**📤 ISSUED BY:** ${interaction.user.tag} | ${timeStamp}`;

            const operationEmbed = new EmbedBuilder()
                .setDescription(dmNotamContent)
                .setColor(0xFF6B35);

            // Channel announcement uses same format as DM
            const channelEmbed = new EmbedBuilder()
                .setDescription(dmNotamContent)
                .setColor(0xFF6B35)
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
                .setDescription(`This is how the message will appear to users. Confirm to send to all members with the target role.\n\n**Channels Created:**\n${scheduleCategory ? `📁 Category: ${scheduleCategory.name}` : ''}\n${scheduleVoiceChannel ? `🎧 Voice: ${scheduleVoiceChannel.name}` : ''}\n${scheduleInfoChannel ? `📋 Info: ${scheduleInfoChannel.name}` : ''}\n${scheduleChatChannel ? `💬 Chat: ${scheduleChatChannel.name}` : ''}\n${scheduleOperationRole ? `🏷️ Role: ${scheduleOperationRole.name}` : ''}`)
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
                content: `**📝 PREVIEW - Operation: ${operationName}**\n**DM Preview:** (Simple format for users)`,
                embeds: [previewEmbed, operationEmbed],
                components: [confirmButtons]
            });

            // Store additional data for confirmation
            operationData.membersWithRole = membersWithRole;
            operationData.targetRole = targetRole;
            operationData.responseRow = responseRow;
            operationData.operationEmbed = operationEmbed;
            operationData.channelEmbed = channelEmbed;
            operationSchedules.set(operationId, operationData);

            // Add operation briefing to info channel like in operation start
            if (scheduleInfoChannel) {
                const briefingEmbed = new EmbedBuilder()
                    .setTitle(`🚁 OPERATION ${operationName.toUpperCase()} - SCHEDULED`)
                    .setColor(0xFF4500)
                    .addFields(
                        { name: '👤 Operation Leader', value: operationLeader, inline: true },
                        { name: '📅 Scheduled Time', value: operationTime, inline: true },
                        { name: '🔒 Classification', value: 'RESTRICTED', inline: true },
                        { name: '🎯 Mission Brief', value: operationDetails },
                        { name: '📍 Positions', value: positionsText || 'None specified' },
                        { name: '📝 Additional Directives', value: additionalNotes },
                        { name: '🏷️ Operation Role', value: `<@&${scheduleOperationRole.id}>`, inline: true },
                        { name: '👥 Currently Attending', value: '0', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Operation ID: ${operationId}` });

                await scheduleInfoChannel.send({ embeds: [briefingEmbed] });
            }

            // Add to activeOperations so it can be managed by /operation stop and /operation add
            const activeOperationData = {
                name: operationName,
                commander: interaction.user.id,
                startTime: Date.now(),
                endTime: null, // No end time for scheduled operations until started
                duration: null,
                objective: operationDetails,
                classification: 'RESTRICTED',
                notes: additionalNotes,
                roleId: scheduleOperationRole.id,
                categoryId: scheduleCategory.id,
                voiceChannelId: scheduleVoiceChannel.id,
                infoChannelId: scheduleInfoChannel.id,
                chatChannelId: scheduleChatChannel.id,
                guildId: interaction.guild.id,
                active: true,
                scheduled: true // Mark as scheduled operation
            };
            activeOperations.set(operationId, activeOperationData);
            
            // Save to disk
            await saveOperations();

            // Post operation details to the specified channel
            const detailsChannel = interaction.guild.channels.cache.get(OPERATION_DETAILS_CHANNEL_ID);
            if (detailsChannel) {
                try {
                    // Post the consolidated NOTAM to the channel
                    const detailsMessage = await detailsChannel.send({ embeds: [channelEmbed] });
                    operationData.detailsMessageId = detailsMessage.id;
                } catch (error) {
                    console.error('Error posting to details channel:', error);
                }
            }

            // Preview mode - wait for admin confirmation
            // No need to send anything here, preview is already showing

            // Auto-cleanup operation data after 24 hours
            setTimeout(() => {
                operationSchedules.delete(operationId);
            }, 24 * 60 * 60 * 1000);

        } catch (error) {
            console.error('Error processing operation schedule modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ **Error**: There was an error processing your operation schedule. Please try again.',
                        flags: 64
                    });
                } catch (replyError) {
                    console.error('Failed to send error reply:', replyError);
                }
            } else {
                try {
                    await interaction.editReply({
                        content: '❌ **Error**: There was an error processing your operation schedule. Please try again.'
                    });
                } catch (editError) {
                    console.error('Failed to edit reply:', editError);
                }
            }
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
            
            // Save to disk
            await saveOperations();

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
                    { name: '⏰ End Time', value: new Date(endTime).toLocaleString(), inline: true }
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

        const parts = interaction.customId.split('_');
        const response = parts[2];
        const operationId = parts.slice(3).join('_'); // Handle IDs with underscores
        const operation = operationSchedules.get(operationId);

        if (!operation) {
            await interaction.reply({
                content: '❌ **Operation Expired**: This operation is no longer accepting responses.',
                flags: 64
            });
            return;
        }

        const previousResponse = operation.responses.get(interaction.user.id);

        // Handle job selection for "Yes" responses
        if (response === 'yes') {
            // Show job selection dropdown instead of immediately giving role
            
            // Create job selection dropdown with capacity checking
            const jobOptions = operation.availableJobs.map((job, index) => {
                const currentCount = Array.from(operation.jobAssignments.values()).filter(assignedJob => assignedJob === job.name).length;
                const availability = job.maxCount ? `(${currentCount}/${job.maxCount})` : `(${currentCount})`;
                const isAvailable = !job.maxCount || currentCount < job.maxCount;
                
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${job.name} ${availability}`)
                    .setValue(`job_${index}_${operationId}`)
                    .setDescription(isAvailable ? `Select ${job.name} position` : 'Position full');
            }).filter((option, index) => {
                const job = operation.availableJobs[index];
                const currentCount = Array.from(operation.jobAssignments.values()).filter(assignedJob => assignedJob === job.name).length;
                return !job.maxCount || currentCount < job.maxCount;
            });

            const jobSelectMenu = new StringSelectMenuBuilder()
                .setCustomId(`job_select_${operationId}`)
                .setPlaceholder('Choose your position for this operation')
                .addOptions(jobOptions);

            const jobSelectRow = new ActionRowBuilder().addComponents(jobSelectMenu);

            await interaction.reply({
                content: `✅ **Excellent!** You've confirmed your participation in **${operation.name}**.\n\nNow please select your position for this operation:`,
                components: [jobSelectRow],
                flags: 64
            });

            // Store preliminary response (will be updated when job is selected)
            operation.responses.set(interaction.user.id, {
                response: 'yes_pending_job',
                username: interaction.user.tag,
                timestamp: new Date()
            });

            return; // Exit early, don't send the regular response message
        }

        // Handle other responses (TBD, No)
        // Store/update user response
        operation.responses.set(interaction.user.id, {
            response: response,
            username: interaction.user.tag,
            timestamp: new Date()
        });

        // Update attending count for non-yes responses
        if (response !== 'yes' && previousResponse && (previousResponse.response === 'yes' || previousResponse.response === 'yes_pending_job')) {
            operation.attendingCount = Math.max(0, operation.attendingCount - 1);
        }

        // Remove role and assignment if they changed from yes to no/tbd
        if (response !== 'yes' && operation.operationRoleId) {
            try {
                const guild = await global.client.guilds.fetch(operation.guildId);
                const member = await guild.members.fetch(interaction.user.id);
                const operationRole = guild.roles.cache.get(operation.operationRoleId);
                
                // Get their previous job assignment for logging
                const previousJob = operation.jobAssignments.get(interaction.user.id);
                
                if (operationRole && member && member.roles.cache.has(operation.operationRoleId)) {
                    await member.roles.remove(operationRole);
                    console.log(`🗑️ Removed operation role from ${member.user.tag} (changed response to ${response})`);
                }
                
                // Remove job assignment
                if (operation.jobAssignments.has(interaction.user.id)) {
                    operation.jobAssignments.delete(interaction.user.id);
                    
                    if (previousJob) {
                        console.log(`🎯 Removed job assignment: ${member ? member.user.tag : interaction.user.tag} was removed from ${previousJob}`);
                    }
                }
                
                // Save changes to disk
                await saveOperations();
                
            } catch (error) {
                console.error(`Error removing operation role for ${interaction.user.tag}:`, error.message);
                // Continue execution even if role removal fails
            }
        }

        // Update briefing message in operation info channel with new attending count
        if (operation.infoChannelId) {
            try {
                const guild = await global.client.guilds.fetch(operation.guildId);
                const infoChannel = guild.channels.cache.get(operation.infoChannelId);
                if (infoChannel) {
                    // Find the briefing message (should be the first embed message in the channel)
                    const messages = await infoChannel.messages.fetch({ limit: 10 });
                    const briefingMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title && msg.embeds[0].title.includes('OPERATION'));

                    if (briefingMessage) {
                        const originalEmbed = briefingMessage.embeds[0];
                        const updatedEmbed = new EmbedBuilder()
                            .setTitle(originalEmbed.title)
                            .setColor(originalEmbed.color)
                            .setTimestamp(new Date())
                            .setFooter(originalEmbed.footer);

                        // Update fields, especially the attending count and positions
                        const fields = originalEmbed.fields.map(field => {
                            if (field.name === '👥 Currently Attending') {
                                return { name: field.name, value: operation.attendingCount.toString(), inline: field.inline };
                            }
                            if (field.name === '📍 Positions') {
                                // Update positions to show current assignments (removing people who responded "no")
                                const positionsWithAssignments = operation.availableJobs.map(job => {
                                    const assignedUsers = Array.from(operation.jobAssignments.entries())
                                        .filter(([userId, assignedJob]) => assignedJob === job.name)
                                        .map(([userId]) => `<@${userId}>`)
                                        .join(' ');
                                    
                                    const capacity = job.maxCount ? ` (${job.maxCount} slots)` : ' (unlimited)';
                                    const index = operation.availableJobs.indexOf(job) + 1;
                                    return assignedUsers ? `${index}. ${job.name}${capacity} - ${assignedUsers}` : `${index}. ${job.name}${capacity}`;
                                }).join('\n');
                                
                                return { name: field.name, value: positionsWithAssignments || 'No positions assigned yet', inline: field.inline };
                            }
                            return field;
                        });

                        updatedEmbed.addFields(fields);
                        await briefingMessage.edit({ embeds: [updatedEmbed] });
                    }
                }
            } catch (error) {
                console.error('Error updating operation briefing:', error);
            }
        }

        // Update details message with new attending count AND positions
        if (operation.detailsMessageId) {
            try {
                const guild = await global.client.guilds.fetch(operation.guildId);
                const detailsChannel = guild.channels.cache.get(OPERATION_DETAILS_CHANNEL_ID);
                if (detailsChannel) {
                    const detailsMessage = await detailsChannel.messages.fetch(operation.detailsMessageId);
                    const originalEmbed = detailsMessage.embeds[0];

                    // Update the content with new attending count
                    let updatedContent = originalEmbed.description.replace(
                        /\*\*👥 CURRENTLY ATTENDING:\*\* \d+/,
                        `**👥 CURRENTLY ATTENDING:** ${operation.attendingCount}`
                    );

                    // Update positions section with current assignments (removing people who responded "no")
                    const positionsWithAssignments = operation.availableJobs.map(job => {
                        const assignedUsers = Array.from(operation.jobAssignments.entries())
                            .filter(([userId, assignedJob]) => assignedJob === job.name)
                            .map(([userId]) => `<@${userId}>`)
                            .join(' ');
                        
                        const capacity = job.maxCount ? ` (${job.maxCount} slots)` : ' (unlimited)';
                        const index = operation.availableJobs.indexOf(job) + 1;
                        return assignedUsers ? `${index}. ${job.name}${capacity} - ${assignedUsers}` : `${index}. ${job.name}${capacity}`;
                    }).join('\n');
                    
                    // Replace the positions section
                    updatedContent = updatedContent.replace(
                        /### \*\*📍 POSITIONS:\*\*\n[\s\S]*?\n\n### \*\*📝 ADDITIONAL NOTES:/,
                        `### **📍 POSITIONS:**\n${positionsWithAssignments}\n\n### **📝 ADDITIONAL NOTES:`
                    );

                    const updatedEmbed = new EmbedBuilder()
                        .setDescription(updatedContent)
                        .setColor(originalEmbed.color);

                    await detailsMessage.edit({ embeds: [updatedEmbed] });
                }
            } catch (error) {
                console.error('Error updating details message:', error);
            }
        }

        // Response messages with better context for assignment removal
        const responseMessages = {
            'yes': '✅ **Confirmed!** You have confirmed your participation and received the operation role.',
            'tbd': '❔ **Noted!** You have marked your availability as "To Be Determined".' + (previousResponse && (previousResponse.response === 'yes' || previousResponse.response === 'yes_pending_job') ? ' Your previous assignment has been removed.' : ''),
            'no': '❌ **Understood!** You have declined participation in this operation.' + (previousResponse && (previousResponse.response === 'yes' || previousResponse.response === 'yes_pending_job') ? ' Your previous assignment has been removed.' : '')
        };

        try {
            await interaction.reply({
                content: responseMessages[response] + `\n\n**Operation**: ${operation.name}\n**Time**: ${operation.time}\n**Currently Attending**: ${operation.attendingCount}`,
                flags: 64
            });
        } catch (error) {
            console.error(`Failed to send response to ${interaction.user.tag}:`, error.message);
        }

        console.log(`📋 Operation Response: ${interaction.user.tag} responded "${response}" to operation "${operation.name}" (Attending: ${operation.attendingCount})`);
    },

    async handleJobSelection(interaction, operationId) {
        const operation = operationSchedules.get(operationId);
        
        if (!operation) {
            await interaction.reply({
                content: '❌ **Operation Expired**: This operation is no longer accepting responses.',
                flags: 64
            });
            return;
        }

        // Parse the selected job from the dropdown value
        const selectedValue = interaction.values[0]; // job_index_operationId
        const jobIndex = parseInt(selectedValue.split('_')[1]);
        const selectedJobObj = operation.availableJobs[jobIndex];
        const selectedJob = selectedJobObj ? selectedJobObj.name : null;

        if (!selectedJob) {
            await interaction.reply({
                content: '❌ **Invalid Selection**: The selected position is no longer available.',
                flags: 64
            });
            return;
        }

        // Check capacity limits
        const currentCount = Array.from(operation.jobAssignments.values()).filter(assignedJob => assignedJob === selectedJob).length;
        if (selectedJobObj.maxCount && currentCount >= selectedJobObj.maxCount) {
            await interaction.reply({
                content: `❌ **Position Full**: The ${selectedJob} position has reached its maximum capacity (${selectedJobObj.maxCount}).`,
                flags: 64
            });
            return;
        }

        // Check if user already has a different response
        const previousResponse = operation.responses.get(interaction.user.id);
        
        // Update user response with job selection
        operation.responses.set(interaction.user.id, {
            response: 'yes',
            job: selectedJob,
            username: interaction.user.tag,
            timestamp: new Date()
        });

        // Store job assignment
        operation.jobAssignments.set(interaction.user.id, selectedJob);
        
        // Save to disk immediately
        await saveOperations();
        
        console.log(`💾 Job assignment saved: ${interaction.user.tag} -> ${selectedJob} for operation ${operation.name}`);

        // Update attending count if this is a new "yes" response
        if (!previousResponse || previousResponse.response !== 'yes') {
            operation.attendingCount++;
        }

        // Give operation role
        if (operation.operationRoleId) {
            try {
                const guild = await global.client.guilds.fetch(operation.guildId);
                if (!guild) {
                    throw new Error('Guild not found');
                }
                
                const member = await guild.members.fetch(interaction.user.id);
                if (!member) {
                    throw new Error('Member not found in guild');
                }
                
                const operationRole = guild.roles.cache.get(operation.operationRoleId);
                if (!operationRole) {
                    throw new Error('Operation role not found');
                }
                
                if (!member.roles.cache.has(operation.operationRoleId)) {
                    await member.roles.add(operationRole);
                    console.log(`✅ Added operation role to ${member.user.tag} for job: ${selectedJob}`);
                }

                // Also check for certification roles and add if user has them
                for (const [certName, roleId] of Object.entries(CERTIFICATION_ROLES)) {
                    if (selectedJob.includes(certName) && member.roles.cache.has(roleId)) {
                        console.log(`✅ User ${member.user.tag} has ${certName} certification for job: ${selectedJob}`);
                    }
                }
            } catch (error) {
                console.error(`Error adding operation role to ${interaction.user.tag}:`, error.message);
                // Still allow the assignment to proceed even if role addition fails
                await interaction.followUp({
                    content: `⚠️ **Warning**: Your job assignment was saved but there was an issue adding the operation role. Please contact an administrator.`,
                    flags: 64
                });
            }
        }

        // Update operation briefing in info channel
        if (operation.infoChannelId) {
            try {
                const guild = await global.client.guilds.fetch(operation.guildId);
                const infoChannel = guild.channels.cache.get(operation.infoChannelId);
                if (infoChannel) {
                    const messages = await infoChannel.messages.fetch({ limit: 10 });
                    const briefingMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title && msg.embeds[0].title.includes('OPERATION'));

                    if (briefingMessage) {
                        const originalEmbed = briefingMessage.embeds[0];
                        const updatedEmbed = new EmbedBuilder()
                            .setTitle(originalEmbed.title)
                            .setColor(originalEmbed.color)
                            .setTimestamp(new Date())
                            .setFooter(originalEmbed.footer);

                        // Update fields with job assignments inline
                        const fields = originalEmbed.fields.map(field => {
                            if (field.name === '👥 Currently Attending') {
                                return { name: field.name, value: operation.attendingCount.toString(), inline: field.inline };
                            }
                            if (field.name === '📍 Positions') {
                                // Build positions with assignments inline
                                const positionsWithAssignments = operation.availableJobs.map(job => {
                                    const assignedUsers = Array.from(operation.jobAssignments.entries())
                                        .filter(([userId, assignedJob]) => assignedJob === job.name)
                                        .map(([userId]) => `<@${userId}>`)
                                        .join(' ');
                                    
                                    const capacity = job.maxCount ? ` (${job.maxCount} slots)` : '';
                                    return assignedUsers ? `${job.name}${capacity} - ${assignedUsers}` : `${job.name}${capacity}`;
                                }).join('\n');
                                
                                return { name: field.name, value: positionsWithAssignments || 'None specified', inline: field.inline };
                            }
                            return field;
                        });

                        updatedEmbed.addFields(fields);
                        await briefingMessage.edit({ embeds: [updatedEmbed] });
                    }
                }
            } catch (error) {
                console.error('Error updating operation briefing:', error);
            }
        }

        // Update details message with job assignments
        if (operation.detailsMessageId) {
            try {
                const guild = await global.client.guilds.fetch(operation.guildId);
                const detailsChannel = guild.channels.cache.get(OPERATION_DETAILS_CHANNEL_ID);
                if (detailsChannel) {
                    const detailsMessage = await detailsChannel.messages.fetch(operation.detailsMessageId);
                    const originalEmbed = detailsMessage.embeds[0];

                    // Update the content with new attending count and job assignments
                    let updatedContent = originalEmbed.description.replace(
                        /\*\*👥 CURRENTLY ATTENDING:\*\* \d+/,
                        `**👥 CURRENTLY ATTENDING:** ${operation.attendingCount}`
                    );

                    // Update positions section with assignments inline
                    const positionsWithAssignments = operation.availableJobs.map(job => {
                        const assignedUsers = Array.from(operation.jobAssignments.entries())
                            .filter(([userId, assignedJob]) => assignedJob === job.name)
                            .map(([userId]) => `<@${userId}>`)
                            .join(' ');
                        
                        const capacity = job.maxCount ? ` (${job.maxCount} slots)` : ' (unlimited)';
                        const index = operation.availableJobs.indexOf(job) + 1;
                        return assignedUsers ? `${index}. ${job.name}${capacity} - ${assignedUsers}` : `${index}. ${job.name}${capacity}`;
                    }).join('\n');
                    
                    // Replace the positions section
                    updatedContent = updatedContent.replace(
                        /### \*\*📍 POSITIONS:\*\*\n[\s\S]*?\n\n### \*\*📝 ADDITIONAL NOTES:/,
                        `### **📍 POSITIONS:**\n${positionsWithAssignments}\n\n### **📝 ADDITIONAL NOTES:`
                    );

                    const updatedEmbed = new EmbedBuilder()
                        .setDescription(updatedContent)
                        .setColor(originalEmbed.color);

                    await detailsMessage.edit({ embeds: [updatedEmbed] });
                }
            } catch (error) {
                console.error('Error updating details message:', error);
            }
        }

        await interaction.reply({
            content: `✅ **Position Confirmed!**\n\n**Operation**: ${operation.name}\n**Your Position**: ${selectedJob}\n**Currently Attending**: ${operation.attendingCount}\n\nYou have been assigned to the operation and received the operation role.`,
            flags: 64
        });

        console.log(`🎯 Job Assignment: ${interaction.user.tag} selected "${selectedJob}" for operation "${operation.name}"`);
    },

    async handleEditButton(interaction) {
        // Check admin permissions
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can edit operations.',
                flags: 64
            });
            return;
        }

        if (interaction.customId.startsWith('edit_details_')) {
            const operationId = interaction.customId.replace('edit_details_', '');
            const operation = activeOperations.get(operationId) || operationSchedules.get(operationId);
            
            console.log(`🔍 Edit details button - Operation ID: ${operationId}`);
            console.log(`🔍 Found operation:`, operation ? operation.name : 'Not found');

            if (!operation) {
                await interaction.reply({
                    content: '❌ **Error**: Operation not found.',
                    flags: 64
                });
                return;
            }

            // Create edit form modal for details
            const modal = new ModalBuilder()
                .setCustomId(`edit_details_form_${operationId}`)
                .setTitle(`Edit Details: ${operation.name}`);

            const detailsInput = new TextInputBuilder()
                .setCustomId('edit_details_input')
                .setLabel('Operation Details')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(operation.details || 'No details provided')
                .setRequired(true)
                .setMaxLength(1500);

            const leaderInput = new TextInputBuilder()
                .setCustomId('edit_leader_input')
                .setLabel('Operation Leader')
                .setStyle(TextInputStyle.Short)
                .setValue(operation.leader || 'Unknown')
                .setRequired(true)
                .setMaxLength(100);

            const timeInput = new TextInputBuilder()
                .setCustomId('edit_time_input')
                .setLabel('Operation Time')
                .setStyle(TextInputStyle.Short)
                .setValue(operation.time || 'TBD')
                .setRequired(true)
                .setMaxLength(100);

            modal.addComponents(
                new ActionRowBuilder().addComponents(detailsInput),
                new ActionRowBuilder().addComponents(leaderInput),
                new ActionRowBuilder().addComponents(timeInput)
            );

            await interaction.showModal(modal);
        } else if (interaction.customId.startsWith('edit_positions_')) {
            const operationId = interaction.customId.replace('edit_positions_', '');
            const operation = activeOperations.get(operationId) || operationSchedules.get(operationId);
            
            console.log(`🔍 Edit positions button - Operation ID: ${operationId}`);
            console.log(`🔍 Found operation:`, operation ? operation.name : 'Not found');
            
            if (!operation) {
                await interaction.reply({
                    content: '❌ **Error**: Operation not found.',
                    flags: 64
                });
                return;
            }
            
            // Handle position editing - show modal for positions
            const modal = new ModalBuilder()
                .setCustomId(`edit_positions_form_${operationId}`)
                .setTitle(`Edit Positions: ${operation.name}`);
            
            // Ensure availableJobs is an array
            if (!operation.availableJobs) {
                operation.availableJobs = [];
            }
            
            const currentPositions = operation.availableJobs.length > 0 
                ? operation.availableJobs.map(job => typeof job === 'object' ? `${job.name}:${job.maxCount || 'unlimited'}` : job).join('\n')
                : 'F-22 Pilot:2\nF-35 Pilot:1\nGround Crew:unlimited';
            
            const positionsInput = new TextInputBuilder()
                .setCustomId('edit_positions_input')
                .setLabel('Available Positions')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(currentPositions)
                .setPlaceholder('Enter positions, one per line (e.g., "F-22 Pilot:2" or "Ground Crew:unlimited")')
                .setRequired(true)
                .setMaxLength(1000);
            
            modal.addComponents(new ActionRowBuilder().addComponents(positionsInput));
            await interaction.showModal(modal);
            
        } else if (interaction.customId.startsWith('manage_assignments_')) {
            const operationId = interaction.customId.replace('manage_assignments_', '');
            const operation = activeOperations.get(operationId) || operationSchedules.get(operationId);
            
            console.log(`🔍 Manage assignments button - Operation ID: ${operationId}`);
            console.log(`🔍 Found operation:`, operation ? operation.name : 'Not found');

            if (!operation) {
                await interaction.reply({
                    content: '❌ **Error**: Operation not found.',
                    flags: 64
                });
                return;
            }

            // Ensure jobAssignments is initialized as a Map
            if (!operation.jobAssignments) {
                operation.jobAssignments = new Map();
            }
            
            let assignmentsList = '';
            if (operation.jobAssignments && operation.jobAssignments.size > 0) {
                for (const [userId, job] of operation.jobAssignments) {
                    const user = await interaction.client.users.fetch(userId).catch(() => null);
                    const username = user ? user.username : 'Unknown User';
                    assignmentsList += `• **${job}**: ${username} (<@${userId}>)\n`;
                }
            } else {
                assignmentsList = 'No assignments yet.';
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎯 Manage Assignments: ${operation.name}`)
                .setDescription(`**Current Assignments:**\n${assignmentsList}`)
                .setColor(0x0099FF);

            const removeButton = new ButtonBuilder()
                .setCustomId(`remove_assignment_${operationId}`)
                .setLabel('Remove Assignment')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️');

            const refreshButton = new ButtonBuilder()
                .setCustomId(`refresh_assignments_${operationId}`)
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄');

            const row = new ActionRowBuilder().addComponents(removeButton, refreshButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                flags: 64
            });
        }
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

        const operationId = interaction.customId.split('_').slice(2).join('_'); // Handle IDs with underscores
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

            console.log(`📤 Starting DM delivery to ${membersWithRole.size} members...`);
            
            for (const [memberId, member] of membersWithRole) {
                try {
                    await member.send({
                        content: `**🚨 URGENT - OPERATIONAL DEPLOYMENT NOTIFICATION**\n**FROM: ${interaction.guild.name} COMMAND**`,
                        embeds: [operationEmbed],
                        components: [responseRow]
                    });
                    console.log(`✅ DM sent successfully to ${member.user.tag}`);
                    successCount++;
                    
                    // Small delay to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`❌ Failed to send DM to ${member.user.tag}: ${error.message}`);
                    failCount++;
                    
                    // Try to handle common DM errors gracefully
                    if (error.code === 50007) {
                        console.log(`   └─ User ${member.user.tag} has DMs disabled`);
                    } else if (error.code === 50001) {
                        console.log(`   └─ Missing access to DM ${member.user.tag}`);
                    }
                }
            }
            
            console.log(`📊 DM Results: ${successCount} successful, ${failCount} failed`)

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
    },

    async handleEditModal(interaction) {
        // Check admin permissions
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can edit operations.',
                flags: 64
            });
            return;
        }

        // Handle different modal types
        if (interaction.customId.startsWith('edit_details_form_')) {
            const operationId = interaction.customId.replace('edit_details_form_', '');
            const operation = activeOperations.get(operationId) || operationSchedules.get(operationId);

            if (!operation) {
                await interaction.reply({
                    content: '❌ **Error**: Operation not found.',
                    flags: 64
                });
                return;
            }

            const newDetails = interaction.fields.getTextInputValue('edit_details_input');
            const newLeader = interaction.fields.getTextInputValue('edit_leader_input');
            const newTime = interaction.fields.getTextInputValue('edit_time_input');

            // Update operation data
            operation.details = newDetails;
            operation.leader = newLeader;
            operation.time = newTime;

            // Save to disk
            await saveOperations();

            await interaction.reply({
                content: `✅ **Operation Details Updated!**\n\n**Operation**: ${operation.name}\n**New Leader**: ${newLeader}\n**New Time**: ${newTime}\n\nDetails have been updated successfully.`,
                flags: 64
            });

        } else if (interaction.customId.startsWith('edit_positions_form_')) {
            const operationId = interaction.customId.replace('edit_positions_form_', '');
            const operation = activeOperations.get(operationId) || operationSchedules.get(operationId);

            if (!operation) {
                await interaction.reply({
                    content: '❌ **Error**: Operation not found.',
                    flags: 64
                });
                return;
            }

            const newPositionsString = interaction.fields.getTextInputValue('edit_positions_input');
            
            // Parse positions with capacity limits
            const newPositions = newPositionsString.split('\n').map(line => {
                line = line.trim();
                if (line.includes(':')) {
                    const [name, count] = line.split(':');
                    const maxCount = count.trim() === 'unlimited' ? null : parseInt(count.trim()) || null;
                    return { name: name.trim(), maxCount };
                } else {
                    return { name: line, maxCount: null };
                }
            }).filter(job => job.name.length > 0);

            // Update operation data
            operation.availableJobs = newPositions;

            // Save to disk
            await saveOperations();

            await interaction.reply({
                content: `✅ **Positions Updated!**\n\n**Operation**: ${operation.name}\n**New Positions**: ${newPositions.map(job => job.name).join(', ')}\n\nPositions have been updated successfully.`,
                flags: 64
            });
        }

        console.log(`✏️ Operation edited by ${interaction.user.tag}`);
    },

    async handleAssignmentButtons(interaction) {
        // Check admin permissions
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can manage assignments.',
                flags: 64
            });
            return;
        }

        if (interaction.customId.startsWith('remove_assignment_')) {
            const operationId = interaction.customId.replace('remove_assignment_', '');
            const operation = activeOperations.get(operationId) || operationSchedules.get(operationId);

            if (!operation) {
                await interaction.reply({
                    content: '❌ **Error**: Operation not found.',
                    flags: 64
                });
                return;
            }

            if (operation.jobAssignments.size === 0) {
                await interaction.reply({
                    content: '❌ **No assignments to remove.**',
                    flags: 64
                });
                return;
            }

            // Create dropdown with current assignments
            const options = [];
            for (const [userId, job] of operation.jobAssignments) {
                const user = await interaction.client.users.fetch(userId).catch(() => null);
                const username = user ? user.username : 'Unknown User';
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`${job} - ${username}`)
                    .setValue(userId)
                    .setDescription(`Remove ${username} from ${job}`)
                );
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`select_remove_${operationId}`)
                .setPlaceholder('Select assignment to remove')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                content: '🗑️ **Select an assignment to remove:**',
                components: [row],
                flags: 64
            });
        } else if (interaction.customId.startsWith('refresh_assignments_')) {
            // Refresh the assignments display
            const operationId = interaction.customId.replace('refresh_assignments_', '');
            await this.handleEditButton({ ...interaction, customId: `manage_assignments_${operationId}` });
        }
    },

    async handleRemoveAssignment(interaction) {
        const operationId = interaction.customId.replace('select_remove_', '');
        const userIdToRemove = interaction.values[0];
        const operation = activeOperations.get(operationId) || operationSchedules.get(operationId);

        if (!operation) {
            await interaction.reply({
                content: '❌ **Error**: Operation not found.',
                flags: 64
            });
            return;
        }

        const removedJob = operation.jobAssignments.get(userIdToRemove);
        const user = await interaction.client.users.fetch(userIdToRemove).catch(() => null);
        const username = user ? user.username : 'Unknown User';

        // Remove from assignments and responses
        operation.jobAssignments.delete(userIdToRemove);
        operation.responses.delete(userIdToRemove);
        operation.attendingCount = Math.max(0, operation.attendingCount - 1);

        // Remove operation role from user
        try {
            const member = await interaction.guild.members.fetch(userIdToRemove);
            if (member && operation.operationRoleId) {
                await member.roles.remove(operation.operationRoleId);
            }
        } catch (error) {
            console.error('Error removing role from user:', error);
        }

        // Save to disk
        await saveOperations();

        await interaction.reply({
            content: `✅ **Assignment Removed**\n\n**User**: ${username}\n**Position**: ${removedJob}\n\nThe user has been removed from the operation and their role has been revoked.`,
            flags: 64
        });

        console.log(`🗑️ Assignment removed by ${interaction.user.tag}: ${username} from ${removedJob}`);
    },

    async handleOperationAnnounce(interaction) {
        const operationId = interaction.options.getString('operation_id');
        const message = interaction.options.getString('message');
        
        const operation = operationSchedules.get(operationId) || activeOperations.get(operationId);
        
        if (!operation) {
            await interaction.reply({
                content: '❌ **Operation Not Found**: No operation found with that ID.',
                flags: 64
            });
            return;
        }
        
        if (!operation.operationRoleId) {
            await interaction.reply({
                content: '❌ **Error**: Operation role not found.',
                flags: 64
            });
            return;
        }
        
        try {
            const guild = interaction.guild;
            const operationRole = guild.roles.cache.get(operation.operationRoleId);
            
            if (!operationRole) {
                await interaction.reply({
                    content: '❌ **Error**: Operation role no longer exists.',
                    flags: 64
                });
                return;
            }
            
            const members = operationRole.members;
            
            if (members.size === 0) {
                await interaction.reply({
                    content: '❌ **No Participants**: No members found in this operation.',
                    flags: 64
                });
                return;
            }
            
            const announcementEmbed = new EmbedBuilder()
                .setTitle(`📢 OPERATION ANNOUNCEMENT`)
                .setDescription(`**Operation**: ${operation.name}\n**From**: ${interaction.user.tag}\n\n**Message**:\n${message}`)
                .setColor(0xFF6B35)
                .setTimestamp()
                .setFooter({ text: `Operation ID: ${operationId}` });
            
            let successCount = 0;
            let failureCount = 0;
            
            // Send DM to each operation member
            for (const member of members.values()) {
                try {
                    await member.send({ embeds: [announcementEmbed] });
                    successCount++;
                } catch (error) {
                    console.error(`Failed to send announcement to ${member.user.tag}:`, error);
                    failureCount++;
                }
            }
            
            // Also post in operation chat channel if it exists
            if (operation.chatChannelId) {
                const chatChannel = guild.channels.cache.get(operation.chatChannelId);
                if (chatChannel) {
                    await chatChannel.send({ embeds: [announcementEmbed] });
                }
            }
            
            await interaction.reply({
                content: `✅ **Announcement Sent!**\n\n**Operation**: ${operation.name}\n**Recipients**: ${successCount} members\n${failureCount > 0 ? `**Failed**: ${failureCount} members` : ''}\n**Message**: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                flags: 64
            });
            
            console.log(`📢 Operation announcement sent by ${interaction.user.tag} to ${successCount} members for operation ${operation.name}`);
            
        } catch (error) {
            console.error('Error sending operation announcement:', error);
            await interaction.reply({
                content: '❌ **Error**: Failed to send announcement.',
                flags: 64
            });
        }
    },

    // Export functions for persistence
    loadOperations,
    saveOperations,

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

    getOperationSchedules() {
        return operationSchedules;
    },

};