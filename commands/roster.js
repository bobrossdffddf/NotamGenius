const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Assuming checkAdminPermissions is defined elsewhere and imported or globally available
// For the sake of this example, let's assume a placeholder function if it's not provided.
// In a real scenario, you'd import this function or ensure it's defined in scope.
function checkAdminPermissions(member) {
    // Placeholder: Replace with actual admin role checking logic
    // Example: Check if the member has a specific administrator role
    const adminRoleID = 'YOUR_ADMIN_ROLE_ID'; // Replace with the actual admin role ID
    return member.roles.cache.some(role => role.id === adminRoleID);
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('View current personnel and their certifications'),

    async execute(interaction) {
        // Check admin permissions first
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can manage rosters.',
                flags: 64
            });
            return;
        }

        const guild = interaction.guild;

        // Role IDs for certifications
        const certificationRoles = {
            'ATC Certified': '1408995322021154846',
            'USAF | Air Force One Certified': '1408942834060361740',
            'USMC | Marine One Certified': '1408943018991423571',
            'Ground Operations Certified': '1408995373455904789',
            'Trainee': '1408854677784887449'
        };

        const embed = new EmbedBuilder()
            .setTitle('📋 Current Personnel Roster')
            .setColor(0x5865F2)
            .setThumbnail(guild.iconURL())
            .setTimestamp();

        for (const [roleName, roleId] of Object.entries(certificationRoles)) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                const members = role.members.map(member => member.displayName).join('\n') || 'None assigned';
                embed.addFields({
                    name: `${roleName} (${role.members.size})`,
                    value: members.length > 1024 ? `${members.substring(0, 1020)}...` : members,
                    inline: true
                });
            }
        }

        await interaction.reply({ embeds: [embed] });
    }
};