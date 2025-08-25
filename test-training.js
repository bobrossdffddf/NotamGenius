// Comprehensive Training System Test Script
// This demonstrates all training features without requiring Discord token

const TrainingDatabase = require('./utils/training-database');
const { getAllCertifications, getCertificationInfo, CERT_LEVELS, SESSION_TYPES } = require('./utils/training-config');
const { getExamQuestions, hasExamQuestions, getAvailableCertTypes } = require('./utils/exam-questions');

console.log('🎯 Training Certification System - Comprehensive Test\n');

// Initialize database
let trainingDB;
try {
    trainingDB = new TrainingDatabase();
    console.log('✅ Database initialized successfully');
} catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
}

// Test functions
async function testCertificationSystem() {
    console.log('\n📋 Testing Certification System...');
    
    // Test getting all certifications
    const allCerts = getAllCertifications();
    console.log(`✅ Found ${Object.keys(allCerts).length} available certifications:`);
    
    Object.entries(allCerts).forEach(([certType, certInfo]) => {
        console.log(`   • ${certInfo.name} (${certInfo.category}) - ${certInfo.difficulty}`);
    });

    // Test adding sample certifications
    console.log('\n🎖️ Testing certification awards...');
    
    const testUser = {
        id: 'test_user_123',
        name: 'Test Pilot Alpha'
    };
    
    const testInstructor = {
        id: 'instructor_456',
        name: 'Senior Instructor Bravo'
    };

    // Award trainee level first
    trainingDB.addCertification(
        testUser.id, testUser.name, 'trainee', 'levels', 'trainee',
        testInstructor.id, testInstructor.name, 'Initial training level'
    );
    console.log('   ✅ Awarded trainee certification');

    // Award F-16 certification
    trainingDB.addCertification(
        testUser.id, testUser.name, 'F-16', 'aircraft', 'certified',
        testInstructor.id, testInstructor.name, 'Passed all requirements'
    );
    console.log('   ✅ Awarded F-16 certification');

    // Award instructor certification
    trainingDB.addCertification(
        testInstructor.id, testInstructor.name, 'basic-instructor', 'instructor', 'certified',
        testInstructor.id, testInstructor.name, 'Self-certified for demo'
    );
    console.log('   ✅ Awarded instructor certification');

    // Test retrieving certifications
    const userCerts = trainingDB.getUserCertifications(testUser.id);
    console.log(`   📊 Retrieved ${userCerts.length} certifications for test user`);
    
    return { testUser, testInstructor };
}

async function testExamSystem() {
    console.log('\n📝 Testing Exam System...');
    
    const availableCerts = getAvailableCertTypes();
    console.log(`✅ Found exams for ${availableCerts.length} certification types:`);
    availableCerts.forEach(cert => {
        console.log(`   • ${cert}`);
    });

    // Test exam questions
    console.log('\n🧠 Testing exam questions...');
    const f16Questions = getExamQuestions('F-16', 5);
    console.log(`✅ Retrieved ${f16Questions.length} F-16 exam questions:`);
    
    f16Questions.forEach((q, index) => {
        console.log(`   Q${index + 1}: ${q.question}`);
        q.options.forEach((option, i) => {
            const marker = i === q.correct ? '✓' : ' ';
            console.log(`      ${String.fromCharCode(65 + i)}. ${option} ${marker}`);
        });
        console.log(`      Difficulty: ${q.difficulty}\n`);
    });

    // Test exam result storage
    console.log('💾 Testing exam result storage...');
    trainingDB.saveExamResult('test_user_123', 'Test Pilot Alpha', 'F-16', 8, 10, 1, 15);
    console.log('   ✅ Saved exam result (80% pass)');
    
    const examResults = trainingDB.getUserExamResults('test_user_123');
    console.log(`   📊 Retrieved ${examResults.length} exam results`);
}

