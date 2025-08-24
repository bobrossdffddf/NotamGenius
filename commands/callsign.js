const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('callsign')
        .setDescription('Generate a military callsign')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to generate callsign for (optional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        const prefixes = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];
        
        const suffixes = ['Eagle', 'Falcon', 'Hawk', 'Viper', 'Thunder', 'Lightning', 'Storm', 'Phantom', 'Ghost', 'Blade', 'Steel', 'Fire', 'Ice', 'Wolf', 'Bear', 'Tiger', 'Shark', 'Arrow', 'Bullet', 'Rocket'];
        
        // Use user ID as seed for consistent callsigns
        const seed = parseInt(targetUser.id.slice(-6), 16);
        const prefix = prefixes[seed % prefixes.length];
        const suffix = suffixes[(seed * 7) % suffixes.length];
        const number = (seed % 99) + 1;
        
        const callsign = `${prefix} ${suffix} ${number.toString().padStart(2, '0')}`;
        
        await interaction.reply({
            content: `🎖️ **Callsign Generated**\n${targetUser.displayName}: **${callsign}**`,
            flags: 64
        });
    }
};