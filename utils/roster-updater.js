const { EmbedBuilder } = require('discord.js');

class RosterUpdater {
    constructor(client) {
        this.client = client;
        this.rosterChannelId = '1408854809888690288';
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.lastMessageId = null;
        
        this.start();
    }

    start() {
        // Initial update after 10 seconds
        setTimeout(() => this.updateRoster(), 10000);
        
        // Set up recurring updates
        setInterval(() => this.updateRoster(), this.updateInterval);
        
        console.log('📋 Roster auto-updater started (updates every 5 minutes)');
    }

    async updateRoster() {
        try {
            const channel = await this.client.channels.fetch(this.rosterChannelId);
            if (!channel) {
                console.error('❌ Roster channel not found');
                return;
            }

            const guild = channel.guild;
            
            // Fetch all guild members to ensure cache is populated
            try {
                await guild.members.fetch({ timeout: 10000 });
            } catch (fetchError) {
                console.warn('⚠️ Could not fetch all members, using cached data:', fetchError.message);
                // Continue with cached members if fetch fails
            }
            
            // Define certification roles
            const certificationRoles = {
                'ATC Certified': '1408995322021154846',
                'USAF | Air Force One Certified': '1408942834060361740', 
                'USMC | Marine One Certified': '1408943018991423571',
                'Ground Operations Certified': '1408995373455904789',
                'Trainee': '1408854677784887449'
            };

            // Create roster embed
            const embed = new EmbedBuilder()
                .setTitle('🎖️ ACTIVE PERSONNEL ROSTER')
                .setColor(0x2F3136)
                .setThumbnail(guild.iconURL())
                .setDescription('```ansi\n[2;36m▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀[0m\n[2;36m           DEPARTMENT OF DEFENSE           [0m\n[2;36m        UNITED STATES AIR FORCE           [0m\n[2;36m▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[0m\n```')
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
                        
                        // Sort members by join date (most recent first)
                        const sortedMembers = Array.from(roleMembers.values())
                            .sort((a, b) => b.joinedAt - a.joinedAt)
                            .slice(0, 12); // Limit to 12 members per role

                        for (const member of sortedMembers) {
                            const onlineStatus = member.presence?.status === 'online' ? '🟢' : 
                                               member.presence?.status === 'idle' ? '🟡' :
                                               member.presence?.status === 'dnd' ? '🔴' : '⚫';
                            
                            memberList += `${onlineStatus} **${member.displayName}**\n`;
                        }

                        if (roleMembers.size > 12) {
                            memberList += `*... and ${roleMembers.size - 12} more personnel*`;
                        }

                        const roleHeader = this.getRoleHeader(roleName, roleMembers.size);
                        embed.addFields({
                            name: roleHeader,
                            value: memberList,
                            inline: true
                        });
                    } else {
                        const roleHeader = this.getRoleHeader(roleName, 0);
                        embed.addFields({
                            name: roleHeader,
                            value: '*No personnel assigned*',
                            inline: true
                        });
                    }
                } else {
                    console.warn(`⚠️ Role not found: ${roleName} (${roleId})`);
                    const roleHeader = this.getRoleHeader(roleName, 0);
                    embed.addFields({
                        name: roleHeader,
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

            // Add summary statistics with better formatting
            const onlineCount = guild.members.cache.filter(m => !m.user.bot && m.presence?.status === 'online').size;
            const awayCount = guild.members.cache.filter(m => !m.user.bot && m.presence?.status === 'idle').size;
            const busyCount = guild.members.cache.filter(m => !m.user.bot && m.presence?.status === 'dnd').size;
            const offlineCount = totalPersonnel - onlineCount - awayCount - busyCount;

            embed.addFields({
                name: '📊 **FORCE READINESS STATUS**',
                value: `\`\`\`yaml\nTotal Personnel: ${totalPersonnel}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOperational: ${onlineCount} 🟢    |    Standby: ${awayCount} 🟡\nBusy: ${busyCount} 🔴           |    Offline: ${offlineCount} ⚫\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nReadiness Level: ${this.getReadinessLevel(onlineCount, totalPersonnel)}\n\`\`\``,
                inline: false
            });

            embed.setFooter({ 
                text: `Last Updated: ${new Date().toLocaleTimeString()} • Auto-refresh: 5min • DoD Classification: UNCLASSIFIED`,
                iconURL: guild.iconURL()
            });

            // Delete previous roster message and send new one
            if (this.lastMessageId) {
                try {
                    const oldMessage = await channel.messages.fetch(this.lastMessageId);
                    await oldMessage.delete();
                } catch (error) {
                    // Message might already be deleted, ignore error
                }
            }

            const newMessage = await channel.send({ embeds: [embed] });
            this.lastMessageId = newMessage.id;

            console.log(`📋 Roster updated in ${guild.name}`);

        } catch (error) {
            console.error('❌ Error updating roster:', error);
        }
    }

    getRoleIcon(roleName) {
        switch (roleName) {
            case 'ATC Certified': return '🎮';
            case 'USAF | Air Force One Certified': return '✈️';
            case 'USMC | Marine One Certified': return '🚁';
            case 'Ground Operations Certified': return '🚛';
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