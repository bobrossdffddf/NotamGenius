/**
 * NOTAM template generator for military-style operation briefings
 */

/**
 * Get the form fields configuration for NOTAM creation
 * @returns {Array} Array of field configurations
 */
function getNotamFields() {
    return [
        {
            key: 'operationName',
            label: 'Operation Name',
            placeholder: 'e.g., "Anchorage Resolution"',
            required: true,
            multiline: false,
            maxLength: 100
        },
        {
            key: 'operationLeader',
            label: 'Operation Leader',
            placeholder: 'e.g., @alexbillyjoil or TBD',
            required: true,
            multiline: false,
            maxLength: 100
        },
        {
            key: 'operationTime',
            label: 'Operation Time & Date',
            placeholder: 'e.g., "December 15, 2024 - 1400Z" or "TBD"',
            required: true,
            multiline: false,
            maxLength: 200
        },
        {
            key: 'operationJoinTime',
            label: 'Operation Join Time',
            placeholder: 'e.g., "30 minutes prior" or "TBD"',
            required: false,
            multiline: false,
            maxLength: 100
        },
        {
            key: 'operationDetails',
            label: 'Operation Details',
            placeholder: 'Detailed description of the operation, objectives, and important information...',
            required: true,
            multiline: true,
            maxLength: 2000
        },
        {
            key: 'positions',
            label: 'Operation Positions',
            placeholder: 'Format: Role: Person\nExample:\nAir Force One Pilot: @alexbillyjoil\nMarine One Pilot: TBD\nPOTUS: TBD',
            required: true,
            multiline: true,
            maxLength: 1500
        },
        {
            key: 'additionalNotes',
            label: 'Additional Notes (Optional)',
            placeholder: 'Any additional information, disclaimers, or special instructions...',
            required: false,
            multiline: true,
            maxLength: 1000
        }
    ];
}

/**
 * Generate a formatted NOTAM from user data
 * @param {Object} data - The form data
 * @returns {string} - The formatted NOTAM
 */
function generateNotam(data) {
    const timestamp = new Date().toISOString().substring(11, 16).replace(':', '') + 'z';
    
    let notam = '';
    
    // Header
    notam += 'United States Department of Defense: USAF x USMC | Operation ["' + (data.operationName || 'TBD') + '"]\n\n';
    
    // Separator
    notam += '——————————————————————————————————————————————————————\n\n';
    
    // Operation info
    notam += 'Operation Leader: [' + (data.operationLeader || 'TBD') + ']\n';
    notam += 'Operation Time & Date: [' + (data.operationTime || 'TBD') + ']\n';
    notam += 'Operation Join Time: [' + (data.operationJoinTime || 'TBD') + ']\n\n';
    
    // Separator
    notam += '——————————————————————————————————————————————————————\n\n';
    
    // Operation details
    notam += 'Operation Details: [' + (data.operationDetails || 'No details provided') + ']\n\n';
    
    // Separator
    notam += '——————————————————————————————————————————————————————\n\n';
    
    // Positions
    notam += '[Operation Positions:\n\n';
    
    if (data.positions && Object.keys(data.positions).length > 0) {
        for (const [role, person] of Object.entries(data.positions)) {
            notam += role + ': ' + person + '\n';
        }
    } else {
        notam += 'No positions specified\n';
    }
    
    notam += ']\n\n';
    
    // Separator
    notam += '——————————————————————————————————————————————————————\n\n';
    
    // Default disclaimers
    notam += 'The Information is subject to change. A notification will go out following any vital changes to the operation or its information. This is a *preliminary* operation briefing, an official one is to be held prior to the operation.\n\n';
    
    notam += 'Please ping [' + (data.operationLeader || 'Operation Leader') + '] to reserve your spot/role in the operation\n\n';
    
    notam += 'The operation is subject to change time and/or date if availability\n\n';
    
    // Additional notes
    if (data.additionalNotes && data.additionalNotes.trim()) {
        notam += data.additionalNotes.trim() + '\n\n';
    }
    
    // Separator
    notam += '——————————————————————————————————————————————————————\n\n';
    
    // Footer
    notam += 'END OF OPERATION ' + (data.operationName || 'UNKNOWN').toUpperCase() + ' | GENERATED [' + timestamp + ']';
    
    return notam;
}

/**
 * Validate NOTAM data
 * @param {Object} data - The form data to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
function validateNotamData(data) {
    const errors = [];
    
    if (!data.operationName || data.operationName.trim().length === 0) {
        errors.push('Operation name is required');
    }
    
    if (!data.operationLeader || data.operationLeader.trim().length === 0) {
        errors.push('Operation leader is required');
    }
    
    if (!data.operationTime || data.operationTime.trim().length === 0) {
        errors.push('Operation time & date is required');
    }
    
    if (!data.operationDetails || data.operationDetails.trim().length === 0) {
        errors.push('Operation details are required');
    }
    
    if (!data.positions || Object.keys(data.positions).length === 0) {
        errors.push('At least one operation position is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Create a sample NOTAM for testing (only used for documentation)
 * @returns {Object} - Sample data structure
 */
function getSampleNotamData() {
    return {
        operationName: 'Anchorage Resolution',
        operationLeader: '@alexbillyjoil',
        operationTime: 'TBD',
        operationJoinTime: 'TBD',
        operationDetails: 'The United States Department of Defense has received a request from the POTUS to transport him to Anchorage Elmendorf Air Force Base (Sauthemptona) to have a bilateral meeting with Russian President Vladimir Putin to discuss the on-going conflict in Ukraine, and to speak about a potential peace deal / ceasefire. The DoD is tasked with escorting Russia\'s "Special Flight Squadron into Sauthemptona and to fly the POTUS into Sauthemptona from Joint Base Andrew\'s (McConnell AFB). The POTUS will speak in Sauthemptona\'s local town, and will fly home when the talks are completed.',
        positions: {
            'Air Force One Pilot': '@alexbillyjoil',
            'Marine One Pilot': 'N/A',
            'POTUS': 'TBD',
            'VPOTUS': 'N/A',
            'RSD Pilot': 'TBD',
            'RSD POTUS': 'TBD (Can be pilot too)',
            'Bus Driver 1': '@alexbillyjoil',
            'Bus Driver 2': 'TBD'
        },
        additionalNotes: ''
    };
}

module.exports = {
    getNotamFields,
    generateNotam,
    validateNotamData,
    getSampleNotamData
};
