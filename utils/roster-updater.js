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
                .setTitle('📋 ACTIVE PERSONNEL ROSTER')
                .setColor(0x1F8B4C)
                .setThumbnail(guild.iconURL())
                .setDescription('**Current deployment status and certifications**')
                .setTimestamp();

            // Get total personnel count (excluding bots)
            const totalPersonnel = guild.members.cache.filter(member => !member.user.bot).size;
            
            // Add certification sections
            for (const [roleName, roleId] of Object.entries(certificationRoles)) {
                const role = guild.roles.cache.get(roleId);
                if (role && role.members.size > 0) {
                    let memberList = '';
                    
                    // Sort members by join date (most recent first)
                    const sortedMembers = Array.from(role.members.values())
                        .filter(member => !member.user.bot)
                        .sort((a, b) => b.joinedAt - a.joinedAt)
                        .slice(0, 15); // Limit to 15 members per role to avoid embed limits

                    for (const member of sortedMembers) {
                        const onlineStatus = member.presence?.status === 'online' ? '🟢' : 
                                           member.presence?.status === 'idle' ? '🟡' :
                                           member.presence?.status === 'dnd' ? '🔴' : '⚫';
                        
                        memberList += `${onlineStatus} ${member.displayName}\n`;
                    }

                    if (role.members.size > 15) {
                        memberList += `... and ${role.members.size - 15} more`;
                    }

                    embed.addFields({
                        name: `${this.getRoleIcon(roleName)} ${roleName} (${role.members.size})`,
                        value: memberList || 'None assigned',
                        inline: true
                    });
                } else {
                    embed.addFields({
                        name: `${this.getRoleIcon(roleName)} ${roleName} (0)`,
                        value: 'None assigned',
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
                    name: '🚁 ACTIVE OPERATION',
                    value: `**${activeOperation.name.toUpperCase()}**\n` +
                           `👥 Personnel: ${operationPersonnel}\n` +
                           `⏱️ Time Remaining: ${timeRemaining}h\n` +
                           `🎯 Status: ONGOING`,
                    inline: false
                });
            }

            // Add summary statistics
            embed.addFields({
                name: '📊 DEPLOYMENT SUMMARY',
                value: `👥 Total Personnel: **${totalPersonnel}**\n` +
                       `🟢 Online: **${guild.members.cache.filter(m => m.presence?.status === 'online').size}**\n` +
                       `🔄 Last Updated: <t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: false
            });

            embed.setFooter({ 
                text: 'Auto-updates every 5 minutes | 🟢 Online 🟡 Away 🔴 Busy ⚫ Offline'
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
}

module.exports = RosterUpdater;