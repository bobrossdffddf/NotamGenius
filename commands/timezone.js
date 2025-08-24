const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Convert time to military zones')
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription('Time to convert (e.g., "14:30" or "2:30 PM")')
                .setRequired(true)
        ),

    async execute(interaction) {
        const timeInput = interaction.options.getString('time');
        
        try {
            // Parse the input time
            let hours, minutes;
            
            if (timeInput.includes(':')) {
                const parts = timeInput.toLowerCase().replace(/[^0-9:apm]/g, '');
                const timeParts = parts.split(':');
                hours = parseInt(timeParts[0]);
                minutes = parseInt(timeParts[1]) || 0;
                
                // Handle AM/PM
                if (timeInput.toLowerCase().includes('pm') && hours !== 12) {
                    hours += 12;
                } else if (timeInput.toLowerCase().includes('am') && hours === 12) {
                    hours = 0;
                }
            } else {
                throw new Error('Invalid format');
            }
            
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                throw new Error('Invalid time');
            }
            
            const timeStr = `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
            
            const timeZones = [
                { code: 'Z', name: 'Zulu Time (UTC)', offset: 0 },
                { code: 'A', name: 'Alpha (UTC+1)', offset: 1 },
                { code: 'B', name: 'Bravo (UTC+2)', offset: 2 },
                { code: 'D', name: 'Delta (UTC+4)', offset: 4 },
                { code: 'E', name: 'Echo (UTC+5)', offset: 5 },
                { code: 'F', name: 'Foxtrot (UTC+6)', offset: 6 },
                { code: 'G', name: 'Golf (UTC+7)', offset: 7 },
                { code: 'H', name: 'Hotel (UTC+8)', offset: 8 },
                { code: 'I', name: 'India (UTC+9)', offset: 9 },
            ];
            
            let response = `⏰ **Time Conversion for ${timeInput}**\n\n`;
            
            timeZones.forEach(tz => {
                const convertedHours = (hours + tz.offset) % 24;
                const convertedTime = `${convertedHours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}${tz.code}`;
                response += `**${tz.code}** - ${tz.name}: **${convertedTime}**\n`;
            });
            
            await interaction.reply({ content: response, flags: 64 });
            
        } catch (error) {
            await interaction.reply({
                content: '❌ Invalid time format. Use format like "14:30" or "2:30 PM"',
                flags: 64
            });
        }
    }
};