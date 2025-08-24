const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chain-of-command')
        .setDescription('Display current chain of command (Admin only)'),

    async execute(interaction) {
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can view the chain of command.',
                flags: 64
            });
            return;
        }

        const guild = interaction.guild;
        
        // Define rank hierarchy (you can customize these role names)
        const rankHierarchy = [
            { name: 'General', roles: ['General', 'Fleet Admiral', 'Commander in Chief'] },
            { name: 'Colonel', roles: ['Colonel', 'Captain', 'Admiral'] },
            { name: 'Major', roles: ['Major', 'Commander', 'Lieutenant Commander'] },
            { name: 'Captain', roles: ['Captain', 'Lieutenant', 'Ensign'] },
            { name: 'Sergeant', roles: ['Sergeant', 'Staff Sergeant', 'Master Sergeant'] },
            { name: 'Corporal', roles: ['Corporal', 'Lance Corporal'] },
            { name: 'Specialist', roles: ['Specialist', 'Private First Class'] },
            { name: 'Private', roles: ['Private', 'Recruit', 'Cadet'] }
        ];

        // Get all members and their highest rank
        const rankedMembers = new Map();
        
        for (const [memberId, member] of guild.members.cache) {
            if (member.user.bot) continue;
            
            let highestRank = null;
            let rankLevel = 999;
            
            // Check if member has admin permissions (highest priority)
            if (member.permissions.has('Administrator') || member.id === guild.ownerId) {
                highestRank = { name: 'Command Staff', level: -1 };
                rankLevel = -1;
            } else {
                // Check for rank roles
                for (let i = 0; i < rankHierarchy.length; i++) {
                    const rank = rankHierarchy[i];
                    const hasRankRole = member.roles.cache.some(role => 
                        rank.roles.some(rankName => 
                            role.name.toLowerCase().includes(rankName.toLowerCase())
                        )
                    );
                    
                    if (hasRankRole && i < rankLevel) {
                        highestRank = { name: rank.name, level: i };
                        rankLevel = i;
                    }
                }
            }
            
            if (highestRank) {
                if (!rankedMembers.has(highestRank.name)) {
                    rankedMembers.set(highestRank.name, []);
                }
                rankedMembers.get(highestRank.name).push({
                    member: member,
                    level: highestRank.level
                });
            }
        }

        // Build chain of command embed
        const embed = new EmbedBuilder()
            .setTitle('⭐ CHAIN OF COMMAND')
            .setColor(0x1F8B4C)
            .setThumbnail(guild.iconURL())
            .setTimestamp();

        // Add guild owner first
        const owner = await guild.fetchOwner();
        embed.addFields({
            name: '👑 Guild Commander',
            value: `${owner.displayName} (${owner.user.tag})`,
            inline: false
        });

        // Sort ranks by level and add to embed
        const sortedRanks = Array.from(rankedMembers.entries())
            .sort((a, b) => {
                if (a[1][0].level === -1) return -1;
                if (b[1][0].level === -1) return 1;
                return a[1][0].level - b[1][0].level;
            });

        for (const [rankName, members] of sortedRanks) {
            if (rankName === 'Command Staff') {
                const commandStaff = members
                    .filter(m => m.member.id !== owner.id)
                    .map(m => m.member.displayName)
                    .join('\n') || 'None assigned';
                
                embed.addFields({
                    name: '⭐ Command Staff',
                    value: commandStaff,
                    inline: true
                });
            } else {
                const memberList = members
                    .map(m => m.member.displayName)
                    .join('\n') || 'None assigned';
                
                embed.addFields({
                    name: `🎖️ ${rankName}`,
                    value: memberList,
                    inline: true
                });
            }
        }

        // Get current active operation
        const operationStart = require('./operation-start');
        const activeOperation = operationStart.getActiveOperation(guild.id);
        
        if (activeOperation) {
            const commander = guild.members.cache.get(activeOperation.commander);
            embed.addFields({
                name: '🚁 Current Operation Commander',
                value: `${commander ? commander.displayName : 'Unknown'}\nOperation: **${activeOperation.name}**`,
                inline: false
            });
        }

        // Add certification counts
        const certificationRoles = {
            'ATC Certified': '1408995322021154846',
            'USAF | Air Force One Certified': '1408942834060361740',
            'USMC | Marine One Certified': '1408943018991423571',
            'Ground Operations Certified': '1408995373455904789'
        };

        let certificationSummary = '';
        for (const [certName, roleId] of Object.entries(certificationRoles)) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                certificationSummary += `${certName}: ${role.members.size}\n`;
            }
        }

        if (certificationSummary) {
            embed.addFields({
                name: '📋 Certification Summary',
                value: certificationSummary,
                inline: false
            });
        }

        embed.setFooter({ 
            text: `Total Personnel: ${guild.memberCount - guild.members.cache.filter(m => m.user.bot).size}` 
        });

        await interaction.reply({ embeds: [embed] });
    }
};