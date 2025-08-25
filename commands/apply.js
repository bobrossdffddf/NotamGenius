const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');

// Configuration for certification types and channels
const config = {
    privateChannelId: '1408965201210114069',
    traineeRoleId: '1408854677784887449',
    certificationRoles: {
        'atc': {
            name: 'ATC Certified',
            roleId: '1408995322021154846'
        },
        'af1': {
            name: 'USAF | Air Force One Certified',
            roleId: '1408942834060361740'
        },
        'marine-one': {
            name: 'USMC | Marine One Certified',
            roleId: '1408943018991423571'
        },
        'ground-ops': {
            name: 'Ground Operations Certified',
            roleId: '1408995373455904789'
        },
        'f22': {
            name: 'F-22 Raptor Certified',
            roleId: '1409300377463165079'
        },
        'f35': {
            name: 'F-35 Lightning II Certified',
            roleId: '1409300434967072888'
        },
        'f16': {
            name: 'F-16 Fighting Falcon Certified',
            roleId: '1409300512062574663'
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Apply for certification training')
        .addStringOption(option =>
            option
                .setName('certification')
                .setDescription('Type of certification to apply for')
                .setRequired(true)
                .addChoices(
                    { name: 'ATC Certified', value: 'atc' },
                    { name: 'USAF | Air Force One Certified', value: 'af1' },
                    { name: 'USMC | Marine One Certified', value: 'marine-one' },
                    { name: 'Ground Operations Certified', value: 'ground-ops' },
                    { name: 'F-22 Raptor Certified', value: 'f22' },
                    { name: 'F-35 Lightning II Certified', value: 'f35' },
                    { name: 'F-16 Fighting Falcon Certified', value: 'f16' }
                )
        ),

    async execute(interaction) {
        await this.handleCertificationRequest(interaction);
    },

    async handleCertificationRequest(interaction) {
        const certType = interaction.options.getString('certification');
        const user = interaction.user;
        const member = interaction.member;
        const guild = interaction.guild;

        // Get certification info
        const certification = config.certificationRoles[certType];
        if (!certification) {
            await interaction.reply({
                content: '❌ Invalid certification type!',
                flags: 64
            });
            return;
        }

        try {
            // Check if user already has this certification
            const targetRole = guild.roles.cache.get(certification.roleId);
            if (member.roles.cache.has(certification.roleId)) {
                await interaction.reply({
                    content: `❌ You already have the **${certification.name}** certification!`,
                    flags: 64
                });
                return;
            }

            // Assign trainee role
            const traineeRole = guild.roles.cache.get(config.traineeRoleId);
            if (traineeRole && !member.roles.cache.has(config.traineeRoleId)) {
                await member.roles.add(traineeRole);
            }

            // Create embed for private channel notification
            const embed = new EmbedBuilder()
                .setTitle('🎯 New Certification Application')
                .setColor(0x00AE86)
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: '👤 Applicant', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '📋 Requested Certification', value: certification.name, inline: true },
                    { name: '📅 Applied At', value: this.formatTimeEST(new Date()), inline: true },
                    { name: '📊 Status', value: '⏳ Pending Review', inline: true },
                    { name: '🏷️ Trainee Role', value: traineeRole ? '✅ Assigned' : '❌ Not Found', inline: true }
                )
                .setFooter({ 
                    text: `Application ID: ${interaction.id}`,
                    iconURL: guild.iconURL() 
                })
                .setTimestamp();

            // Send notification to private channel
            const privateChannel = guild.channels.cache.get(config.privateChannelId);
            if (privateChannel) {
                await privateChannel.send({ embeds: [embed] });
            } else {
                console.error(`❌ Private channel not found: ${config.privateChannelId}`);
            }

            // Reply to user
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Application Submitted Successfully!')
                .setColor(0x57F287)
                .setDescription(`Your application for **${certification.name}** has been submitted and is pending review.`)
                .addFields(
                    { name: '📋 Next Steps', value: 'Training staff will review your application and contact you with further instructions.' },
                    { name: '🏷️ Role Assignment', value: traineeRole ? 'You have been given the Trainee role.' : 'Trainee role could not be assigned.' }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], flags: 64 });

            // Log the application
            console.log(`📝 Certification application: ${user.tag} applied for ${certification.name}`);

        } catch (error) {
            console.error('❌ Error processing certification application:', error);
            await interaction.reply({
                content: '❌ There was an error processing your application. Please try again later.',
                flags: 64
            });
        }
    },

    formatTimeEST(date) {
        // Convert to EST (UTC-5)
        const estDate = new Date(date.getTime() - (5 * 60 * 60 * 1000));
        const month = String(estDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(estDate.getUTCDate()).padStart(2, '0');
        const year = estDate.getUTCFullYear();
        const hours = String(estDate.getUTCHours()).padStart(2, '0');
        const minutes = String(estDate.getUTCMinutes()).padStart(2, '0');
        
        return `${month}/${day}/${year} @ ${hours}${minutes} EST`;
    }
};