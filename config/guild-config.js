/**
 * Guild-specific configuration management
 * This replaces hardcoded IDs with configurable settings per server
 */

class GuildConfigManager {
    constructor() {
        this.guildConfigs = new Map();
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            // Operation settings - these will be configured per guild
            targetRoleId: null, // The role to ping for operations (must be configured)
            operationDetailsChannelId: null, // Channel for operation details (must be configured)
            
            // Certification roles - these will be discovered automatically or configured
            certificationRoles: {
                'F-22': null,
                'F-16': null, 
                'F-35': null
            },
            
            // Apply command settings
            privateChannelId: null, // Private channel for applications (must be configured)
            traineeRoleId: null, // Trainee role ID (must be configured)
            certificationRoles_apply: {
                'atc': { name: 'ATC Certified', roleId: null },
                'af1': { name: 'USAF | Air Force One Certified', roleId: null },
                'marine-one': { name: 'USMC | Marine One Certified', roleId: null },
                'ground-ops': { name: 'Ground Operations Certified', roleId: null },
                'f22': { name: 'F-22 Raptor Certified', roleId: null },
                'f35': { name: 'F-35 Lightning II Certified', roleId: null },
                'f16': { name: 'F-16 Fighting Falcon Certified', roleId: null }
            },
            
            // Roster settings
            rosterChannelId: null, // Channel for roster updates (must be configured)
            
            // Auto-discovery settings
            autoDiscoverRoles: true, // Whether to try to auto-discover roles by name
            requireManualConfig: false // Whether to require manual configuration
        };
    }

    /**
     * Get configuration for a guild
     * @param {string} guildId - The guild ID
     * @returns {Object} - Guild configuration
     */
    getGuildConfig(guildId) {
        if (!this.guildConfigs.has(guildId)) {
            this.guildConfigs.set(guildId, { ...this.defaultConfig });
        }
        return this.guildConfigs.get(guildId);
    }

    /**
     * Auto-discover roles and channels for a guild
     * @param {Guild} guild - The Discord guild object
     * @returns {Promise<Object>} - Updated configuration
     */
    async autoDiscoverGuildConfig(guild) {
        const config = this.getGuildConfig(guild.id);
        console.log(`🔍 Auto-discovering configuration for guild: ${guild.name}`);

        // Use specific role IDs for roster (override auto-discovery)
        if (guild.id === '1409326088529641705') { // Test guild
            // Use the specific certified role IDs provided
            config.certificationRoles_apply = {
                'f22': { name: 'F-22 Certified', roleId: '1409300377463165079' },
                'f35': { name: 'F-35 Certified', roleId: '1409300434967072888' },
                'f16': { name: 'F-16 Certified', roleId: '1409300512062574663' }
            };
        } else if (config.autoDiscoverRoles) {
            // Auto-discover certification roles by name for other guilds
            const f22Role = guild.roles.cache.find(r => r.name.toLowerCase().includes('f-22') || r.name.toLowerCase().includes('f22'));
            const f16Role = guild.roles.cache.find(r => r.name.toLowerCase().includes('f-16') || r.name.toLowerCase().includes('f16'));
            const f35Role = guild.roles.cache.find(r => r.name.toLowerCase().includes('f-35') || r.name.toLowerCase().includes('f35'));
            
            if (f22Role) config.certificationRoles['F-22'] = f22Role.id;
            if (f16Role) config.certificationRoles['F-16'] = f16Role.id;
            if (f35Role) config.certificationRoles['F-35'] = f35Role.id;

            // Apply command certification roles
            const roles = guild.roles.cache;
            
            const atcRole = roles.find(r => r.name.toLowerCase().includes('atc'));
            const af1Role = roles.find(r => r.name.toLowerCase().includes('air force one'));
            const marineOneRole = roles.find(r => r.name.toLowerCase().includes('marine one'));
            const groundOpsRole = roles.find(r => r.name.toLowerCase().includes('ground operations'));
            const traineeRole = roles.find(r => r.name.toLowerCase().includes('trainee'));

            if (atcRole) config.certificationRoles_apply.atc.roleId = atcRole.id;
            if (af1Role) config.certificationRoles_apply.af1.roleId = af1Role.id;
            if (marineOneRole) config.certificationRoles_apply['marine-one'].roleId = marineOneRole.id;
            if (groundOpsRole) config.certificationRoles_apply['ground-ops'].roleId = groundOpsRole.id;
            if (traineeRole) config.traineeRoleId = traineeRole.id;

            // Try to find F-22, F-35, F-16 certified roles for apply command
            if (f22Role) config.certificationRoles_apply.f22.roleId = f22Role.id;
            if (f16Role) config.certificationRoles_apply.f16.roleId = f16Role.id;
            if (f35Role) config.certificationRoles_apply.f35.roleId = f35Role.id;
        }

        // Auto-discover channels
        const channels = guild.channels.cache;
        
        // Look for operation-related channels
        const operationChannel = channels.find(c => 
            c.name.toLowerCase().includes('operation') && 
            (c.name.toLowerCase().includes('detail') || c.name.toLowerCase().includes('brief'))
        );
        if (operationChannel) config.operationDetailsChannelId = operationChannel.id;

        // Look for roster channel
        const rosterChannel = channels.find(c => c.name.toLowerCase().includes('roster'));
        if (rosterChannel) config.rosterChannelId = rosterChannel.id;

        // Look for private/admin channel
        const privateChannel = channels.find(c => 
            (c.name.toLowerCase().includes('private') || c.name.toLowerCase().includes('admin')) &&
            c.type === 0 // Text channel
        );
        if (privateChannel) config.privateChannelId = privateChannel.id;

        // Try to find a suitable target role (look for roles that might be used for operations)
        const targetRole = guild.roles.cache.find(r => 
            r.name.toLowerCase().includes('pilot') || 
            r.name.toLowerCase().includes('operator') ||
            r.name.toLowerCase().includes('member') ||
            (r.name.toLowerCase().includes('air') && r.name.toLowerCase().includes('force'))
        );
        if (targetRole) config.targetRoleId = targetRole.id;

        this.guildConfigs.set(guild.id, config);
        
        console.log(`✅ Auto-discovery complete for ${guild.name}:`, {
            targetRole: targetRole?.name || 'Not found',
            operationChannel: operationChannel?.name || 'Not found',
            rosterChannel: rosterChannel?.name || 'Not found',
            privateChannel: privateChannel?.name || 'Not found',
            rolesFound: Object.values(config.certificationRoles).filter(Boolean).length
        });

        return config;
    }

    /**
     * Validate guild configuration
     * @param {string} guildId - The guild ID
     * @returns {Object} - Validation result with missing items
     */
    validateGuildConfig(guildId) {
        const config = this.getGuildConfig(guildId);
        const missing = [];
        const warnings = [];

        // Critical settings
        if (!config.targetRoleId) missing.push('Target role for operations');
        if (!config.operationDetailsChannelId) missing.push('Operation details channel');
        
        // Important but not critical
        if (!config.rosterChannelId) warnings.push('Roster channel');
        if (!config.privateChannelId) warnings.push('Private channel for applications');
        if (!config.traineeRoleId) warnings.push('Trainee role');

        return {
            isValid: missing.length === 0,
            missing,
            warnings,
            config
        };
    }

    /**
     * Set a specific configuration value
     * @param {string} guildId - The guild ID
     * @param {string} key - The configuration key
     * @param {any} value - The value to set
     */
    setGuildConfigValue(guildId, key, value) {
        const config = this.getGuildConfig(guildId);
        const keys = key.split('.');
        let current = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        this.guildConfigs.set(guildId, config);
    }

    /**
     * Get a specific configuration value with fallback
     * @param {string} guildId - The guild ID
     * @param {string} key - The configuration key (dot notation supported)
     * @param {any} fallback - Fallback value
     * @returns {any} - The configuration value
     */
    getGuildConfigValue(guildId, key, fallback = null) {
        const config = this.getGuildConfig(guildId);
        const keys = key.split('.');
        let current = config;
        
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return fallback;
            }
        }
        
        return current;
    }
}

// Export singleton instance
const guildConfigManager = new GuildConfigManager();

module.exports = {
    guildConfigManager,
    GuildConfigManager
};