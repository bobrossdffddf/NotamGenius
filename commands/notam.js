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
                flags: 64
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

        await interaction.reply({ embeds: [helpEmbed], flags: 64 });
    },

    async startNotamCreation(interaction) {
        const modal = new ModalBuilder()
            .setCustomId(`notam_single_form`)
            .setTitle('Create NOTAM - Fill All Fields');

        // Operation Name
        const operationNameInput = new TextInputBuilder()
            .setCustomId('operation_name')
            .setLabel('Operation Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "Anchorage Resolution"')
            .setRequired(true)
            .setMaxLength(100);

        // Operation Leader
        const operationLeaderInput = new TextInputBuilder()
            .setCustomId('operation_leader')
            .setLabel('Operation Leader')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., @alexbillyjoil or TBD')
            .setRequired(true)
            .setMaxLength(100);

        // Operation Time & Date
        const operationTimeInput = new TextInputBuilder()
            .setCustomId('operation_time')
            .setLabel('Operation Time & Date')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "December 15, 2024 - 1400Z" or "TBD"')
            .setRequired(true)
            .setMaxLength(200);

        // Operation Details
        const operationDetailsInput = new TextInputBuilder()
            .setCustomId('operation_details')
            .setLabel('Operation Details')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Detailed description of the operation...')
            .setRequired(true)
            .setMaxLength(2000);

        // Operation Positions
        const positionsInput = new TextInputBuilder()
            .setCustomId('operation_positions')
            .setLabel('Operation Positions (Role: Person format)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Air Force One Pilot: @alexbillyjoil\nMarine One Pilot: TBD\nPOTUS: TBD')
            .setRequired(true)
            .setMaxLength(1500);

        const row1 = new ActionRowBuilder().addComponents(operationNameInput);
        const row2 = new ActionRowBuilder().addComponents(operationLeaderInput);
        const row3 = new ActionRowBuilder().addComponents(operationTimeInput);
        const row4 = new ActionRowBuilder().addComponents(operationDetailsInput);
        const row5 = new ActionRowBuilder().addComponents(positionsInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'notam_single_form') return;

        // Get all form values
        const operationName = interaction.fields.getTextInputValue('operation_name');
        const operationLeader = interaction.fields.getTextInputValue('operation_leader');
        const operationTime = interaction.fields.getTextInputValue('operation_time');
        const operationDetails = interaction.fields.getTextInputValue('operation_details');
        const positionsText = interaction.fields.getTextInputValue('operation_positions');

        // Parse positions
        const positions = this.parsePositions(positionsText);

        // Create NOTAM data
        const notamData = {
            operationName,
            operationLeader,
            operationTime,
            operationJoinTime: 'TBD', // Set default since we simplified the form
            operationDetails,
            positions,
            additionalNotes: ''
        };

        // Generate the NOTAM
        const notamContent = generateNotam(notamData);
        
        // Reply with the generated NOTAM in a copyable code block
        await interaction.reply({
            content: `# ✅ NOTAM Generated Successfully!\n\n**Copy the text below:**\n\`\`\`\n${notamContent}\n\`\`\``,
            flags: 64
        });
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

};
