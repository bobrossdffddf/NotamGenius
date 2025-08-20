/**
 * Configuration settings for the Discord NOTAM Bot
 */

// Bot configuration
const config = {
    // Bot settings
    bot: {
        name: 'NOTAM Generator Bot',
        version: '1.0.0',
        description: 'Military-style NOTAM generator for Discord servers',
        commandPrefix: '/',
        maxFormSessions: 50, // Maximum concurrent form sessions
        sessionTimeout: 1800000 // 30 minutes in milliseconds
    },

    // Permission settings
    permissions: {
        requiredPermissions: ['Administrator', 'ManageGuild'],
        adminRoleNames: ['Admin', 'Administrator', 'Moderator', 'Staff', 'Officer'],
        bypassUserIds: [], // User IDs that can bypass admin checks (if needed)
        logPermissionChecks: true
    },

    // NOTAM settings
    notam: {
        maxOperationNameLength: 100,
        maxOperationDetailsLength: 2000,
        maxPositionsLength: 1500,
        maxAdditionalNotesLength: 1000,
        defaultTimezone: 'Z', // Zulu time
        includeTimestamp: true,
        validateMentions: true
    },

    // Performance settings (optimized for Raspberry Pi Zero)
    performance: {
        enableCaching: true,
        cacheTimeout: 600000, // 10 minutes
        maxConcurrentForms: 10,
        formCleanupInterval: 900000, // 15 minutes
        enableGarbageCollection: true
    },

    // Logging settings
    logging: {
        logLevel: 'info', // error, warn, info, debug
        logCommands: true,
        logPermissions: true,
        logFormSubmissions: true,
        logErrors: true,
        logToFile: false, // Set to true to enable file logging
        logFilePath: './logs/bot.log'
    },

    // Rate limiting (to prevent abuse)
    rateLimit: {
        enabled: true,
        maxCommands: 5, // Max commands per time window
        timeWindow: 60000, // 1 minute
        cooldownMessage: 'Please wait before using this command again.'
    },

    // Error messages
    messages: {
        noPermission: '❌ **Access Denied**\nOnly administrators can create NOTAMs.',
        sessionExpired: '❌ Form session expired. Please start over with `/notam create`.',
        invalidInput: '❌ Invalid input provided. Please check your data and try again.',
        formError: '❌ There was an error processing your form. Please try again.',
        botError: '❌ An unexpected error occurred. Please contact an administrator.',
        rateLimited: '⏰ You are using commands too quickly. Please wait a moment.',
        maintenanceMode: '🔧 The bot is currently under maintenance. Please try again later.'
    },

    // Feature flags
    features: {
        enableFormValidation: true,
        enablePreview: true,
        enableEdit: true,
        enableCancel: true,
        enableHelp: true,
        enableStatistics: false, // Disabled for Pi Zero to save resources
        enableAdvancedLogging: false, // Disabled for Pi Zero
        enableMetrics: false // Disabled for Pi Zero
    },

    // Environment-specific settings
    environment: {
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        enableDebugMode: process.env.DEBUG === 'true',
        enableVerboseLogging: process.env.VERBOSE === 'true'
    }
};

/**
 * Get configuration value with fallback
 * @param {string} path - Dot-separated path to config value
 * @param {*} fallback - Fallback value if not found
 * @returns {*} - Configuration value or fallback
 */
function getConfig(path, fallback = null) {
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return fallback;
        }
    }
    
    return current;
}

/**
 * Validate required configuration
 * @returns {Object} - Validation result
 */
function validateConfig() {
    const errors = [];
    
    // Check required environment variables
    if (!process.env.DISCORD_BOT_TOKEN) {
        errors.push('DISCORD_BOT_TOKEN environment variable is required');
    }
    
    // Validate numeric values
    const numericConfigs = [
        'bot.maxFormSessions',
        'bot.sessionTimeout',
        'performance.cacheTimeout',
        'performance.maxConcurrentForms',
        'rateLimit.maxCommands',
        'rateLimit.timeWindow'
    ];
    
    for (const configPath of numericConfigs) {
        const value = getConfig(configPath);
        if (typeof value !== 'number' || value <= 0) {
            errors.push(`Configuration ${configPath} must be a positive number`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Get environment-specific configuration
 * @returns {Object} - Environment configuration
 */
function getEnvironmentConfig() {
    const env = {
        nodeEnv: process.env.NODE_ENV || 'development',
        debug: process.env.DEBUG === 'true',
        verbose: process.env.VERBOSE === 'true',
        port: parseInt(process.env.PORT) || 8000,
        host: process.env.HOST || '0.0.0.0'
    };
    
    return env;
}

module.exports = {
    config,
    getConfig,
    validateConfig,
    getEnvironmentConfig
};
