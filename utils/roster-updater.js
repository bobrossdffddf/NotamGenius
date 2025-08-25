const { EmbedBuilder } = require('discord.js');
const { guildConfigManager } = require('../config/guild-config');

class RosterUpdater {
    constructor(client) {
        this.client = client;
        this.updateInterval = 2 * 60 * 1000; // 2 minutes (more frequent)
        this.lastMessageId = null;
        this.lastUpdateTime = 0; // Track last update time
        
        this.start();
    }

    start() {
        // Initial update after 10 seconds
        setTimeout(() => this.updateRoster(), 10000);
        
        // Set up recurring updates
        setInterval(() => this.updateRoster(), this.updateInterval);
        
        console.log('📋 Roster auto-updater started (updates every 2 minutes)');
    }

    async updateRoster() {
        try {
            // Update rosters for all guilds where the bot is present
            for (const guild of this.client.guilds.cache.values()) {
                await this.updateGuildRoster(guild);
            }
        } catch (error) {
            console.error('❌ Error updating rosters:', error);
        }
    }

    async updateGuildRoster(guild) {
        try {
            // Auto-discover or get guild configuration
            await guildConfigManager.autoDiscoverGuildConfig(guild);
            const rosterChannelId = guildConfigManager.getGuildConfigValue(guild.id, 'rosterChannelId');
            
            if (!rosterChannelId) {
                // Skip guilds without configured roster channels
                return;
            }
            
            const channel = guild.channels.cache.get(rosterChannelId);
            if (!channel) {
                console.error(`❌ Roster channel not found in guild: ${guild.name}`);
                return;
            }
            
            // Fetch all guild members to ensure cache is populated
            try {
                await guild.members.fetch({ timeout: 10000 });
            } catch (fetchError) {
                console.warn('⚠️ Could not fetch all members, using cached data:', fetchError.message);
                // Continue with cached members if fetch fails
            }
            
            // Get certification roles from guild configuration
            const certificationRoles_apply = guildConfigManager.getGuildConfigValue(guild.id, 'certificationRoles_apply', {});
            const traineeRoleId = guildConfigManager.getGuildConfigValue(guild.id, 'traineeRoleId');
            
            // Build certification roles map for roster display
            const certificationRoles = {};
            for (const [key, config] of Object.entries(certificationRoles_apply)) {
                if (config.roleId) {
                    certificationRoles[config.name] = config.roleId;
                }
            }
            
            // Add trainee role if configured
            if (traineeRoleId) {
                certificationRoles['Trainee'] = traineeRoleId;
            }
            
            // If no roles are configured, try to find some automatically
            if (Object.keys(certificationRoles).length === 0) {
                console.warn(`⚠️ No certification roles configured for guild: ${guild.name}`);
                return;
            }

            // Purge channel before updating
            try {
                const messages = await channel.messages.fetch({ limit: 100 });
                await channel.bulkDelete(messages);
            } catch (purgeError) {
                console.warn('⚠️ Could not purge channel messages:', purgeError.message);
            }

            // Create roster embed
            const embed = new EmbedBuilder()
                .setTitle('📋 PERSONNEL ROSTER')
                .setColor(0x2F3136)
                .setDescription('**Department of Defense - United States Air Force**')
                .setTimestamp();

            // Get total personnel count (excluding bots)
            const totalPersonnel = guild.members.cache.filter(member => !member.user.bot).size;
            
            // Add certification sections with better formatting
            for (const [roleName, roleId] of Object.entries(certificationRoles)) {
                const role = guild.roles.cache.get(roleId);
                
                if (role) {
                    // Filter out bot members
                    const roleMembers = role.members.filter(member => !member.user.bot);
                    
                    if (roleMembers.size > 0) {
                        let memberList = '';
                        
                        // Sort members alphabetically
                        const sortedMembers = Array.from(roleMembers.values())
                            .sort((a, b) => a.displayName.localeCompare(b.displayName))
                            .slice(0, 15); // Show more members

                        for (const member of sortedMembers) {
                            memberList += `• ${member.displayName}\n`;
                        }

                        if (roleMembers.size > 15) {
                            memberList += `*... ${roleMembers.size - 15} more*`;
                        }

                        embed.addFields({
                            name: `${this.getRoleIcon(roleName)} ${roleName} (${roleMembers.size})`,
                            value: memberList,
                            inline: true
                        });
                    } else {
                        embed.addFields({
                            name: `${this.getRoleIcon(roleName)} ${roleName} (0)`,
                            value: '*No personnel assigned*',
                            inline: true
                        });
                    }
                } else {
                    console.warn(`⚠️ Role not found: ${roleName} (${roleId})`);
                    embed.addFields({
                        name: `${this.getRoleIcon(roleName)} ${roleName} (0)`,
                        value: '*Role not found*',
                        inline: true
                    });
                }
            }

            // Add active operation info if any
            const operationStart = require('../commands/operation-start');
            const activeOperation = operationStart.getActiveOperation(guild.id);
            
            if (activeOperation) {
                const operationRole = guild.roles.cache.get(activeOperation.roleId);
                const operationPersonnel = operationRole ? operationRole.members.size : 0;
                const timeRemaining = Math.max(0, Math.floor((activeOperation.endTime - Date.now()) / (1000 * 60 * 60)));
                
                embed.addFields({
                    name: '🚁 **CURRENT OPERATION STATUS**',
                    value: `\`\`\`fix\nOPERATION: ${activeOperation.name.toUpperCase()}\nPERSONNEL: ${operationPersonnel} ASSIGNED\nTIME REMAINING: ${timeRemaining} HOURS\nSTATUS: ACTIVE\n\`\`\``,
                    inline: false
                });
            }

            // Add simple statistics
            const onlineCount = guild.members.cache.filter(m => !m.user.bot && m.presence?.status === 'online').size;

            embed.addFields({
                name: '📊 Summary',
                value: `Total Personnel: **${totalPersonnel}**\nCurrently Online: **${onlineCount}**`,
                inline: false
            });

            embed.setFooter({ 
                text: `Last Updated: ${new Date().toLocaleTimeString()} • Updates every 2 minutes`
            });

            const newMessage = await channel.send({ embeds: [embed] });

            this.lastUpdateTime = Date.now();
            console.log(`📋 Roster updated in ${guild.name}`);

        } catch (error) {
            console.error('❌ Error updating roster:', error);
        }
    }

