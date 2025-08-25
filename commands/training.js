const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { checkPermissions } = require('../utils/permissions');
const TrainingDatabase = require('../utils/training-database');
const { getAllCertifications, getCertificationInfo, CERT_LEVELS, SESSION_TYPES, hasTrainerRole } = require('../utils/training-config');

// Initialize database
let trainingDB;
try {
    trainingDB = new TrainingDatabase();
} catch (error) {
    console.error('❌ Failed to initialize training database:', error);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('training')
        .setDescription('Comprehensive training and certification management system')
        .addSubcommandGroup(group =>
            group.setName('cert')
                .setDescription('Certification management')
                .addSubcommand(subcommand =>
                    subcommand.setName('view')
                        .setDescription('View certifications for a user')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to view certifications for (defaults to yourself)')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand.setName('award')
                        .setDescription('Award a certification to a user (instructors only)')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to award certification to')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('certification')
                                .setDescription('Type of certification to award')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'F-22 Raptor', value: 'F-22' },
                                    { name: 'F-16 Fighting Falcon', value: 'F-16' },
                                    { name: 'F-35 Lightning II', value: 'F-35' },
                                    { name: 'A-10 Thunderbolt II', value: 'A-10' },
                                    { name: 'KC-135 Stratotanker', value: 'KC-135' },
                                    { name: 'C-130 Hercules', value: 'C-130' },
                                    { name: 'Flight Lead', value: 'flight-lead' },
                                    { name: 'Mission Commander', value: 'mission-commander' },
                                    { name: 'Air Traffic Controller', value: 'atc' },
                                    { name: 'Ground Crew', value: 'ground-crew' },
                                    { name: 'Formation Flying', value: 'formation-flying' },
                                    { name: 'Basic Instructor', value: 'basic-instructor' },
                                    { name: 'Senior Instructor', value: 'senior-instructor' }
                                ))
                        .addStringOption(option =>
                            option.setName('level')
                                .setDescription('Certification level')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Trainee', value: 'trainee' },
                                    { name: 'Certified', value: 'certified' }
                                ))
                        .addStringOption(option =>
                            option.setName('notes')
                                .setDescription('Additional notes')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand.setName('list')
                        .setDescription('List all available certifications'))
                .addSubcommand(subcommand =>
                    subcommand.setName('progress')
                        .setDescription('Show certification progress for a user')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to view progress for (defaults to yourself)')
                                .setRequired(false))))
        .addSubcommandGroup(group =>
            group.setName('schedule')
                .setDescription('Training session scheduling')
                .addSubcommand(subcommand =>
                    subcommand.setName('session')
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
                    subcommand.setName('upcoming')
                        .setDescription('View upcoming training sessions')))
        .addSubcommandGroup(group =>
            group.setName('hours')
                .setDescription('Training hours management')
                .addSubcommand(subcommand =>
                    subcommand.setName('log')
                        .setDescription('Log training hours for a student (instructors only)')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to log hours for')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Type of training')
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
                        .addNumberOption(option =>
                            option.setName('hours')
                                .setDescription('Number of hours to log')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('notes')
                                .setDescription('Session notes')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand.setName('view')
                        .setDescription('View training hours')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to view hours for (defaults to yourself)')
                                .setRequired(false))))
        .addSubcommandGroup(group =>
            group.setName('notes')
                .setDescription('Trainer notes management')
                .addSubcommand(subcommand =>
                    subcommand.setName('add')
                        .setDescription('Add a trainer note (instructors only)')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to add note for')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('note')
                                .setDescription('Training note')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('session_type')
                                .setDescription('Related session type')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand.setName('view')
                        .setDescription('View trainer notes')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to view notes for')
                                .setRequired(true))))
        .addSubcommandGroup(group =>
            group.setName('dashboard')
                .setDescription('Training dashboard and analytics')
                .addSubcommand(subcommand =>
                    subcommand.setName('leaderboard')
                        .setDescription('Training leaderboards'))
                .addSubcommand(subcommand =>
                    subcommand.setName('personal')
                        .setDescription('Personal training dashboard')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to view dashboard for (defaults to yourself)')
                                .setRequired(false)))),

    async execute(interaction) {
        if (!trainingDB) {
            await interaction.reply({ 
                content: '❌ Training system is currently unavailable. Please try again later.', 
                ephemeral: true 
            });
            return;
        }

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommandGroup) {
                case 'cert':
                    await this.handleCertificationCommands(interaction, subcommand);
                    break;
                case 'schedule':
                    await this.handleScheduleCommands(interaction, subcommand);
                    break;
                case 'hours':
                    await this.handleHoursCommands(interaction, subcommand);
                    break;
                case 'notes':
                    await this.handleNotesCommands(interaction, subcommand);
                    break;
                case 'dashboard':
                    await this.handleDashboardCommands(interaction, subcommand);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Unknown command group.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('❌ Error in training command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ An error occurred while processing your request.', 
                    ephemeral: true 
                });
            }
        }
    },

    async handleCertificationCommands(interaction, subcommand) {
        switch (subcommand) {
            case 'view':
                await this.viewCertifications(interaction);
                break;
            case 'award':
                await this.awardCertification(interaction);
                break;
            case 'list':
                await this.listCertifications(interaction);
                break;
            case 'progress':
                await this.viewProgress(interaction);
                break;
        }
    },

    async viewCertifications(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const certifications = trainingDB.getUserCertifications(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`🎖️ Certifications - ${targetUser.displayName}`)
            .setColor(0x0099FF)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        if (certifications.length === 0) {
            embed.setDescription('No certifications found. Start your training journey today!');
        } else {
            const certsByCategory = {};
            certifications.forEach(cert => {
                if (!certsByCategory[cert.cert_category]) {
                    certsByCategory[cert.cert_category] = [];
                }
                certsByCategory[cert.cert_category].push(cert);
            });

            Object.keys(certsByCategory).forEach(category => {
                const certs = certsByCategory[category];
                const certList = certs.map(cert => 
                    `${CERT_LEVELS[cert.cert_level]?.name || cert.cert_level} - ${cert.cert_type} (${cert.date_earned})`
                ).join('\n');
                
                embed.addFields({
                    name: `${category.charAt(0).toUpperCase() + category.slice(1)} Certifications`,
                    value: certList,
                    inline: false
                });
            });

            const totalHours = trainingDB.getTotalUserHours(targetUser.id);
            embed.addFields({
                name: '📊 Training Statistics',
                value: `Total Training Hours: ${totalHours} hrs\nTotal Certifications: ${certifications.length}`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    async awardCertification(interaction) {
        // Check if user has trainer role
        if (!hasTrainerRole(interaction.member) && !checkPermissions(interaction.member, interaction.guild)) {
            await interaction.reply({ 
                content: '❌ Only trainers or administrators can award certifications.', 
                ephemeral: true 
            });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const certType = interaction.options.getString('certification');
        const certLevel = interaction.options.getString('level');
        const notes = interaction.options.getString('notes') || '';

        // Check if user already has this certification
        if (trainingDB.hasCertification(targetUser.id, certType)) {
            await interaction.reply({ 
                content: `❌ ${targetUser.displayName} already has the ${certType} certification.`, 
                ephemeral: true 
            });
            return;
        }

        const certInfo = getCertificationInfo(certType);
        if (!certInfo) {
            await interaction.reply({ 
                content: '❌ Invalid certification type.', 
                ephemeral: true 
            });
            return;
        }

        try {
            trainingDB.addCertification(
                targetUser.id,
                targetUser.displayName,
                certType,
                certInfo.category,
                certLevel,
                interaction.user.id,
                interaction.user.displayName,
                notes
            );

            const embed = new EmbedBuilder()
                .setTitle('🎖️ Certification Awarded!')
                .setColor(CERT_LEVELS[certLevel]?.color || 0x00FF00)
                .addFields(
                    { name: 'Recipient', value: targetUser.displayName, inline: true },
                    { name: 'Certification', value: certInfo.name, inline: true },
                    { name: 'Level', value: CERT_LEVELS[certLevel]?.name || certLevel, inline: true },
                    { name: 'Awarded By', value: interaction.user.displayName, inline: true },
                    { name: 'Date', value: new Date().toLocaleDateString(), inline: true }
                )
                .setTimestamp();

            if (notes) {
                embed.addFields({ name: 'Notes', value: notes, inline: false });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error awarding certification:', error);
            await interaction.reply({ 
                content: '❌ Failed to award certification. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async listCertifications(interaction) {
        const allCerts = getAllCertifications();
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Available Certifications')
            .setColor(0x0099FF)
            .setDescription('Complete list of all available training certifications')
            .setTimestamp();

        const categories = {};
        Object.entries(allCerts).forEach(([certType, certInfo]) => {
            if (!categories[certInfo.category]) {
                categories[certInfo.category] = [];
            }
            categories[certInfo.category].push(`**${certInfo.name}** (${certType})\n└ ${certInfo.description}\n└ Min Hours: ${certInfo.minFlightHours || 0}`);
        });

        Object.keys(categories).forEach(category => {
            embed.addFields({
                name: `${category.charAt(0).toUpperCase() + category.slice(1)} Certifications`,
                value: categories[category].join('\n\n'),
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    },

    async viewProgress(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const certifications = trainingDB.getUserCertifications(targetUser.id);
        const hoursBreakdown = trainingDB.getUserTrainingHours(targetUser.id);
        const totalHours = trainingDB.getTotalUserHours(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`📈 Training Progress - ${targetUser.displayName}`)
            .setColor(0x0099FF)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        // Hours breakdown
        if (hoursBreakdown.length > 0) {
            const hoursText = hoursBreakdown.map(h => 
                `${h.session_type}: ${h.total_hours} hrs (${h.sessions} sessions)`
            ).join('\n');
            
            embed.addFields({
                name: '⏱️ Training Hours Breakdown',
                value: hoursText,
                inline: false
            });
        }

        // Certification summary
        const certsByLevel = {};
        certifications.forEach(cert => {
            if (!certsByLevel[cert.cert_level]) {
                certsByLevel[cert.cert_level] = 0;
            }
            certsByLevel[cert.cert_level]++;
        });

        const progressText = Object.entries(certsByLevel)
            .map(([level, count]) => `${CERT_LEVELS[level]?.name || level}: ${count}`)
            .join('\n');

        embed.addFields(
            { name: '🎖️ Certification Summary', value: progressText || 'No certifications yet', inline: true },
            { name: '📊 Total Stats', value: `Total Hours: ${totalHours}\nTotal Certs: ${certifications.length}`, inline: true }
        );

        await interaction.reply({ embeds: [embed] });
    },


    async handleScheduleCommands(interaction, subcommand) {
        // This will be handled by the scheduling system
        await interaction.reply({ 
            content: '🚧 Scheduling system coming soon! Use `/training-schedule` commands for now.', 
            ephemeral: true 
        });
    },

    async handleHoursCommands(interaction, subcommand) {
        switch (subcommand) {
            case 'log':
                await this.logTrainingHours(interaction);
                break;
            case 'view':
                await this.viewTrainingHours(interaction);
                break;
        }
    },

    async logTrainingHours(interaction) {
        // Check if user has trainer role
        if (!hasTrainerRole(interaction.member) && !checkPermissions(interaction.member, interaction.guild)) {
            await interaction.reply({ 
                content: '❌ Only trainers or administrators can log training hours.', 
                ephemeral: true 
            });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const sessionType = interaction.options.getString('type');
        const hours = interaction.options.getNumber('hours');
        const notes = interaction.options.getString('notes') || '';

        try {
            trainingDB.logTrainingHours(
                targetUser.id,
                targetUser.displayName,
                sessionType,
                hours,
                interaction.user.id,
                interaction.user.displayName,
                notes
            );

            const embed = new EmbedBuilder()
                .setTitle('⏱️ Training Hours Logged')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Student', value: targetUser.displayName, inline: true },
                    { name: 'Session Type', value: SESSION_TYPES[sessionType]?.name || sessionType, inline: true },
                    { name: 'Hours', value: hours.toString(), inline: true },
                    { name: 'Instructor', value: interaction.user.displayName, inline: true },
                    { name: 'Date', value: new Date().toLocaleDateString(), inline: true }
                )
                .setTimestamp();

            if (notes) {
                embed.addFields({ name: 'Notes', value: notes, inline: false });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging training hours:', error);
            await interaction.reply({ 
                content: '❌ Failed to log training hours. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async viewTrainingHours(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const hoursBreakdown = trainingDB.getUserTrainingHours(targetUser.id);
        const totalHours = trainingDB.getTotalUserHours(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`⏱️ Training Hours - ${targetUser.displayName}`)
            .setColor(0x0099FF)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        if (hoursBreakdown.length === 0) {
            embed.setDescription('No training hours logged yet.');
        } else {
            const hoursText = hoursBreakdown.map(h => 
                `**${SESSION_TYPES[h.session_type]?.name || h.session_type}**\n└ ${h.total_hours} hours\n└ ${h.sessions} sessions`
            ).join('\n\n');
            
            embed.addFields({
                name: '📊 Hours Breakdown',
                value: hoursText,
                inline: false
            });

            embed.addFields({
                name: '🎯 Total Summary',
                value: `**${totalHours} Total Hours**\nAcross ${hoursBreakdown.length} different training types`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleNotesCommands(interaction, subcommand) {
        switch (subcommand) {
            case 'add':
                await this.addTrainerNote(interaction);
                break;
            case 'view':
                await this.viewTrainerNotes(interaction);
                break;
        }
    },

    async addTrainerNote(interaction) {
        // Check if user has trainer role
        if (!hasTrainerRole(interaction.member) && !checkPermissions(interaction.member, interaction.guild)) {
            await interaction.reply({ 
                content: '❌ Only trainers or administrators can add trainer notes.', 
                ephemeral: true 
            });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const note = interaction.options.getString('note');
        const sessionType = interaction.options.getString('session_type');

        try {
            trainingDB.addTrainerNote(
                targetUser.id,
                targetUser.displayName,
                interaction.user.id,
                interaction.user.displayName,
                note,
                sessionType
            );

            const embed = new EmbedBuilder()
                .setTitle('📝 Training Note Added')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Student', value: targetUser.displayName, inline: true },
                    { name: 'Instructor', value: interaction.user.displayName, inline: true },
                    { name: 'Date', value: new Date().toLocaleDateString(), inline: true },
                    { name: 'Note', value: note, inline: false }
                )
                .setTimestamp();

            if (sessionType) {
                embed.addFields({ name: 'Session Type', value: SESSION_TYPES[sessionType]?.name || sessionType, inline: true });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error adding trainer note:', error);
            await interaction.reply({ 
                content: '❌ Failed to add trainer note. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async viewTrainerNotes(interaction) {
        const targetUser = interaction.options.getUser('user');
        
        // Check permissions - trainers can view notes for their students, users can't view others' notes
        const isTrainer = hasTrainerRole(interaction.member);
        const isAdmin = checkPermissions(interaction.member, interaction.guild);
        
        if (targetUser.id !== interaction.user.id && !isTrainer && !isAdmin) {
            await interaction.reply({ 
                content: '❌ You can only view your own training notes.', 
                ephemeral: true 
            });
            return;
        }

        const notes = trainingDB.getTrainerNotes(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`📝 Training Notes - ${targetUser.displayName}`)
            .setColor(0x0099FF)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        if (notes.length === 0) {
            embed.setDescription('No training notes found.');
        } else {
            const notesList = notes.slice(0, 10).map(note => 
                `**${note.date}** - ${note.trainer_name}\n${note.note}${note.session_type ? `\n*Session: ${note.session_type}*` : ''}`
            ).join('\n\n');
            
            embed.addFields({
                name: `📋 Recent Notes (${notes.length} total)`,
                value: notesList,
                inline: false
            });

            if (notes.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${notes.length} notes` });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleDashboardCommands(interaction, subcommand) {
        switch (subcommand) {
            case 'leaderboard':
                await this.showLeaderboard(interaction);
                break;
            case 'personal':
                await this.showPersonalDashboard(interaction);
                break;
        }
    },

    async showLeaderboard(interaction) {
        const topPerformers = trainingDB.getTopPerformers(10);

        const embed = new EmbedBuilder()
            .setTitle('🏆 Training Leaderboard')
            .setColor(0xFFD700)
            .setTimestamp();

        if (topPerformers.length === 0) {
            embed.setDescription('No training data available yet.');
        } else {
            const leaderboardText = topPerformers.map((performer, index) => {
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                return `${medal} **${performer.username}**\n└ Certs: ${performer.cert_count || 0} | Hours: ${performer.total_hours || 0} | Avg Score: ${Math.round(performer.avg_exam_score || 0)}%`;
            }).join('\n\n');
            
            embed.addFields({
                name: '🎯 Top Performers',
                value: leaderboardText,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    async showPersonalDashboard(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const certifications = trainingDB.getUserCertifications(targetUser.id);
        const hoursBreakdown = trainingDB.getUserTrainingHours(targetUser.id);
        const totalHours = trainingDB.getTotalUserHours(targetUser.id);
        const examResults = trainingDB.getUserExamResults(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Personal Training Dashboard - ${targetUser.displayName}`)
            .setColor(0x0099FF)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        // Quick stats
        const avgScore = examResults.length > 0 ? 
            Math.round(examResults.reduce((sum, exam) => sum + (exam.score / exam.total_questions * 100), 0) / examResults.length) : 0;
        
        embed.addFields({
            name: '📈 Quick Stats',
            value: `Total Hours: ${totalHours}\nCertifications: ${certifications.length}\nExams Taken: ${examResults.length}\nAvg Score: ${avgScore}%`,
            inline: true
        });

        // Recent activity (last 5 certifications)
        if (certifications.length > 0) {
            const recentCerts = certifications.slice(0, 5).map(cert => 
                `${cert.cert_type} (${cert.date_earned})`
            ).join('\n');
            
            embed.addFields({
                name: '🎖️ Recent Certifications',
                value: recentCerts,
                inline: true
            });
        }

        // Goals and recommendations
        const goalText = this.generateGoals(certifications, totalHours);
        if (goalText) {
            embed.addFields({
                name: '🎯 Recommended Next Steps',
                value: goalText,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    generateGoals(certifications, totalHours) {
        const goals = [];
        
        if (certifications.length === 0) {
            goals.push('• Take your first exam to start earning certifications');
            goals.push('• Log some training hours to track your progress');
        } else {
            const hasBasicInstructor = certifications.some(cert => cert.cert_type === 'basic-instructor');
            const hasSeniorInstructor = certifications.some(cert => cert.cert_type === 'senior-instructor');
            
            if (totalHours >= 75 && !hasBasicInstructor) {
                goals.push('• Consider pursuing Basic Instructor certification');
            }
            
            if (totalHours >= 150 && hasBasicInstructor && !hasSeniorInstructor) {
                goals.push('• Qualify for Senior Instructor certification');
            }
            
            if (totalHours < 50) {
                goals.push('• Continue building flight hours for leadership roles');
            }
        }
        
        return goals.length > 0 ? goals.join('\n') : null;
    }
};