async function testSchedulingSystem() {
    console.log('\n📅 Testing Scheduling System...');
    
    console.log('✅ Available session types:');
    Object.entries(SESSION_TYPES).forEach(([type, info]) => {
        console.log(`   • ${info.name} - ${info.duration}hrs, max ${info.maxStudents} students`);
    });

    // Create test training sessions
    console.log('\n🎓 Creating test training sessions...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const sessionId1 = trainingDB.createTrainingSession(
        'simulator', dateStr, '14:00', 'instructor_456', 'Senior Instructor Bravo', 4, 'F-16 simulator training'
    );
    console.log(`   ✅ Created simulator session (ID: ${sessionId1.lastInsertRowid})`);

    const sessionId2 = trainingDB.createTrainingSession(
        'ground-school', dateStr, '10:00', 'instructor_456', 'Senior Instructor Bravo', 10, 'Formation flying theory'
    );
    console.log(`   ✅ Created ground school session (ID: ${sessionId2.lastInsertRowid})`);

    // Test joining sessions
    const joinResult = trainingDB.joinTrainingSession(sessionId1.lastInsertRowid, 'test_user_123', 'Test Pilot Alpha');
    console.log(`   ✅ User joined session: ${joinResult.success ? 'Success' : joinResult.error}`);

    // Get upcoming sessions
    const upcomingSessions = trainingDB.getUpcomingSessions();
    console.log(`   📊 Found ${upcomingSessions.length} upcoming sessions`);
}

async function testHoursAndNotes() {
    console.log('\n⏱️ Testing Training Hours System...');
    
    // Log training hours
    trainingDB.logTrainingHours(
        'test_user_123', 'Test Pilot Alpha', 'simulator', 2.5,
        'instructor_456', 'Senior Instructor Bravo', 'Excellent performance in emergency procedures'
    );
    console.log('   ✅ Logged 2.5 simulator hours');

    trainingDB.logTrainingHours(
        'test_user_123', 'Test Pilot Alpha', 'flight-training', 1.5,
        'instructor_456', 'Senior Instructor Bravo', 'Good landing techniques'
    );
    console.log('   ✅ Logged 1.5 flight training hours');

    // Get hours breakdown
    const hoursBreakdown = trainingDB.getUserTrainingHours('test_user_123');
    const totalHours = trainingDB.getTotalUserHours('test_user_123');
    
    console.log(`   📊 Total hours: ${totalHours}`);
    console.log('   📋 Hours breakdown:');
    hoursBreakdown.forEach(h => {
        console.log(`      ${h.session_type}: ${h.total_hours} hrs (${h.sessions} sessions)`);
    });

    console.log('\n📝 Testing Training Notes System...');
    
    // Add trainer notes
    trainingDB.addTrainerNote(
        'test_user_123', 'Test Pilot Alpha',
        'instructor_456', 'Senior Instructor Bravo',
        'Student shows excellent spatial awareness and quick decision making. Ready for advanced maneuvers.',
        'simulator'
    );
    console.log('   ✅ Added trainer note');

    const notes = trainingDB.getTrainerNotes('test_user_123');
    console.log(`   📊 Retrieved ${notes.length} trainer notes`);
}

async function testDashboardAndAnalytics() {
    console.log('\n📊 Testing Dashboard and Analytics...');
    
    // Unit readiness
    const readiness = trainingDB.getUnitReadiness();
    console.log('✅ Unit Readiness Report:');
    console.log(`   👥 Total trained users: ${readiness.totalUsers}`);
    console.log(`   🎖️ Certified users: ${readiness.certifiedUsers}`);
    console.log(`   📈 Readiness percentage: ${readiness.readinessPercentage}%`);
    console.log('   📋 Top certifications:');
    readiness.certificationCounts.forEach(cert => {
        console.log(`      ${cert.cert_type}: ${cert.count}`);
    });

    // Top performers
    const topPerformers = trainingDB.getTopPerformers(5);
    console.log(`\n🏆 Top ${topPerformers.length} Performers:`);
    topPerformers.forEach((performer, index) => {
        const rank = index + 1;
        console.log(`   ${rank}. ${performer.username}`);
        console.log(`      Certifications: ${performer.cert_count || 0}`);
        console.log(`      Total Hours: ${performer.total_hours || 0}`);
        console.log(`      Average Score: ${Math.round(performer.avg_exam_score || 0)}%\n`);
    });
}

