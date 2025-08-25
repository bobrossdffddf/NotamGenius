const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { checkPermissions } = require('../utils/permissions');
const TrainingDatabase = require('../utils/training-database');
const { SESSION_TYPES, hasTrainerRole } = require('../utils/training-config');

// Initialize database
let trainingDB;
try {
    trainingDB = new TrainingDatabase();
} catch (error) {
    console.error('❌ Failed to initialize training database:', error);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('training-schedule')
        .setDescription('Training session scheduling system')
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('Schedule a new training session (instructors only)')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of training session')
                        .setRequired(true)
                        .addChoices(
                            { name: 'F-22 Raptor Training', value: 'F-22' },
                            { name: 'F-35 Lightning II Training', value: 'F-35' },
                            { name: 'F-16 Fighting Falcon Training', value: 'F-16' },
                            { name: 'Air Traffic Control Training', value: 'ATC' },
                            { name: 'Air Force One Training', value: 'AF1' },
                            { name: 'Marine One Training', value: 'Marine-1' },
                            { name: 'Ground Operations Training', value: 'Ground-Operations' }
                        ))
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Date for the session (YYYY-MM-DD)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Time for the session (HH:MM)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('max_students')
                        .setDescription('Maximum number of students')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('notes')
                        .setDescription('Additional notes')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('join')
                .setDescription('Join a training session')
                .addIntegerOption(option =>
                    option.setName('session_id')
                        .setDescription('ID of the session to join')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('leave')
                .setDescription('Leave a training session')
                .addIntegerOption(option =>
                    option.setName('session_id')
                        .setDescription('ID of the session to leave')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('View upcoming training sessions')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Filter by session type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'F-22 Raptor Training', value: 'F-22' },
                            { name: 'F-35 Lightning II Training', value: 'F-35' },
                            { name: 'F-16 Fighting Falcon Training', value: 'F-16' },
                            { name: 'Air Traffic Control Training', value: 'ATC' },
                            { name: 'Air Force One Training', value: 'AF1' },
                            { name: 'Marine One Training', value: 'Marine-1' },
                            { name: 'Ground Operations Training', value: 'Ground-Operations' }
                        )))
        .addSubcommand(subcommand =>
            subcommand.setName('cancel')
                .setDescription('Cancel a training session (instructors only)')
                .addIntegerOption(option =>
                    option.setName('session_id')
                        .setDescription('ID of the session to cancel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('Get detailed information about a training session')
                .addIntegerOption(option =>
                    option.setName('session_id')
                        .setDescription('ID of the session')
                        .setRequired(true))),

    async execute(interaction) {
        if (!trainingDB) {
            await interaction.reply({ 
                content: '❌ Training system is currently unavailable. Please try again later.', 
                ephemeral: true 
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await this.createSession(interaction);
                    break;
                case 'join':
                    await this.joinSession(interaction);
                    break;
                case 'leave':
                    await this.leaveSession(interaction);
                    break;
                case 'list':
                    await this.listSessions(interaction);
                    break;
                case 'cancel':
                    await this.cancelSession(interaction);
                    break;
                case 'info':
                    await this.sessionInfo(interaction);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Unknown schedule command.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('❌ Error in schedule command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ An error occurred while processing your scheduling request.', 
                    ephemeral: true 
                });
            }
        }
    },

    async createSession(interaction) {
        // Check if user has trainer role
        if (!hasTrainerRole(interaction.member) && !checkPermissions(interaction.member, interaction.guild)) {
            await interaction.reply({ 
                content: '❌ Only trainers or administrators can create training sessions.', 
                ephemeral: true 
            });
            return;
        }

        const sessionType = interaction.options.getString('type');
        const date = interaction.options.getString('date');
        const time = interaction.options.getString('time');
        const maxStudents = interaction.options.getInteger('max_students') || SESSION_TYPES[sessionType]?.maxStudents || 4;
        const notes = interaction.options.getString('notes') || '';

        // Validate date format
        if (!this.isValidDate(date)) {
            await interaction.reply({ 
                content: '❌ Invalid date format. Please use YYYY-MM-DD format.', 
                ephemeral: true 
            });
            return;
        }

        // Validate time format
        if (!this.isValidTime(time)) {
            await interaction.reply({ 
                content: '❌ Invalid time format. Please use HH:MM format (24-hour).', 
                ephemeral: true 
            });
            return;
        }

        // Check if date is in the future
        const sessionDate = new Date(`${date}T${time}`);
        if (sessionDate <= new Date()) {
            await interaction.reply({ 
                content: '❌ Session date must be in the future.', 
                ephemeral: true 
            });
            return;
        }

        try {
            const result = trainingDB.createTrainingSession(
                sessionType,
                date,
                time,
                interaction.user.id,
                interaction.user.displayName,
                maxStudents,
                notes
            );

            const sessionInfo = SESSION_TYPES[sessionType];
            
            const embed = new EmbedBuilder()
                .setTitle('📅 Training Session Created')
                .setColor(0x00FF00)
                .addFields(
                    { name: '📚 Session Type', value: sessionInfo?.name || sessionType, inline: true },
                    { name: '📅 Date', value: date, inline: true },
                    { name: '⏰ Time', value: time, inline: true },
                    { name: '👨‍🏫 Instructor', value: interaction.user.displayName, inline: true },
                    { name: '👥 Max Students', value: maxStudents.toString(), inline: true },
                    { name: '🆔 Session ID', value: result.lastInsertRowid.toString(), inline: true }
                )
                .setDescription(sessionInfo?.description || 'Training session')
                .setTimestamp();

            if (notes) {
                embed.addFields({ name: '📝 Notes', value: notes, inline: false });
            }

            embed.addFields({
                name: '🎯 How to Join',
                value: `Use \`/training-schedule join session_id:${result.lastInsertRowid}\` to register for this session.`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating training session:', error);
            await interaction.reply({ 
                content: '❌ Failed to create training session. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async joinSession(interaction) {
        const sessionId = interaction.options.getInteger('session_id');
        
        try {
            const result = trainingDB.joinTrainingSession(sessionId, interaction.user.id, interaction.user.displayName);
            
            if (!result.success) {
                await interaction.reply({ 
                    content: `❌ ${result.error}`, 
                    ephemeral: true 
                });
                return;
            }

            const session = trainingDB.getTrainingSession(sessionId);
            const sessionInfo = SESSION_TYPES[session.session_type];

            const embed = new EmbedBuilder()
                .setTitle('✅ Successfully Registered!')
                .setColor(0x00FF00)
                .addFields(
                    { name: '📚 Session Type', value: sessionInfo?.name || session.session_type, inline: true },
                    { name: '📅 Date', value: session.date, inline: true },
                    { name: '⏰ Time', value: session.time, inline: true },
                    { name: '👨‍🏫 Instructor', value: session.instructor_name, inline: true },
                    { name: '👥 Capacity', value: `${session.current_students}/${session.max_students}`, inline: true },
                    { name: '🆔 Session ID', value: sessionId.toString(), inline: true }
                )
                .setDescription(`You are now registered for this ${sessionInfo?.name || session.session_type} session.`)
                .setTimestamp();

            if (session.notes) {
                embed.addFields({ name: '📝 Session Notes', value: session.notes, inline: false });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error joining training session:', error);
            await interaction.reply({ 
                content: '❌ Failed to join training session. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async leaveSession(interaction) {
        const sessionId = interaction.options.getInteger('session_id');
        
        try {
            // Check if user is registered for this session
            const existing = trainingDB.db.prepare('SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?')
                .get(sessionId, interaction.user.id);
            
            if (!existing) {
                await interaction.reply({ 
                    content: '❌ You are not registered for this session.', 
                    ephemeral: true 
                });
                return;
            }

            // Remove participant
            trainingDB.db.prepare('DELETE FROM session_participants WHERE session_id = ? AND user_id = ?')
                .run(sessionId, interaction.user.id);

            // Update current student count
            trainingDB.db.prepare('UPDATE training_sessions SET current_students = current_students - 1 WHERE id = ?')
                .run(sessionId);

            const session = trainingDB.getTrainingSession(sessionId);
            const sessionInfo = SESSION_TYPES[session.session_type];

            const embed = new EmbedBuilder()
                .setTitle('📤 Left Training Session')
                .setColor(0xFF9900)
                .addFields(
                    { name: '📚 Session Type', value: sessionInfo?.name || session.session_type, inline: true },
                    { name: '📅 Date', value: session.date, inline: true },
                    { name: '⏰ Time', value: session.time, inline: true }
                )
                .setDescription('You have been removed from this training session.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error leaving training session:', error);
            await interaction.reply({ 
                content: '❌ Failed to leave training session. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async listSessions(interaction) {
        const sessionType = interaction.options.getString('type');
        let sessions = trainingDB.getUpcomingSessions();

        if (sessionType) {
            sessions = sessions.filter(session => session.session_type === sessionType);
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 Upcoming Training Sessions')
            .setColor(0x0099FF)
            .setTimestamp();

        if (sessions.length === 0) {
            embed.setDescription('No upcoming training sessions found.');
        } else {
            const sessionText = sessions.slice(0, 10).map(session => {
                const sessionInfo = SESSION_TYPES[session.session_type];
                const spots = `${session.current_students}/${session.max_students}`;
                const status = session.current_students >= session.max_students ? '🔴 FULL' : '🟢 OPEN';
                
                return `**ID ${session.id}** - ${sessionInfo?.name || session.session_type}\n└ 📅 ${session.date} at ${session.time}\n└ 👨‍🏫 ${session.instructor_name}\n└ 👥 ${spots} ${status}`;
            }).join('\n\n');

            embed.addFields({
                name: `📋 Sessions (${sessions.length} total)`,
                value: sessionText,
                inline: false
            });

            embed.addFields({
                name: '🎯 How to Join',
                value: 'Use `/training-schedule join session_id:<ID>` to register for a session.',
                inline: false
            });

            if (sessions.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${sessions.length} sessions` });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },

    async cancelSession(interaction) {
        const sessionId = interaction.options.getInteger('session_id');
        
        // Check if user has trainer role or is the session creator
        const session = trainingDB.getTrainingSession(sessionId);
        
        if (!session) {
            await interaction.reply({ 
                content: '❌ Session not found.', 
                ephemeral: true 
            });
            return;
        }

        if (!hasTrainerRole(interaction.member) && session.instructor_id !== interaction.user.id && !checkPermissions(interaction.member, interaction.guild)) {
            await interaction.reply({ 
                content: '❌ Only the session instructor, other trainers, or administrators can cancel sessions.', 
                ephemeral: true 
            });
            return;
        }

        try {
            // Update session status to cancelled
            trainingDB.db.prepare('UPDATE training_sessions SET status = ? WHERE id = ?')
                .run('cancelled', sessionId);

            const sessionInfo = SESSION_TYPES[session.session_type];

            const embed = new EmbedBuilder()
                .setTitle('❌ Training Session Cancelled')
                .setColor(0xFF0000)
                .addFields(
                    { name: '📚 Session Type', value: sessionInfo?.name || session.session_type, inline: true },
                    { name: '📅 Date', value: session.date, inline: true },
                    { name: '⏰ Time', value: session.time, inline: true },
                    { name: '👨‍🏫 Instructor', value: session.instructor_name, inline: true },
                    { name: '🚫 Cancelled By', value: interaction.user.displayName, inline: true }
                )
                .setDescription('This training session has been cancelled.')
                .setTimestamp();

            // Get participant list to notify them
            const participants = trainingDB.db.prepare('SELECT username FROM session_participants WHERE session_id = ?')
                .all(sessionId);
            
            if (participants.length > 0) {
                const participantList = participants.map(p => p.username).join(', ');
                embed.addFields({
                    name: '👥 Affected Participants',
                    value: participantList,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error cancelling training session:', error);
            await interaction.reply({ 
                content: '❌ Failed to cancel training session. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async sessionInfo(interaction) {
        const sessionId = interaction.options.getInteger('session_id');
        
        try {
            const session = trainingDB.getTrainingSession(sessionId);
            
            if (!session) {
                await interaction.reply({ 
                    content: '❌ Session not found.', 
                    ephemeral: true 
                });
                return;
            }

            const sessionInfo = SESSION_TYPES[session.session_type];
            
            // Get participants
            const participants = trainingDB.db.prepare('SELECT username, joined_at FROM session_participants WHERE session_id = ? ORDER BY joined_at')
                .all(sessionId);

            const embed = new EmbedBuilder()
                .setTitle(`📚 ${sessionInfo?.name || session.session_type} Session`)
                .setColor(session.status === 'cancelled' ? 0xFF0000 : 0x0099FF)
                .addFields(
                    { name: '🆔 Session ID', value: sessionId.toString(), inline: true },
                    { name: '📅 Date', value: session.date, inline: true },
                    { name: '⏰ Time', value: session.time, inline: true },
                    { name: '👨‍🏫 Instructor', value: session.instructor_name, inline: true },
                    { name: '👥 Capacity', value: `${session.current_students}/${session.max_students}`, inline: true },
                    { name: '📊 Status', value: session.status.toUpperCase(), inline: true }
                )
                .setDescription(sessionInfo?.description || 'Training session details')
                .setTimestamp();

            if (session.notes) {
                embed.addFields({ name: '📝 Notes', value: session.notes, inline: false });
            }

            if (participants.length > 0) {
                const participantList = participants.map((p, index) => 
                    `${index + 1}. ${p.username}`
                ).join('\n');
                
                embed.addFields({
                    name: '👥 Registered Participants',
                    value: participantList,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '👥 Registered Participants',
                    value: 'No participants yet',
                    inline: false
                });
            }

            // Add action buttons if session is active
            let components = [];
            if (session.status === 'scheduled') {
                const buttons = new ActionRowBuilder();
                
                // Check if user is already registered
                const isRegistered = participants.some(p => p.username === interaction.user.displayName);
                const isFull = session.current_students >= session.max_students;
                
                if (!isRegistered && !isFull) {
                    buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`join_session_${sessionId}`)
                            .setLabel('Join Session')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅')
                    );
                }
                
                if (isRegistered) {
                    buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`leave_session_${sessionId}`)
                            .setLabel('Leave Session')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );
                }

                if (buttons.components.length > 0) {
                    components = [buttons];
                }
            }

            await interaction.reply({ embeds: [embed], components });
        } catch (error) {
            console.error('Error getting session info:', error);
            await interaction.reply({ 
                content: '❌ Failed to get session information. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async handleButton(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('join_session_')) {
            const sessionId = parseInt(customId.replace('join_session_', ''));
            await this.quickJoinSession(interaction, sessionId);
        } else if (customId.startsWith('leave_session_')) {
            const sessionId = parseInt(customId.replace('leave_session_', ''));
            await this.quickLeaveSession(interaction, sessionId);
        }
    },

    async quickJoinSession(interaction, sessionId) {
        try {
            const result = trainingDB.joinTrainingSession(sessionId, interaction.user.id, interaction.user.displayName);
            
            if (!result.success) {
                await interaction.reply({ 
                    content: `❌ ${result.error}`, 
                    ephemeral: true 
                });
                return;
            }

            await interaction.reply({ 
                content: '✅ Successfully joined the training session!', 
                ephemeral: true 
            });
            
            // Refresh the session info
            await this.sessionInfo(interaction);
        } catch (error) {
            await interaction.reply({ 
                content: '❌ Failed to join session. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async quickLeaveSession(interaction, sessionId) {
        try {
            // Remove participant
            trainingDB.db.prepare('DELETE FROM session_participants WHERE session_id = ? AND user_id = ?')
                .run(sessionId, interaction.user.id);

            // Update current student count
            trainingDB.db.prepare('UPDATE training_sessions SET current_students = current_students - 1 WHERE id = ?')
                .run(sessionId);

            await interaction.reply({ 
                content: '📤 You have left the training session.', 
                ephemeral: true 
            });
        } catch (error) {
            await interaction.reply({ 
                content: '❌ Failed to leave session. Please try again.', 
                ephemeral: true 
            });
        }
    },

    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },

    isValidTime(timeString) {
        const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(timeString);
    }
};