const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('operation-stop')
        .setDescription('Stop the active operation (Admin only)'),

    async execute(interaction) {
        // Defer reply immediately to prevent timeout
        await interaction.deferReply({ flags: 64 });

        if (!checkAdminPermissions(interaction.member)) {
            await interaction.editReply({
                content: '❌ **Access Denied**\nOnly administrators can manage operations.'
            });
            return;
        }

        // Get active operation for this guild
        const operationStart = require('./operation-start');
        const activeOperations = operationStart.getActiveOperations();
        const activeOperation = operationStart.getActiveOperation(interaction.guild.id);

        if (!activeOperation) {
            await interaction.editReply({
                content: '❌ No active operation found in this server.'
            });
            return;
        }

        try {
            const guild = interaction.guild;

            // Get all operation components
            const operationRole = guild.roles.cache.get(activeOperation.roleId);
            const category = guild.channels.cache.get(activeOperation.categoryId);
            const voiceChannel = guild.channels.cache.get(activeOperation.voiceChannelId);
            const infoChannel = guild.channels.cache.get(activeOperation.infoChannelId);
            const chatChannel = guild.channels.cache.get(activeOperation.chatChannelId);

            // Create final operation report
            const duration = Math.floor((Date.now() - activeOperation.startTime) / (1000 * 60 * 60 * 100)) / 10;
            const reportEmbed = new EmbedBuilder()
                .setTitle(`🏁 OPERATION ${activeOperation.name.toUpperCase()} - CONCLUDED`)
                .setColor(0x00FF00)
                .addFields(
                    { name: '👤 Operation Commander', value: `<@${activeOperation.commander}>`, inline: true },
                    { name: '⏱️ Actual Duration', value: `${duration} hours`, inline: true },
                    { name: '📅 Start Time', value: `<t:${Math.floor(activeOperation.startTime / 1000)}:F>`, inline: true },
                    { name: '🏁 End Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🎯 Objective', value: activeOperation.objective },
                    { name: '👥 Personnel Count', value: operationRole ? `${operationRole.members.size} assigned` : 'Unknown', inline: true },
                    { name: '📊 Status', value: '✅ Mission Complete', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Operation ID: ${activeOperation.id}` });

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
                await operationRole.delete(`Operation ${activeOperation.name} concluded`);
            }

            // Delete all operation channels
            const channelsToDelete = [voiceChannel, infoChannel, chatChannel].filter(Boolean);
            for (const channel of channelsToDelete) {
                try {
                    await channel.delete(`Operation ${activeOperation.name} concluded`);
                } catch (error) {
                    console.error(`Failed to delete channel ${channel.name}:`, error);
                }
            }

            // Delete category
            if (category) {
                try {
                    await category.delete(`Operation ${activeOperation.name} concluded`);
                } catch (error) {
                    console.error(`Failed to delete category:`, error);
                }
            }

            // Mark operation as inactive
            activeOperations.set(activeOperation.id, { ...activeOperation, active: false });

            await interaction.editReply({
                content: `✅ **Operation ${activeOperation.name} has been terminated.**\n\n` +
                        `🗑️ Role and channels have been cleaned up.\n` +
                        `📊 Operation ran for ${Math.floor(duration / (1000 * 60 * 60))} hours and ${Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))} minutes.`
            });

        } catch (error) {
            console.error('❌ Error stopping operation:', error);
            await interaction.editReply({
                content: '❌ There was an error stopping the operation. Please try again.'
            });
        }
    }
};