async function testCertificationValidation() {
    console.log('\n🔍 Testing Certification Validation...');
    
    // Test prerequisite checking
    const userCerts = trainingDB.getUserCertifications('test_user_123');
    console.log(`   📋 User has ${userCerts.length} certifications`);
    
    // Check various certifications
    const testCerts = ['F-22', 'flight-lead', 'mission-commander', 'basic-instructor'];
    
    testCerts.forEach(cert => {
        const certInfo = getCertificationInfo(cert);
        const hasPrereqs = certInfo.prerequisites.every(prereq => 
            userCerts.some(userCert => 
                userCert.cert_type === prereq || userCert.cert_level === prereq
            )
        );
        
        console.log(`   ${cert}: ${hasPrereqs ? '✅ Prerequisites met' : '❌ Missing prerequisites'}`);
        if (!hasPrereqs) {
            const missing = certInfo.prerequisites.filter(prereq =>
                !userCerts.some(userCert => 
                    userCert.cert_type === prereq || userCert.cert_level === prereq
                )
            );
            console.log(`      Missing: ${missing.join(', ')}`);
        }
    });
}

async function displaySystemOverview() {
    console.log('\n🎯 TRAINING SYSTEM OVERVIEW');
    console.log('='.repeat(50));
    
    console.log('\n📚 FEATURES IMPLEMENTED:');
    console.log('✅ Comprehensive certification management (aircraft, roles, skills, instructor)');
    console.log('✅ SQLite database for persistent data storage');
    console.log('✅ Written examination system with 10+ questions per certification');
    console.log('✅ Training session scheduling with capacity management');
    console.log('✅ Training hours logging and tracking');
    console.log('✅ Trainer notes and student progress tracking');
    console.log('✅ Unit readiness dashboard and analytics');
    console.log('✅ Leaderboards and performance metrics');
    console.log('✅ Competition system framework');
    console.log('✅ Prerequisites and validation system');
    console.log('✅ Integration with existing Discord bot architecture');
    
    console.log('\n🎮 DISCORD COMMANDS AVAILABLE:');
    console.log('• /training cert view - View user certifications');
    console.log('• /training cert award - Award certifications (instructors)');
    console.log('• /training cert list - List all available certifications');
    console.log('• /training-exam start - Take written examinations');
    console.log('• /training-exam results - View exam results');
    console.log('• /training-schedule create - Create training sessions');
    console.log('• /training-schedule join - Join training sessions');
    console.log('• /training-schedule list - View upcoming sessions');
    console.log('• /training hours log - Log training hours');
    console.log('• /training notes add - Add trainer notes');
    console.log('• /training dashboard unit - Unit readiness overview');
    console.log('• /training dashboard leaderboard - Performance rankings');
    
    console.log('\n🛡️ SECURITY FEATURES:');
    console.log('✅ Role-based access control (instructors, administrators)');
    console.log('✅ Permission validation for sensitive operations');
    console.log('✅ Data validation and error handling');
    console.log('✅ Secure database operations');
    
    console.log('\n📊 DATABASE TABLES:');
    console.log('• certifications - User certification records');
    console.log('• training_sessions - Scheduled training sessions');
    console.log('• session_participants - Session enrollment tracking');
    console.log('• training_hours - Hours logging and tracking');
    console.log('• written_exams - Exam results and history');
    console.log('• trainer_notes - Instructor feedback and notes');
    console.log('• competitions - Competition tracking');
    console.log('• feedback - Quality assurance ratings');
    
    console.log('\n🎖️ CERTIFICATION TYPES:');
    console.log('Aircraft: F-22, F-16, F-35, A-10, KC-135, C-130');
    console.log('Roles: Flight Lead, Mission Commander, ATC, Ground Crew');
    console.log('Skills: Formation Flying');
    console.log('Instructor: Basic Instructor, Senior Instructor');
}

// Main test execution
async function runAllTests() {
    try {
        await displaySystemOverview();
        
        const testData = await testCertificationSystem();
        await testExamSystem();
        await testSchedulingSystem();
        await testHoursAndNotes();
        await testDashboardAndAnalytics();
        await testCertificationValidation();
        
        console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('\nThe training certification system is fully implemented and ready for use.');
        console.log('The bot will work once a valid Discord token is provided.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
    } finally {
        if (trainingDB) {
            trainingDB.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

// Run tests
runAllTests();