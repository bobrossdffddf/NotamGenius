const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const TrainingDatabase = require('../utils/training-database');
const { getExamQuestions, hasExamQuestions } = require('../utils/exam-questions');
const { getCertificationInfo } = require('../utils/training-config');

// Initialize database
let trainingDB;
try {
    trainingDB = new TrainingDatabase();
} catch (error) {
    console.error('❌ Failed to initialize training database:', error);
}

// Store active exam sessions
const activeExams = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('training-exam')
        .setDescription('Training examination system')
        .addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Begin a written examination')
                .addStringOption(option =>
                    option.setName('certification')
                        .setDescription('Certification to take exam for')
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
                            { name: 'Formation Flying', value: 'formation-flying' }
                        )))
        .addSubcommand(subcommand =>
            subcommand.setName('results')
                .setDescription('View exam results')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view results for (defaults to yourself)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('certification')
                        .setDescription('Specific certification results')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('retake')
                .setDescription('Retake a failed exam')
                .addStringOption(option =>
                    option.setName('certification')
                        .setDescription('Certification to retake exam for')
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
                            { name: 'Formation Flying', value: 'formation-flying' }
                        ))),

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
                case 'start':
                case 'retake':
                    await this.startExam(interaction);
                    break;
                case 'results':
                    await this.viewResults(interaction);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Unknown exam command.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('❌ Error in exam command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ An error occurred while processing your exam request.', 
                    ephemeral: true 
                });
            }
        }
    },

    async startExam(interaction) {
        const certType = interaction.options.getString('certification');
        const userId = interaction.user.id;

        // Check if certification has exam questions
        if (!hasExamQuestions(certType)) {
            await interaction.reply({ 
                content: '❌ No exam available for this certification yet.', 
                ephemeral: true 
            });
            return;
        }

        // Check if user already has an active exam
        if (activeExams.has(userId)) {
            await interaction.reply({ 
                content: '❌ You already have an active exam. Please complete or cancel it first.', 
                ephemeral: true 
            });
            return;
        }

        // Check if user already passed this exam
        if (trainingDB.hasPassedExam(userId, certType)) {
            await interaction.reply({ 
                content: `✅ You have already passed the ${certType} exam. No need to retake it.`, 
                ephemeral: true 
            });
            return;
        }

        const certInfo = getCertificationInfo(certType);
        const questions = getExamQuestions(certType, 10);

        if (questions.length === 0) {
            await interaction.reply({ 
                content: '❌ No questions available for this certification.', 
                ephemeral: true 
            });
            return;
        }

        // Create exam session
        const examSession = {
            userId,
            certType,
            questions,
            currentQuestion: 0,
            answers: [],
            startTime: Date.now(),
            sessionId: `${userId}_${certType}_${Date.now()}`
        };

        activeExams.set(userId, examSession);

        const embed = new EmbedBuilder()
            .setTitle(`📝 ${certInfo?.name || certType} Examination`)
            .setColor(0x0099FF)
            .setDescription(`You are about to begin the written exam for **${certInfo?.name || certType}**.\n\n**Instructions:**\n• 10 multiple choice questions\n• 70% required to pass\n• Take your time and read carefully\n• You can review answers at the end`)
            .addFields(
                { name: '📚 Certification', value: certInfo?.name || certType, inline: true },
                { name: '⏰ Time Limit', value: '30 minutes', inline: true },
                { name: '✅ Passing Score', value: '70%', inline: true }
            )
            .setTimestamp();

        const startButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`start_exam_${examSession.sessionId}`)
                    .setLabel('Start Exam')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId(`cancel_exam_${examSession.sessionId}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.reply({ embeds: [embed], components: [startButton], ephemeral: true });
    },

    async handleButton(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        if (customId.startsWith('start_exam_')) {
            await this.showQuestion(interaction);
        } else if (customId.startsWith('cancel_exam_')) {
            activeExams.delete(userId);
            await interaction.update({ 
                content: '❌ Exam cancelled.', 
                embeds: [], 
                components: [] 
            });
        } else if (customId.startsWith('answer_')) {
            await this.handleAnswer(interaction);
        } else if (customId.startsWith('next_question_')) {
            await this.nextQuestion(interaction);
        } else if (customId.startsWith('submit_exam_')) {
            await this.submitExam(interaction);
        } else if (customId.startsWith('review_exam_')) {
            await this.reviewExam(interaction);
        }
    },

    async showQuestion(interaction) {
        const userId = interaction.user.id;
        const examSession = activeExams.get(userId);

        if (!examSession) {
            await interaction.update({ 
                content: '❌ Exam session not found.', 
                embeds: [], 
                components: [] 
            });
            return;
        }

        const question = examSession.questions[examSession.currentQuestion];
        const questionNum = examSession.currentQuestion + 1;
        const totalQuestions = examSession.questions.length;

        const embed = new EmbedBuilder()
            .setTitle(`📝 Question ${questionNum} of ${totalQuestions}`)
            .setColor(0x0099FF)
            .setDescription(`**${question.question}**`)
            .addFields({
                name: '📊 Progress',
                value: `Question ${questionNum}/${totalQuestions} | Time: ${this.getElapsedTime(examSession.startTime)}`,
                inline: false
            })
            .setTimestamp();

        const buttons = new ActionRowBuilder();
        question.options.forEach((option, index) => {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`answer_${examSession.sessionId}_${index}`)
                    .setLabel(`${String.fromCharCode(65 + index)}. ${option}`)
                    .setStyle(ButtonStyle.Secondary)
            );
        });

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleAnswer(interaction) {
        const userId = interaction.user.id;
        const examSession = activeExams.get(userId);

        if (!examSession) {
            await interaction.update({ 
                content: '❌ Exam session not found.', 
                embeds: [], 
                components: [] 
            });
            return;
        }

        const answerIndex = parseInt(interaction.customId.split('_').pop());
        examSession.answers.push(answerIndex);

        const question = examSession.questions[examSession.currentQuestion];
        const isCorrect = answerIndex === question.correct;
        const questionNum = examSession.currentQuestion + 1;
        const totalQuestions = examSession.questions.length;

        const embed = new EmbedBuilder()
            .setTitle(`${isCorrect ? '✅' : '❌'} Question ${questionNum} of ${totalQuestions}`)
            .setColor(isCorrect ? 0x00FF00 : 0xFF0000)
            .setDescription(`**${question.question}**\n\nYour answer: **${String.fromCharCode(65 + answerIndex)}. ${question.options[answerIndex]}**\nCorrect answer: **${String.fromCharCode(65 + question.correct)}. ${question.options[question.correct]}**`)
            .addFields({
                name: '📊 Progress',
                value: `Question ${questionNum}/${totalQuestions} | Time: ${this.getElapsedTime(examSession.startTime)}`,
                inline: false
            })
            .setTimestamp();

        const nextButton = new ActionRowBuilder();
        
        if (examSession.currentQuestion < examSession.questions.length - 1) {
            nextButton.addComponents(
                new ButtonBuilder()
                    .setCustomId(`next_question_${examSession.sessionId}`)
                    .setLabel('Next Question')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️')
            );
        } else {
            nextButton.addComponents(
                new ButtonBuilder()
                    .setCustomId(`review_exam_${examSession.sessionId}`)
                    .setLabel('Review Answers')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId(`submit_exam_${examSession.sessionId}`)
                    .setLabel('Submit Exam')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );
        }

        await interaction.update({ embeds: [embed], components: [nextButton] });
    },

    async nextQuestion(interaction) {
        const userId = interaction.user.id;
        const examSession = activeExams.get(userId);

        if (!examSession) {
            await interaction.update({ 
                content: '❌ Exam session not found.', 
                embeds: [], 
                components: [] 
            });
            return;
        }

        examSession.currentQuestion++;
        await this.showQuestion(interaction);
    },

    async reviewExam(interaction) {
        const userId = interaction.user.id;
        const examSession = activeExams.get(userId);

        if (!examSession) {
            await interaction.update({ 
                content: '❌ Exam session not found.', 
                embeds: [], 
                components: [] 
            });
            return;
        }

        const correctAnswers = examSession.answers.filter((answer, index) => 
            answer === examSession.questions[index].correct
        ).length;
        const totalQuestions = examSession.questions.length;
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);

        const embed = new EmbedBuilder()
            .setTitle('📋 Exam Review')
            .setColor(percentage >= 70 ? 0x00FF00 : 0xFF0000)
            .setDescription(`Review your answers before submitting.\n\n**Current Score: ${correctAnswers}/${totalQuestions} (${percentage}%)**\n**Passing Score: 70%**`)
            .addFields({
                name: '⏰ Time Taken',
                value: this.getElapsedTime(examSession.startTime),
                inline: true
            })
            .setTimestamp();

        const reviewText = examSession.questions.map((question, index) => {
            const userAnswer = examSession.answers[index];
            const isCorrect = userAnswer === question.correct;
            return `**Q${index + 1}:** ${isCorrect ? '✅' : '❌'} ${String.fromCharCode(65 + userAnswer)}`;
        }).join('\n');

        embed.addFields({
            name: '📝 Your Answers',
            value: reviewText,
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`submit_exam_${examSession.sessionId}`)
                    .setLabel('Submit Exam')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async submitExam(interaction) {
        const userId = interaction.user.id;
        const examSession = activeExams.get(userId);

        if (!examSession) {
            await interaction.update({ 
                content: '❌ Exam session not found.', 
                embeds: [], 
                components: [] 
            });
            return;
        }

        const correctAnswers = examSession.answers.filter((answer, index) => 
            answer === examSession.questions[index].correct
        ).length;
        const totalQuestions = examSession.questions.length;
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        const passed = percentage >= 70;
        const timeTaken = Math.round((Date.now() - examSession.startTime) / 1000 / 60); // minutes

        try {
            // Save exam result to database
            trainingDB.saveExamResult(
                userId,
                interaction.user.displayName,
                examSession.certType,
                correctAnswers,
                totalQuestions,
                passed ? 1 : 0,
                timeTaken
            );

            const certInfo = getCertificationInfo(examSession.certType);
            
            const embed = new EmbedBuilder()
                .setTitle(`${passed ? '🎉 Exam Passed!' : '❌ Exam Failed'}`)
                .setColor(passed ? 0x00FF00 : 0xFF0000)
                .setDescription(passed ? 
                    `Congratulations! You have successfully passed the **${certInfo?.name || examSession.certType}** examination.` :
                    `You did not pass the **${certInfo?.name || examSession.certType}** examination. You can retake it anytime.`)
                .addFields(
                    { name: '📊 Score', value: `${correctAnswers}/${totalQuestions} (${percentage}%)`, inline: true },
                    { name: '⏰ Time Taken', value: `${timeTaken} minutes`, inline: true },
                    { name: '✅ Required', value: '70%', inline: true }
                )
                .setTimestamp();

            if (passed) {
                embed.addFields({
                    name: '🎖️ Next Steps',
                    value: 'Contact an instructor to award your certification!',
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📚 Study Recommendations',
                    value: 'Review the material and use `/training-exam retake` when ready.',
                    inline: false
                });
            }

            // Clean up exam session
            activeExams.delete(userId);

            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            console.error('Error saving exam result:', error);
            await interaction.update({ 
                content: '❌ Failed to save exam result. Please contact an administrator.', 
                embeds: [], 
                components: [] 
            });
        }
    },

    async viewResults(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const certType = interaction.options.getString('certification');
        
        const results = trainingDB.getUserExamResults(targetUser.id, certType);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Exam Results - ${targetUser.displayName}`)
            .setColor(0x0099FF)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        if (results.length === 0) {
            embed.setDescription('No exam results found.');
        } else {
            const resultText = results.slice(0, 10).map(result => {
                const percentage = Math.round((result.score / result.total_questions) * 100);
                const status = result.passed ? '✅ PASSED' : '❌ FAILED';
                return `**${result.cert_type}** - ${result.date_taken}\n└ ${status} | Score: ${result.score}/${result.total_questions} (${percentage}%) | Time: ${result.time_taken}min`;
            }).join('\n\n');

            embed.addFields({
                name: `📋 Recent Results (${results.length} total)`,
                value: resultText,
                inline: false
            });

            // Statistics
            const passedExams = results.filter(r => r.passed).length;
            const avgScore = results.length > 0 ? 
                Math.round(results.reduce((sum, r) => sum + (r.score / r.total_questions * 100), 0) / results.length) : 0;

            embed.addFields({
                name: '📈 Statistics',
                value: `Exams Passed: ${passedExams}/${results.length}\nAverage Score: ${avgScore}%`,
                inline: true
            });

            if (results.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${results.length} results` });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },

    getElapsedTime(startTime) {
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        return `${elapsed} min`;
    }
};