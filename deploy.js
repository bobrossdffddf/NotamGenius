const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'ping',
        description: 'Simple test command to check if bot is working',
    }
];

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('🔄 Deploying slash commands...');

        // Get application info
        const application = await rest.get(Routes.currentApplication());
        console.log(`📱 Application ID: ${application.id}`);
        console.log(`🤖 Bot Name: ${application.name}`);
        
        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(application.id),
            { body: commands }
        );

        console.log(`✅ Successfully deployed ${data.length} command(s)`);
        
        // Generate invite link
        const permissions = '2147483648'; // Use Applications Commands permission
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${application.id}&permissions=${permissions}&scope=bot%20applications.commands`;
        
        console.log('\n🔗 Bot Invite Link:');
        console.log(inviteLink);
        console.log('\nMake sure to invite your bot with this link to enable slash commands!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();