const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
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

// Load operations from disk on startup
async function loadOperationsOnStartup() {
    const operationCommand = client.commands.get('operation');
    if (operationCommand && operationCommand.loadOperations) {
        await operationCommand.loadOperations();
    }
}

// Bot ready event
client.once(Events.ClientReady, async readyClient => {
    console.log(`🤖 Discord bot is ready! Logged in as ${readyClient.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} servers`);
    
    // Make client globally accessible for roster updater
    global.client = readyClient;
    
    // Start roster auto-updater
    const RosterUpdater = require('./utils/roster-updater');
    new RosterUpdater(readyClient);
    
    // Load operations from disk
    await loadOperationsOnStartup();
    
    // Register slash commands to each guild (instant registration)
    try {
        console.log('🔄 Registering slash commands to guilds...');
        
        const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
        
        let totalRegistered = 0;
        
        // Register commands to each guild for instant availability
        for (const guild of readyClient.guilds.cache.values()) {
            try {
                console.log(`📝 Registering commands for guild: ${guild.name} (${guild.id})`);
                
                const data = await rest.put(
                    Routes.applicationGuildCommands(readyClient.user.id, guild.id),
                    { body: commandsArray }
                );
                
                console.log(`✅ Registered ${data.length} commands for ${guild.name}`);
                totalRegistered += data.length;
            } catch (guildError) {
                console.error(`❌ Failed to register commands for guild ${guild.name}:`, guildError);
            }
        }
        
        console.log(`🎉 Successfully registered ${totalRegistered} total command instances across all guilds!`);
        console.log('💡 Commands should appear instantly in Discord servers');
        
        // Show operation configuration
        console.log('\n📋 Operation Configuration:');
        console.log(`🎯 Operations will notify role: <@&1409027687736938537>`);
        console.log(`📢 Operations will be posted to channel: <#1403915496256176148>`);
        console.log('⚡ Ready to manage military operations!');
        
    } catch (error) {
        console.error('❌ Error during command registration:', error);
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
            
            // Only try to reply if the interaction hasn't been handled yet
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ There was an error while executing this command!',
                        flags: 64
                    });
                } catch (replyError) {
                    console.error('❌ Failed to send error response:', replyError);
                }
            }
        }
    }
    
    // Handle button interactions for form continuation
    else if (interaction.isButton()) {
        // Handle NOTAM button interactions
        if (interaction.customId.startsWith('notam_')) {
            const command = interaction.client.commands.get('notam');
            if (command && command.handleButton) {
                try {
                    await command.handleButton(interaction);
                } catch (error) {
                    console.error('❌ Error handling NOTAM button interaction:', error);
                    await interaction.reply({ 
                        content: '❌ There was an error processing your request!', 
                        flags: 64 
                    });
                }
            }
        }
        // Handle operation response button interactions
        else if (interaction.customId.startsWith('op_response_')) {
            const command = interaction.client.commands.get('operation');
            if (command && command.handleButton) {
                try {
                    await command.handleButton(interaction);
                } catch (error) {
                    console.error('❌ Error handling operation button interaction:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: '❌ There was an error processing your operation response!', 
                            flags: 64 
                        });
                    }
                }
            }
        }
        // Handle operation edit button interactions  
        else if (interaction.customId.startsWith('edit_') || interaction.customId.startsWith('manage_assignments_')) {
            const command = interaction.client.commands.get('operation');
            if (command && command.handleEditButton) {
                try {
                    await command.handleEditButton(interaction);
                } catch (error) {
                    console.error('❌ Error handling operation edit button:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: '❌ There was an error processing your edit request!', 
                            flags: 64 
                        });
                    }
                }
            }
        }
        // Handle assignment management buttons
        else if (interaction.customId.startsWith('remove_assignment_') || interaction.customId.startsWith('refresh_assignments_')) {
            const command = interaction.client.commands.get('operation');
            if (command && command.handleAssignmentButtons) {
                try {
                    await command.handleAssignmentButtons(interaction);
                } catch (error) {
                    console.error('❌ Error handling assignment button:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: '❌ There was an error processing your assignment request!', 
                            flags: 64 
                        });
                    }
                }
            }
        }
        // Handle operation confirmation buttons (Send to All, Cancel)
        else if (interaction.customId.startsWith('confirm_send_') || interaction.customId.startsWith('cancel_send_')) {
            const command = interaction.client.commands.get('operation');
            if (command && command.handleConfirmationButton) {
                try {
                    await command.handleConfirmationButton(interaction);
                } catch (error) {
                    console.error('❌ Error handling operation confirmation button:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: '❌ There was an error processing your request!', 
                            flags: 64 
                        });
                    }
                }
            }
        }
    }
    
    // Handle dropdown selections
    else if (interaction.isStringSelectMenu()) {
        try {
            // Handle job selection dropdowns
            if (interaction.customId.startsWith('job_select_')) {
                const operationId = interaction.customId.split('_').slice(2).join('_');
                const command = interaction.client.commands.get('operation');
                if (command && command.handleJobSelection) {
                    await command.handleJobSelection(interaction, operationId);
                }
            }
            // Handle assignment removal dropdowns
            else if (interaction.customId.startsWith('select_remove_')) {
                const command = interaction.client.commands.get('operation');
                if (command && command.handleRemoveAssignment) {
                    await command.handleRemoveAssignment(interaction);
                }
            }
            // Handle operation stop selection
            else if (interaction.customId === 'select_operation_stop') {
                const command = interaction.client.commands.get('operation-stop');
                if (command && command.handleOperationStopSelection) {
                    await command.handleOperationStopSelection(interaction);
                }
            }
        } catch (error) {
            console.error('❌ Error handling dropdown selection:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ There was an error processing your selection!',
                        flags: 64
                    });
                } catch (replyError) {
                    console.error('❌ Failed to send dropdown error response:', replyError);
                }
            }
        }
    }
    
    // Handle modal submissions for form data
    else if (interaction.isModalSubmit()) {
        try {
            // Handle NOTAM modals
            if (interaction.customId === 'notam_single_form') {
                const command = interaction.client.commands.get('notam');
                if (command && command.handleModal) {
                    await command.handleModal(interaction);
                }
            }
            // Handle operation modals
            else if (interaction.customId === 'operation_start_form' || interaction.customId.startsWith('operation_schedule_form_')) {
                const command = interaction.client.commands.get('operation');
                if (command && command.handleModal) {
                    await command.handleModal(interaction);
                }
            }
            // Handle operation edit modals
            else if (interaction.customId.startsWith('edit_form_') || interaction.customId.startsWith('edit_details_form_') || interaction.customId.startsWith('edit_positions_form_')) {
                const command = interaction.client.commands.get('operation');
                if (command && command.handleEditModal) {
                    await command.handleEditModal(interaction);
                }
            }
        } catch (error) {
            console.error('❌ Error handling modal submission:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ 
                        content: '❌ There was an error processing your form submission!', 
                        flags: 64 
                    });
                } catch (replyError) {
                    console.error('❌ Failed to send modal error response:', replyError);
                }
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
