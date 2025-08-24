const { SlashCommandBuilder } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('operation-add')
        .setDescription('Add personnel to active operation (Admin only)')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to add to the operation')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can manage operation personnel.',
                flags: 64
            });
            return;
        }

        // Get active operation for this guild
        const operationStart = require('./operation-start');
        const activeOperation = operationStart.getActiveOperation(interaction.guild.id);

        if (!activeOperation) {
            await interaction.reply({
                content: '❌ No active operation found. Start an operation first with `/operation start`.',
                flags: 64
            });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        try {
            const operationRole = interaction.guild.roles.cache.get(activeOperation.roleId);
            
            if (!operationRole) {
                await interaction.reply({
                    content: '❌ Operation role not found. The operation may have been corrupted.',
                    flags: 64
                });
                return;
            }

            // Check if user already has the role
            if (targetMember.roles.cache.has(operationRole.id)) {
                await interaction.reply({
                    content: `❌ ${targetUser.displayName} is already assigned to Operation **${activeOperation.name}**.`,
                    flags: 64
                });
                return;
            }

            // Add the role
            await targetMember.roles.add(operationRole);

            await interaction.reply({
                content: `✅ **${targetUser.displayName}** has been added to Operation **${activeOperation.name}**!\n\n` +
                        `🏷️ Role: <@&${operationRole.id}>\n` +
                        `📁 They now have access to the operation channels.`,
                flags: 64
            });

            // Log to operation chat channel
            const chatChannel = interaction.guild.channels.cache.get(activeOperation.chatChannelId);
            if (chatChannel) {
                await chatChannel.send(`🎖️ **${targetUser.displayName}** has been assigned to the operation by <@${interaction.user.id}>.`);
            }

        } catch (error) {
            console.error('❌ Error adding user to operation:', error);
            await interaction.reply({
                content: '❌ There was an error adding the user to the operation.',
                flags: 64
            });
        }
    }
};