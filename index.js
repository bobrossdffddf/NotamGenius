const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Create commands collection
client.commands = new Collection();
const commandsArray = [];

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Bot ready event
client.once(Events.ClientReady, async readyClient => {
    console.log(`🤖 Discord bot is ready! Logged in as ${readyClient.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} servers`);
    
    // Register slash commands globally
    try {
        console.log('🗑️ Clearing existing commands...');
        
        const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
        
        // Clear existing commands
        await rest.put(
            Routes.applicationCommands(readyClient.user.id),
            { body: [] }
        );
        
        console.log('🔄 Registering new slash commands...');
        
        // Register new commands
        const data = await rest.put(
            Routes.applicationCommands(readyClient.user.id),
            { body: commandsArray }
        );
        
        console.log(`✅ Successfully registered ${data.length} slash command(s)!`);
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Error executing ${interaction.commandName}:`, error);
            
            const errorMessage = {
                content: '❌ There was an error while executing this command!',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
    
    // Handle button interactions for form continuation
    else if (interaction.isButton()) {
        const command = interaction.client.commands.get('notam');
        if (command && command.handleButton) {
            try {
                await command.handleButton(interaction);
            } catch (error) {
                console.error('❌ Error handling button interaction:', error);
                await interaction.reply({ 
                    content: '❌ There was an error processing your request!', 
                    ephemeral: true 
                });
            }
        }
    }
    
    // Handle modal submissions for form data
    else if (interaction.isModalSubmit()) {
        const command = interaction.client.commands.get('notam');
        if (command && command.handleModal) {
            try {
                await command.handleModal(interaction);
            } catch (error) {
                console.error('❌ Error handling modal submission:', error);
                await interaction.reply({ 
                    content: '❌ There was an error processing your form submission!', 
                    ephemeral: true 
                });
            }
        }
    }
});

// Error handling
client.on(Events.Error, error => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// Login to Discord
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN is not set in environment variables!');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
});
