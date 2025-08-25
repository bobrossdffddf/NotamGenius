const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('operation-stop')
        .setDescription('Stop an active operation (Admin only)')
        .addStringOption(option =>
            option.setName('operation_id')
                .setDescription('Operation ID to stop (leave empty to select from list)')
                .setRequired(false)),

    async execute(interaction) {
        // Defer reply immediately to prevent timeout
        await interaction.deferReply({ flags: 64 });

        if (!checkAdminPermissions(interaction.member)) {
            await interaction.editReply({
                content: '❌ **Access Denied**\nOnly administrators can manage operations.'
            });
            return;
        }

        const operationStart = require('./operation-start');
        const activeOperations = operationStart.getActiveOperations();
        const operationIdInput = interaction.options.getString('operation_id');

        // If specific operation ID provided, stop that one
        if (operationIdInput) {
            const operation = activeOperations.get(operationIdInput);
            if (!operation) {
                await interaction.editReply({
                    content: `❌ No operation found with ID: \`${operationIdInput}\``
                });
                return;
            }
            
            await this.stopOperation(interaction, operationIdInput, operation);
            return;
        }

        // Otherwise, show list of active operations for this guild
        const guildOperations = new Map();
        for (const [id, op] of activeOperations) {
            if (op.guildId === interaction.guild.id && op.active) {
                guildOperations.set(id, op);
            }
        }

        if (guildOperations.size === 0) {
            await interaction.editReply({
                content: '❌ No active operations found in this server.'
            });
            return;
        }

        // Create selection menu
        const options = [];
        for (const [id, op] of guildOperations) {
            options.push(new StringSelectMenuOptionBuilder()
                .setLabel(`${op.name}`)
                .setValue(id)
                .setDescription(`Started: ${new Date(op.startTime).toLocaleDateString()} | Leader: ${op.leader}`)
                .setEmoji('🛑')
            );
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_operation_stop')
            .setPlaceholder('Select operation to stop')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: '🛑 **Select Operation to Stop:**\n\nChoose which operation you want to terminate:',
            components: [row]
        });
    },

    async handleOperationStopSelection(interaction) {
        // Defer reply immediately to prevent timeout
        await interaction.deferReply({ flags: 64 });
        
        const operationId = interaction.values[0];
        const operationStart = require('./operation-start');
        const activeOperations = operationStart.getActiveOperations();
        const operation = activeOperations.get(operationId);

        if (!operation) {
            await interaction.editReply({
                content: '❌ **Error**: Operation not found.'
            });
            return;
        }

        await this.stopOperation(interaction, operationId, operation);
    },

    async stopOperation(interaction, operationId, operation) {
        try {
            const guild = interaction.guild;
            const operationStart = require('./operation-start');
            const activeOperations = operationStart.getActiveOperations();

            // Get all operation components
            const operationRole = guild.roles.cache.get(operation.roleId);
            const category = guild.channels.cache.get(operation.categoryId);
            const voiceChannel = guild.channels.cache.get(operation.voiceChannelId);
            const infoChannel = guild.channels.cache.get(operation.infoChannelId);
            const chatChannel = guild.channels.cache.get(operation.chatChannelId);

            // Create final operation report
            const duration = Math.floor((Date.now() - operation.startTime) / (1000 * 60 * 60)) / 10;
            const reportEmbed = new EmbedBuilder()
                .setTitle(`🏁 OPERATION ${operation.name.toUpperCase()} - CONCLUDED`)
                .setColor(0x00FF00)
                .addFields(
                    { name: '👤 Operation Leader', value: operation.leader || 'Unknown', inline: true },
                    { name: '⏱️ Actual Duration', value: `${duration} hours`, inline: true },
                    { name: '📅 Start Time', value: new Date(operation.startTime).toLocaleString(), inline: true },
                    { name: '🏁 End Time', value: new Date().toLocaleString(), inline: true },
                    { name: '🎯 Details', value: operation.details || 'No details provided' },
                    { name: '👥 Personnel Count', value: operationRole ? `${operationRole.members.size} assigned` : 'Unknown', inline: true },
                    { name: '📊 Status', value: '✅ Mission Complete', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Operation ID: ${operationId}` });

            // Post final report in info channel before deletion
            if (infoChannel) {
                await infoChannel.send({ embeds: [reportEmbed] });
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            }

            // Remove operation role from all members
            if (operationRole) {
                for (const member of operationRole.members.values()) {
                    try {
                        await member.roles.remove(operationRole);
                    } catch (error) {
                        console.error(`Failed to remove role from ${member.displayName}:`, error);
                    }
                }
                await operationRole.delete(`Operation ${operation.name} concluded`);
            }

            // Delete all operation channels
            const channelsToDelete = [voiceChannel, infoChannel, chatChannel].filter(Boolean);
            for (const channel of channelsToDelete) {
                try {
                    await channel.delete(`Operation ${operation.name} concluded`);
                } catch (error) {
                    console.error(`Failed to delete channel ${channel.name}:`, error);
                }
            }

            // Delete category
            if (category) {
                try {
                    await category.delete(`Operation ${operation.name} concluded`);
                } catch (error) {
                    console.error(`Failed to delete category:`, error);
                }
            }

            // Remove operation from memory and mark as inactive
            operation.active = false;
            activeOperations.delete(operationId);
            
            // Save operations data
            await operationStart.saveOperations();

            // Reply based on interaction type
            const successMessage = `✅ **Operation ${operation.name} has been terminated.**\n\n🗑️ Role and channels have been cleaned up.\n📊 Operation ran for ${Math.floor(duration)} hours and ${Math.floor((duration % 1) * 60)} minutes.`;
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: successMessage });
            } else {
                await interaction.reply({ content: successMessage, flags: 64 });
            }

        } catch (error) {
            console.error('❌ Error stopping operation:', error);
            await interaction.editReply({
                content: '❌ There was an error stopping the operation. Please try again.'
            });
        }
    },

};