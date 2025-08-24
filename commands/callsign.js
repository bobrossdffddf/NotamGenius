
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('callsign')
        .setDescription('Generate a military callsign')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to generate callsign for (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('aircraft')
                .setDescription('Select aircraft type')
                .setRequired(false)
                .addChoices(
                    { name: 'F-22 Raptor (RAP-X / RAPTOR-X)', value: 'f22' },
                    { name: 'F-16 Viper (VIPER-X)', value: 'f16' },
                    { name: 'F-35 Lightning II (PANTHER-X)', value: 'f35' },
                    { name: 'C-17 Globemaster III (SAM-XXXX)', value: 'c17' },
                    { name: 'E-3 Sentry AWACS (NATO-XXXX)', value: 'awacs' }
                )
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const aircraftType = interaction.options.getString('aircraft');

        let callsign;
        let aircraftInfo = '';

        if (aircraftType) {
            // Generate aircraft-specific callsigns
            const seed = parseInt(targetUser.id.slice(-6), 16);
            
            switch (aircraftType) {
                case 'f22':
                    const useRaptor = seed % 2 === 0;
                    callsign = useRaptor ? `RAPTOR-1` : `RAP-1`;
                    break;
                    
                case 'f16':
                    callsign = `VIPER-1`;
                    break;
                    
                case 'f35':
                    callsign = `PANTHER-1`;
                    break;
                    
                case 'c17':
                    callsign = `SAM-1000`;
                    break;
                    
                case 'awacs':
                    callsign = `NATO-1000`;
                    break;
            }
        } else {
            // Generate traditional callsign if no aircraft selected
            const prefixes = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];
            const suffixes = ['Eagle', 'Falcon', 'Hawk', 'Viper', 'Thunder', 'Lightning', 'Storm', 'Phantom', 'Ghost', 'Blade', 'Steel', 'Fire', 'Ice', 'Wolf', 'Bear', 'Tiger', 'Shark', 'Arrow', 'Bullet', 'Rocket'];

            const seed = parseInt(targetUser.id.slice(-6), 16);
            const prefix = prefixes[seed % prefixes.length];
            const suffix = suffixes[(seed * 7) % suffixes.length];

            callsign = `${prefix} ${suffix} 1`;
        }

        await interaction.reply({ 
            content: `🎖️ **Callsign:** ${callsign}`,
            ephemeral: true 
        });
    }
};
