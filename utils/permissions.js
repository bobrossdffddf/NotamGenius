/**
 * Permission utility functions for the Discord bot
 */

/**
 * Check if a member has admin permissions
 * @param {GuildMember} member - The Discord guild member to check
 * @returns {boolean} - True if the member has admin permissions
 */
function checkAdminPermissions(member) {
    if (!member) {
        return false;
    }

    // Check if user has administrator permission
    if (member.permissions.has('Administrator')) {
        return true;
    }

    // Check if user has manage guild permission (also considered admin-level)
    if (member.permissions.has('ManageGuild')) {
        return true;
    }

    // Check if user is the guild owner
    if (member.guild.ownerId === member.id) {
        return true;
    }

    // Additional check for specific admin roles (optional)
    const adminRoleNames = ['Admin', 'Administrator', 'Moderator', 'Staff'];
    const hasAdminRole = member.roles.cache.some(role => 
        adminRoleNames.some(adminRole => 
            role.name.toLowerCase().includes(adminRole.toLowerCase())
        )
    );

    return hasAdminRole;
}

/**
 * Get permission level description for logging
 * @param {GuildMember} member - The Discord guild member to check
 * @returns {string} - Permission level description
 */
function getPermissionLevel(member) {
    if (!member) {
        return 'Unknown';
    }

    if (member.guild.ownerId === member.id) {
        return 'Guild Owner';
    }

    if (member.permissions.has('Administrator')) {
        return 'Administrator';
    }

    if (member.permissions.has('ManageGuild')) {
        return 'Manage Guild';
    }

    const adminRoleNames = ['Admin', 'Administrator', 'Moderator', 'Staff'];
    const adminRole = member.roles.cache.find(role => 
        adminRoleNames.some(adminRole => 
            role.name.toLowerCase().includes(adminRole.toLowerCase())
        )
    );

    if (adminRole) {
        return `Admin Role: ${adminRole.name}`;
    }

    return 'Standard User';
}

/**
 * Log permission check for debugging
 * @param {GuildMember} member - The Discord guild member
 * @param {string} action - The action being attempted
 * @param {boolean} allowed - Whether the action was allowed
 */
function logPermissionCheck(member, action, allowed) {
    const username = member ? `${member.user.tag} (${member.id})` : 'Unknown User';
    const permissionLevel = getPermissionLevel(member);
    const status = allowed ? '✅ ALLOWED' : '❌ DENIED';
    
    console.log(`🔐 Permission Check: ${status} | User: ${username} | Level: ${permissionLevel} | Action: ${action}`);
}

module.exports = {
    checkAdminPermissions,
    getPermissionLevel,
    logPermissionCheck
};
