// Training certification configuration

const CERTIFICATIONS = {
    aircraft: {
        'F-22': { 
            name: 'F-22 Raptor', 
            difficulty: 'advanced', 
            prerequisites: ['trainee'], 
            minFlightHours: 25,
            description: 'Advanced air superiority fighter certification'
        },
        'F-16': { 
            name: 'F-16 Fighting Falcon', 
            difficulty: 'intermediate', 
            prerequisites: ['trainee'], 
            minFlightHours: 15,
            description: 'Multi-role fighter certification'
        },
        'F-35': { 
            name: 'F-35 Lightning II', 
            difficulty: 'advanced', 
            prerequisites: ['trainee'], 
            minFlightHours: 20,
            description: 'Next-generation multirole fighter certification'
        },
        'A-10': { 
            name: 'A-10 Thunderbolt II', 
            difficulty: 'intermediate', 
            prerequisites: ['trainee'], 
            minFlightHours: 15,
            description: 'Close air support aircraft certification'
        },
        'KC-135': { 
            name: 'KC-135 Stratotanker', 
            difficulty: 'intermediate', 
            prerequisites: ['trainee'], 
            minFlightHours: 20,
            description: 'Aerial refueling aircraft certification'
        },
        'C-130': { 
            name: 'C-130 Hercules', 
            difficulty: 'basic', 
            prerequisites: ['trainee'], 
            minFlightHours: 10,
            description: 'Transport aircraft certification'
        }
    },
    roles: {
        'flight-lead': { 
            name: 'Flight Lead', 
            prerequisites: ['certified'], 
            minFlightHours: 50,
            description: 'Leadership of small flight formations'
        },
        'mission-commander': { 
            name: 'Mission Commander', 
            prerequisites: ['flight-lead'], 
            minFlightHours: 100,
            description: 'Overall mission command and control'
        },
        'atc': { 
            name: 'Air Traffic Controller', 
            prerequisites: ['trainee'], 
            minFlightHours: 0,
            description: 'Air traffic control and communication'
        },
        'ground-crew': { 
            name: 'Ground Crew', 
            prerequisites: ['trainee'], 
            minFlightHours: 0,
            description: 'Aircraft ground operations and maintenance'
        }
    },
    skills: {
        'formation-flying': { 
            name: 'Formation Flying', 
            prerequisites: ['certified'], 
            minFlightHours: 25,
            description: 'Advanced formation flying techniques'
        }
    },
    instructor: {
        'basic-instructor': { 
            name: 'Basic Instructor', 
            prerequisites: ['certified'], 
            minFlightHours: 75,
            description: 'Qualified to teach basic certifications'
        },
        'senior-instructor': { 
            name: 'Senior Instructor', 
            prerequisites: ['basic-instructor'], 
            minFlightHours: 150,
            description: 'Qualified to teach advanced certifications'
        }
    }
};

const CERT_LEVELS = {
    'trainee': { 
        name: 'Trainee', 
        color: 0x808080,
        description: 'Starting level for all pilots'
    },
    'certified': { 
        name: 'Certified', 
        color: 0x00FF00,
        description: 'Fully qualified and operational'
    }
};

const SESSION_TYPES = {
    'ground-school': { 
        name: 'Ground School',
        duration: 1, 
        maxStudents: 10,
        description: 'Classroom-style training sessions'
    },
    'simulator': { 
        name: 'Simulator Training',
        duration: 2, 
        maxStudents: 4,
        description: 'Flight simulator training'
    },
    'flight-training': { 
        name: 'Flight Training',
        duration: 3, 
        maxStudents: 2,
        description: 'Actual aircraft flight training'
    },
    'weapons-training': {
        name: 'Weapons Training',
        duration: 2,
        maxStudents: 6,
        description: 'Weapons systems and tactics'
    },
    'emergency-procedures': {
        name: 'Emergency Procedures',
        duration: 1.5,
        maxStudents: 8,
        description: 'Emergency response training'
    }
};

const COMPETITION_TYPES = {
    'top-gun': {
        name: 'Top Gun Monthly',
        criteria: ['flight_hours', 'exam_scores', 'training_completion'],
        rewards: ['Top Gun Role', 'Special Badge'],
        frequency: 'monthly',
        description: 'Elite pilot competition'
    },
    'training-challenge': {
        name: 'Training Challenge',
        criteria: ['sessions_completed', 'improvement_rate'],
        frequency: 'monthly',
        rewards: ['Training Champion Badge'],
        description: 'Monthly training progression challenge'
    },
    'instructor-excellence': {
        name: 'Instructor Excellence',
        criteria: ['student_satisfaction', 'student_success_rate'],
        frequency: 'quarterly',
        rewards: ['Excellence Badge', 'Recognition'],
        description: 'Outstanding instructor recognition'
    }
};

// Helper functions
function getAllCertifications() {
    const all = {};
    Object.keys(CERTIFICATIONS).forEach(category => {
        Object.keys(CERTIFICATIONS[category]).forEach(cert => {
            all[cert] = {
                ...CERTIFICATIONS[category][cert],
                category
            };
        });
    });
    return all;
}

function getCertificationInfo(certType) {
    for (const category of Object.keys(CERTIFICATIONS)) {
        if (CERTIFICATIONS[category][certType]) {
            return {
                ...CERTIFICATIONS[category][certType],
                category,
                type: certType
            };
        }
    }
    return null;
}

function canAwardCertification(userCerts, targetCert) {
    const certInfo = getCertificationInfo(targetCert);
    if (!certInfo) return { canAward: false, reason: 'Certification not found' };

    // Check prerequisites
    for (const prereq of certInfo.prerequisites) {
        const hasPrereq = userCerts.some(cert => 
            cert.cert_type === prereq || cert.cert_level === prereq
        );
        if (!hasPrereq) {
            return { 
                canAward: false, 
                reason: `Missing prerequisite: ${prereq}` 
            };
        }
    }

    return { canAward: true };
}

function getInstructorLevel(userCerts) {
    if (userCerts.some(cert => cert.cert_type === 'senior-instructor')) {
        return 'senior-instructor';
    }
    if (userCerts.some(cert => cert.cert_type === 'basic-instructor')) {
        return 'basic-instructor';
    }
    return null;
}

function canUserInstruct(userCerts, certType) {
    const instructorLevel = getInstructorLevel(userCerts);
    if (!instructorLevel) return false;

    const certInfo = getCertificationInfo(certType);
    if (!certInfo) return false;

    // Senior instructors can teach everything
    if (instructorLevel === 'senior-instructor') return true;

    // Basic instructors can teach basic and intermediate
    if (instructorLevel === 'basic-instructor') {
        return certInfo.difficulty !== 'advanced';
    }

    return false;
}

module.exports = {
    CERTIFICATIONS,
    CERT_LEVELS,
    SESSION_TYPES,
    COMPETITION_TYPES,
    getAllCertifications,
    getCertificationInfo,
    canAwardCertification,
    getInstructorLevel,
    canUserInstruct
};