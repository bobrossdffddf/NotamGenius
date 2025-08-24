
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
                    const f22Number = (seed % 9) + 1;
                    const useRaptor = seed % 2 === 0;
                    callsign = useRaptor ? `RAPTOR-${f22Number}` : `RAP-${f22Number}`;
                    aircraftInfo = '🛩️ **F-22 Raptor** | Flight Leader #1';
                    break;
                    
                case 'f16':
                    const f16Number = (seed % 9) + 1;
                    callsign = `VIPER-${f16Number}`;
                    aircraftInfo = '✈️ **F-16 Viper** | Flight Leader #2';
                    break;
                    
                case 'f35':
                    const f35Number = (seed % 9) + 1;
                    callsign = `PANTHER-${f35Number}`;
                    aircraftInfo = '🦅 **F-35 Lightning II**';
                    break;
                    
                case 'c17':
                    const c17Number = 1000 + (seed % 9000);
                    callsign = `SAM-${c17Number}`;
                    aircraftInfo = '🛫 **C-17 Globemaster III**';
                    break;
                    
                case 'awacs':
                    const awacsNumber = 1000 + (seed % 9000);
                    callsign = `NATO-${awacsNumber}`;
                    aircraftInfo = '📡 **E-3 Sentry AWACS**';
                    break;
            }
        } else {
            // Generate traditional callsign if no aircraft selected
            const prefixes = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];
            const suffixes = ['Eagle', 'Falcon', 'Hawk', 'Viper', 'Thunder', 'Lightning', 'Storm', 'Phantom', 'Ghost', 'Blade', 'Steel', 'Fire', 'Ice', 'Wolf', 'Bear', 'Tiger', 'Shark', 'Arrow', 'Bullet', 'Rocket'];

            const seed = parseInt(targetUser.id.slice(-6), 16);
            const prefix = prefixes[seed % prefixes.length];
            const suffix = suffixes[(seed * 7) % suffixes.length];
            const number = (seed % 99) + 1;

            callsign = `${prefix} ${suffix} ${number.toString().padStart(2, '0')}`;
            aircraftInfo = '🎖️ **General Military Callsign**';
        }

        const embed = new EmbedBuilder()
            .setTitle('🎖️ Military Callsign Generated')
            .setColor(0x5865F2)
            .addFields(
                { name: '👤 Personnel', value: targetUser.displayName, inline: true },
                { name: '📻 Callsign', value: `**${callsign}**`, inline: true },
                { name: '✈️ Aircraft/Type', value: aircraftInfo, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: 'Callsign generated based on user ID seed' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