    // Method to force an immediate roster update (called when operation status changes)
    async forceUpdate() {
        const now = Date.now();
        // Prevent spam updates (minimum 30 seconds between forced updates)
        if (now - this.lastUpdateTime < 30000) {
            console.log('⏱️ Roster update skipped (too recent)');
            return;
        }
        
        console.log('🔄 Forcing roster update due to operation status change...');
        await this.updateRoster();
    }

    getRoleIcon(roleName) {
        switch (roleName) {
            case 'ATC Certified': return '🎮';
            case 'USAF | Air Force One Certified': return '✈️';
            case 'USMC | Marine One Certified': return '🚁';
            case 'Ground Operations Certified': return '🚛';
            case 'F-22 Certified': return '🦅';
            case 'F-35 Certified': return '⚡';
            case 'F-16 Certified': return '🔥';
            case 'Trainee': return '🎓';
            default: return '🎖️';
        }
    }

    getRoleHeader(roleName, count) {
        const icon = this.getRoleIcon(roleName);
        const countBadge = count > 0 ? `[\`${count}\`]` : `[\`0\`]`;
        return `${icon} **${roleName}** ${countBadge}`;
    }

    getReadinessLevel(online, total) {
        const percentage = total > 0 ? (online / total) * 100 : 0;
        if (percentage >= 80) return "FULL OPERATIONAL ✅";
        if (percentage >= 60) return "HIGH READINESS 🟢";
        if (percentage >= 40) return "MODERATE 🟡";
        if (percentage >= 20) return "LIMITED 🟠";
        return "MINIMAL 🔴";
    }
}

module.exports = RosterUpdater;