// Comprehensive exam question database for all certifications

const examQuestions = {
    'F-22': [
        {
            question: "What is the maximum speed of the F-22 Raptor?",
            options: ["Mach 1.5", "Mach 2.25", "Mach 3.0", "Mach 1.8"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The F-22's stealth technology primarily works against which detection method?",
            options: ["Visual", "Radar", "Infrared", "Audio"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "What does 'supercruise' mean in relation to the F-22?",
            options: ["Flying at very high altitude", "Supersonic flight without afterburner", "Advanced autopilot", "Stealth mode"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "How many engines does the F-22 have?",
            options: ["One", "Two", "Three", "Four"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "What is the F-22's primary mission role?",
            options: ["Ground attack", "Air superiority", "Transport", "Reconnaissance"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The F-22's thrust vectoring provides enhanced:",
            options: ["Fuel efficiency", "Stealth capability", "Maneuverability", "Speed"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "What type of radar does the F-22 use?",
            options: ["Passive array", "Active electronically scanned array", "Mechanical scanning", "Doppler only"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-22 can carry how many AIM-120 missiles internally?",
            options: ["Four", "Six", "Eight", "Ten"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "What is the F-22's service ceiling?",
            options: ["50,000 ft", "60,000 ft", "65,000 ft", "70,000 ft"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "The F-22's first flight was in which year?",
            options: ["1995", "1997", "1999", "2001"],
            correct: 1,
            difficulty: "hard"
        }
    ],

    'F-16': [
        {
            question: "The F-16 is commonly known as the:",
            options: ["Eagle", "Falcon", "Raptor", "Hornet"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The F-16 has how many engines?",
            options: ["One", "Two", "Three", "Four"],
            correct: 0,
            difficulty: "easy"
        },
        {
            question: "What type of air intake does the F-16 use?",
            options: ["Side-mounted", "Dorsal", "Ventral", "Twin"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "The F-16's fly-by-wire system provides:",
            options: ["Better fuel economy", "Enhanced stability", "Stealth capability", "Longer range"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "What is the F-16's maximum G-force rating?",
            options: ["7G", "9G", "11G", "13G"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-16's bubble canopy provides:",
            options: ["Better aerodynamics", "360-degree visibility", "Stealth features", "Weather protection"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "What does the F-16's HUD display?",
            options: ["Entertainment", "Flight and weapon information", "Weather only", "Navigation only"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The F-16 can carry external fuel tanks on how many pylons?",
            options: ["Seven", "Nine", "Eleven", "Thirteen"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-16's maximum speed is approximately:",
            options: ["Mach 1.5", "Mach 2.0", "Mach 2.5", "Mach 3.0"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-16 first entered service in which year?",
            options: ["1976", "1978", "1980", "1982"],
            correct: 1,
            difficulty: "hard"
        }
    ],

    'F-35': [
        {
            question: "The F-35 Lightning II comes in how many variants?",
            options: ["Two", "Three", "Four", "Five"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "Which F-35 variant has VTOL capability?",
            options: ["F-35A", "F-35B", "F-35C", "All variants"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-35's helmet-mounted display system is called:",
            options: ["JHMCS", "HMDS", "HUD-X", "VisionPro"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "What does the F-35's DAS system provide?",
            options: ["Navigation", "360-degree infrared coverage", "Communications", "Fuel management"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-35 is primarily a:",
            options: ["Air superiority fighter", "Multirole fighter", "Bomber", "Transport"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The F-35's internal weapons bay can carry:",
            options: ["2 missiles", "4 missiles", "6 missiles", "8 missiles"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "Which country leads the F-35 program?",
            options: ["United Kingdom", "United States", "Canada", "Australia"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The F-35's maximum speed is approximately:",
            options: ["Mach 1.2", "Mach 1.6", "Mach 2.0", "Mach 2.5"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-35's EOTS system provides:",
            options: ["Electronic warfare", "Targeting and navigation", "Communications", "Engine monitoring"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The F-35 program began development in which decade?",
            options: ["1980s", "1990s", "2000s", "2010s"],
            correct: 1,
            difficulty: "hard"
        }
    ],

    'A-10': [
        {
            question: "The A-10 is commonly known as the:",
            options: ["Warthog", "Thunderbolt", "Both A and B", "Lightning"],
            correct: 2,
            difficulty: "easy"
        },
        {
            question: "The A-10's primary weapon is the:",
            options: ["M61 Vulcan", "GAU-8 Avenger", "M134 Minigun", "GAU-12 Equalizer"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "How many rounds can the A-10's main gun hold?",
            options: ["1,000", "1,174", "1,350", "1,500"],
            correct: 1,
            difficulty: "hard"
        },
        {
            question: "The A-10 is designed primarily for:",
            options: ["Air-to-air combat", "Close air support", "Strategic bombing", "Reconnaissance"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The A-10's engines are mounted:",
            options: ["Under the wings", "In the fuselage", "Above the wings", "On the wingtips"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "What type of landing gear does the A-10 have?",
            options: ["Tricycle", "Taildragger", "Skids", "Pontoons"],
            correct: 0,
            difficulty: "easy"
        },
        {
            question: "The A-10 can carry external ordnance on how many pylons?",
            options: ["Eight", "Ten", "Eleven", "Twelve"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "The A-10's titanium bathtub protects the:",
            options: ["Engines", "Fuel tanks", "Pilot", "Avionics"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "The A-10's maximum speed is approximately:",
            options: ["420 mph", "518 mph", "650 mph", "750 mph"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The A-10 first flew in which year?",
            options: ["1972", "1975", "1978", "1981"],
            correct: 0,
            difficulty: "hard"
        }
    ],

    'KC-135': [
        {
            question: "The KC-135 is primarily used for:",
            options: ["Transport", "Aerial refueling", "Reconnaissance", "Combat"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The KC-135 is based on which civilian aircraft?",
            options: ["Boeing 707", "Boeing 727", "Boeing 737", "Boeing 747"],
            correct: 0,
            difficulty: "medium"
        },
        {
            question: "How many engines does the KC-135 have?",
            options: ["Two", "Three", "Four", "Six"],
            correct: 2,
            difficulty: "easy"
        },
        {
            question: "The KC-135's refueling system uses a:",
            options: ["Probe and drogue", "Flying boom", "Hose system", "Gravity feed"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The KC-135 can carry approximately how much fuel?",
            options: ["150,000 lbs", "200,000 lbs", "250,000 lbs", "300,000 lbs"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The KC-135 first entered service in which year?",
            options: ["1955", "1957", "1959", "1961"],
            correct: 1,
            difficulty: "hard"
        },
        {
            question: "The KC-135's boom operator position is located:",
            options: ["In the cockpit", "In the cargo area", "At the rear of the aircraft", "On the wings"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "What is the KC-135's maximum altitude?",
            options: ["35,000 ft", "40,000 ft", "50,000 ft", "55,000 ft"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "The KC-135 can also be configured for:",
            options: ["Passenger transport", "Cargo transport", "Medical evacuation", "All of the above"],
            correct: 3,
            difficulty: "medium"
        },
        {
            question: "The KC-135's wingspan is approximately:",
            options: ["130 feet", "145 feet", "160 feet", "175 feet"],
            correct: 1,
            difficulty: "hard"
        }
    ],

    'C-130': [
        {
            question: "The C-130 Hercules is manufactured by:",
            options: ["Boeing", "Lockheed Martin", "Northrop Grumman", "General Dynamics"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The C-130 has how many engines?",
            options: ["Two", "Four", "Six", "Eight"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "What type of engines does the C-130 use?",
            options: ["Jet", "Turboprop", "Piston", "Rocket"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The C-130 is primarily designed for:",
            options: ["Air superiority", "Transport", "Bombing", "Reconnaissance"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "The C-130 can operate from:",
            options: ["Paved runways only", "Aircraft carriers", "Unprepared airstrips", "Water only"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "The C-130's cargo ramp is located at the:",
            options: ["Front", "Side", "Rear", "Top"],
            correct: 2,
            difficulty: "easy"
        },
        {
            question: "The C-130 can carry approximately how many troops?",
            options: ["64", "92", "128", "156"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The C-130 first flew in which year?",
            options: ["1952", "1954", "1956", "1958"],
            correct: 1,
            difficulty: "hard"
        },
        {
            question: "The C-130's maximum payload is approximately:",
            options: ["35,000 lbs", "42,000 lbs", "50,000 lbs", "60,000 lbs"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The C-130 has been in continuous production for over:",
            options: ["50 years", "60 years", "70 years", "80 years"],
            correct: 2,
            difficulty: "medium"
        }
    ],

    'flight-lead': [
        {
            question: "As a flight lead, your primary responsibility is:",
            options: ["Personal performance", "Formation safety", "Mission completion", "All of the above"],
            correct: 3,
            difficulty: "medium"
        },
        {
            question: "Before takeoff, a flight lead must:",
            options: ["Check weather only", "Brief all flight members", "Test communications", "Both B and C"],
            correct: 3,
            difficulty: "medium"
        },
        {
            question: "In a 4-ship formation, the standard positions are:",
            options: ["Lead, 2, 3, 4", "Alpha, Bravo, Charlie, Delta", "1, 2, 3, 4", "Lead, Wing, Element, Spare"],
            correct: 0,
            difficulty: "medium"
        },
        {
            question: "When should a flight lead abort a mission?",
            options: ["Weather below minimums", "Aircraft malfunction", "Threat level too high", "All of the above"],
            correct: 3,
            difficulty: "easy"
        },
        {
            question: "Radio communication as flight lead should be:",
            options: ["Frequent and detailed", "Clear and concise", "Loud and fast", "Minimal"],
            correct: 1,
            difficulty: "medium"
        }
    ],

    'mission-commander': [
        {
            question: "A mission commander's authority extends to:",
            options: ["Single aircraft", "Flight of aircraft", "Entire mission package", "Ground crew only"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "Mission planning responsibilities include:",
            options: ["Weather analysis", "Threat assessment", "Resource allocation", "All of the above"],
            correct: 3,
            difficulty: "medium"
        },
        {
            question: "When should a mission commander call off a mission?",
            options: ["Never", "Only if ordered", "When safety is compromised", "Only for weather"],
            correct: 2,
            difficulty: "easy"
        },
        {
            question: "Mission debrief should cover:",
            options: ["Successes only", "Failures only", "Both successes and failures", "Weather conditions only"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "A mission commander must coordinate with:",
            options: ["Air traffic control", "Ground forces", "Intelligence", "All of the above"],
            correct: 3,
            difficulty: "medium"
        }
    ],

    'atc': [
        {
            question: "ATC primary responsibility is:",
            options: ["Aircraft maintenance", "Air traffic separation", "Weather reporting", "Fuel management"],
            correct: 1,
            difficulty: "easy"
        },
        {
            question: "Standard separation between aircraft is:",
            options: ["1 mile", "3 miles", "5 miles", "10 miles"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "Emergency frequency is:",
            options: ["121.5 MHz", "243.0 MHz", "Both A and B", "Neither A nor B"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "When an aircraft declares emergency, ATC should:",
            options: ["Continue normal operations", "Clear all traffic", "Provide assistance", "Call supervisor"],
            correct: 2,
            difficulty: "easy"
        },
        {
            question: "Tower frequency is typically in which band?",
            options: ["HF", "VHF", "UHF", "SHF"],
            correct: 1,
            difficulty: "medium"
        }
    ],

    'ground-crew': [
        {
            question: "Pre-flight inspection should check:",
            options: ["External damage", "Fluid leaks", "Tire condition", "All of the above"],
            correct: 3,
            difficulty: "easy"
        },
        {
            question: "When marshalling an aircraft, always:",
            options: ["Stand behind the aircraft", "Maintain eye contact with pilot", "Use hand signals only", "Work alone"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "Ground safety equipment includes:",
            options: ["Chocks", "Fire extinguisher", "Communication gear", "All of the above"],
            correct: 3,
            difficulty: "easy"
        },
        {
            question: "FOD stands for:",
            options: ["Flight Operations Department", "Foreign Object Debris", "Fuel Operations Director", "Formation Of Duty"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "When should ground crew approach an aircraft?",
            options: ["Immediately after landing", "After engines stop", "When cleared by pilot", "Both B and C"],
            correct: 3,
            difficulty: "medium"
        }
    ],

    'formation-flying': [
        {
            question: "Safe formation flying requires:",
            options: ["Constant communication", "Proper positioning", "Situational awareness", "All of the above"],
            correct: 3,
            difficulty: "medium"
        },
        {
            question: "Standard formation positions are measured in:",
            options: ["Feet", "Meters", "Wingspans", "Miles"],
            correct: 2,
            difficulty: "medium"
        },
        {
            question: "In fingertip formation, aircraft are spaced:",
            options: ["3 feet apart", "1 wingspan apart", "100 feet apart", "As close as possible"],
            correct: 1,
            difficulty: "medium"
        },
        {
            question: "The safest way to join formation is:",
            options: ["From below", "From above", "From the side", "From behind"],
            correct: 0,
            difficulty: "medium"
        },
        {
            question: "Formation flying is most dangerous during:",
            options: ["Cruise flight", "Takeoff and landing", "Turns", "Level flight"],
            correct: 1,
            difficulty: "medium"
        }
    ]
};

// Function to get random questions for an exam
function getExamQuestions(certType, numQuestions = 10) {
    const questions = examQuestions[certType];
    if (!questions) {
        return [];
    }

    // Shuffle questions and take the requested number
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(numQuestions, questions.length));
}

// Function to check if certification has exam questions
function hasExamQuestions(certType) {
    return examQuestions.hasOwnProperty(certType) && examQuestions[certType].length > 0;
}

// Get all available certification types with exams
function getAvailableCertTypes() {
    return Object.keys(examQuestions);
}

module.exports = {
    examQuestions,
    getExamQuestions,
    hasExamQuestions,
    getAvailableCertTypes
};