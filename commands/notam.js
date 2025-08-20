const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { checkAdminPermissions } = require('../utils/permissions');
const { generateNotam, getNotamFields } = require('../templates/notam-template');

// Store user form data temporarily (in production, consider using a database)
const formData = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notam')
        .setDescription('Generate a military-style NOTAM (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new NOTAM')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Show NOTAM creation help')
        ),

    async execute(interaction) {
        // Check admin permissions
        if (!checkAdminPermissions(interaction.member)) {
            await interaction.reply({
                content: '❌ **Access Denied**\nOnly administrators can create NOTAMs.',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'help') {
            await this.showHelp(interaction);
        } else if (subcommand === 'create') {
            await this.startNotamCreation(interaction);
        }
    },

    async showHelp(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🎖️ NOTAM Generator Help')
            .setDescription('This bot generates military-style NOTAMs (Notice to Airmen) for operation briefings.')
            .addFields(
                {
                    name: '📋 Available Commands',
                    value: '`/notam create` - Start creating a new NOTAM\n`/notam help` - Show this help message'
                },
                {
                    name: '🔐 Permissions',
                    value: 'Only server administrators can create NOTAMs'
                },
                {
                    name: '📝 Form Fields',
                    value: 'The form will guide you through filling in:\n• Operation name\n• Operation leader\n• Time & date information\n• Operation details\n• Position assignments\n• Additional notes'
                },
                {
                    name: '⚡ Usage',
                    value: '1. Run `/notam create`\n2. Fill out the interactive forms\n3. Review and confirm your NOTAM\n4. The formatted NOTAM will be posted'
                }
            )
            .setColor(0x0099FF)
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    },

    async startNotamCreation(interaction) {
        const userId = interaction.user.id;
        
        // Initialize form data
        formData.set(userId, {
            operationName: '',
            operationLeader: '',
            operationTime: '',
            operationJoinTime: '',
            operationDetails: '',
            positions: {},
            additionalNotes: '',
            currentStep: 0
        });

        await this.showFormStep(interaction, userId, 0);
    },

    async showFormStep(interaction, userId, step) {
        const fields = getNotamFields();
        const currentField = fields[step];
        
        if (!currentField) {
            // All steps completed, show preview
            await this.showPreview(interaction, userId);
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`notam_form_${userId}_${step}`)
            .setTitle(`NOTAM Creation - Step ${step + 1}/${fields.length}`);

        const textInput = new TextInputBuilder()
            .setCustomId('field_value')
            .setLabel(currentField.label)
            .setStyle(currentField.multiline ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setPlaceholder(currentField.placeholder || '')
            .setRequired(currentField.required || false);

        if (currentField.maxLength) {
            textInput.setMaxLength(currentField.maxLength);
        }

        const actionRow = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        if (!interaction.customId.startsWith('notam_form_')) return;

        const [, , userId, step] = interaction.customId.split('_');
        const stepNum = parseInt(step);
        const fieldValue = interaction.fields.getTextInputValue('field_value');
        
        // Store the field value
        const userData = formData.get(userId);
        if (!userData) {
            await interaction.reply({ content: '❌ Form session expired. Please start over.', ephemeral: true });
            return;
        }

        const fields = getNotamFields();
        const currentField = fields[stepNum];
        
        // Update form data based on field type
        switch (currentField.key) {
            case 'operationName':
                userData.operationName = fieldValue;
                break;
            case 'operationLeader':
                userData.operationLeader = fieldValue;
                break;
            case 'operationTime':
                userData.operationTime = fieldValue;
                break;
            case 'operationJoinTime':
                userData.operationJoinTime = fieldValue;
                break;
            case 'operationDetails':
                userData.operationDetails = fieldValue;
                break;
            case 'positions':
                userData.positions = this.parsePositions(fieldValue);
                break;
            case 'additionalNotes':
                userData.additionalNotes = fieldValue;
                break;
        }

        userData.currentStep = stepNum + 1;
        formData.set(userId, userData);

        // Show next step or preview
        if (stepNum + 1 < fields.length) {
            await this.showFormStep(interaction, userId, stepNum + 1);
        } else {
            await this.showPreview(interaction, userId);
        }
    },

    parsePositions(positionsText) {
        const positions = {};
        const lines = positionsText.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex !== -1) {
                    const role = trimmed.substring(0, colonIndex).trim();
                    const person = trimmed.substring(colonIndex + 1).trim();
                    positions[role] = person;
                } else {
                    // If no colon, treat as role with TBD
                    positions[trimmed] = 'TBD';
                }
            }
        }
        
        return positions;
    },

    async showPreview(interaction, userId) {
        const userData = formData.get(userId);
        if (!userData) {
            await interaction.reply({ content: '❌ Form session expired. Please start over.', ephemeral: true });
            return;
        }

        const notamContent = generateNotam(userData);
        
        const previewEmbed = new EmbedBuilder()
            .setTitle('📋 NOTAM Preview')
            .setDescription('```\n' + notamContent + '\n```')
            .setColor(0x00FF00)
            .setFooter({ text: 'Review your NOTAM and choose an action below' });

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`notam_post_${userId}`)
                    .setLabel('📤 Post NOTAM')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`notam_edit_${userId}`)
                    .setLabel('✏️ Edit NOTAM')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`notam_cancel_${userId}`)
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ 
            embeds: [previewEmbed], 
            components: [actionRow], 
            ephemeral: true 
        });
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('notam_')) return;

        const [action, subaction, userId] = interaction.customId.split('_');
        
        if (interaction.user.id !== userId) {
            await interaction.reply({ content: '❌ You can only interact with your own NOTAM forms.', ephemeral: true });
            return;
        }

        const userData = formData.get(userId);
        if (!userData) {
            await interaction.reply({ content: '❌ Form session expired. Please start over.', ephemeral: true });
            return;
        }

        switch (subaction) {
            case 'post':
                await this.postNotam(interaction, userId, userData);
                break;
            case 'edit':
                await this.editNotam(interaction, userId);
                break;
            case 'cancel':
                await this.cancelNotam(interaction, userId);
                break;
        }
    },

    async postNotam(interaction, userId, userData) {
        const notamContent = generateNotam(userData);
        
        // Post the NOTAM to the channel
        await interaction.update({
            content: '✅ **NOTAM Posted Successfully**',
            embeds: [],
            components: []
        });

        // Send the actual NOTAM
        await interaction.followUp({
            content: `# 🎖️ MILITARY NOTAM\n\`\`\`\n${notamContent}\n\`\`\``,
            ephemeral: false
        });

        // Clean up form data
        formData.delete(userId);
    },

    async editNotam(interaction, userId) {
        await interaction.update({
            content: '✏️ **Editing NOTAM**\nStarting form from the beginning...',
            embeds: [],
            components: []
        });

        // Reset to first step
        await this.showFormStep(interaction, userId, 0);
    },

    async cancelNotam(interaction, userId) {
        formData.delete(userId);
        
        await interaction.update({
            content: '❌ **NOTAM Creation Cancelled**',
            embeds: [],
            components: []
        });
    }
};
