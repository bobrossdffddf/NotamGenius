const Database = require('better-sqlite3');
const path = require('path');

class TrainingDatabase {
    constructor() {
        // Create database in the data directory
        const dbPath = path.join(__dirname, '../data/training_data.db');
        this.db = new Database(dbPath);
        this.initializeTables();
        console.log('✅ Training database initialized');
    }

    initializeTables() {
        // Create all necessary tables
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS certifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                cert_type TEXT NOT NULL,
                cert_category TEXT NOT NULL,
                cert_level TEXT NOT NULL,
                date_earned TEXT NOT NULL,
                instructor_id TEXT,
                instructor_name TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS training_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_type TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                instructor_id TEXT NOT NULL,
                instructor_name TEXT NOT NULL,
                max_students INTEGER DEFAULT 4,
                current_students INTEGER DEFAULT 0,
                status TEXT DEFAULT 'scheduled',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS session_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'registered',
                FOREIGN KEY (session_id) REFERENCES training_sessions (id)
            );

            CREATE TABLE IF NOT EXISTS training_hours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                session_type TEXT NOT NULL,
                hours REAL NOT NULL,
                date TEXT NOT NULL,
                instructor_id TEXT,
                instructor_name TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS written_exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                cert_type TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                date_taken TEXT NOT NULL,
                passed INTEGER NOT NULL,
                time_taken INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS exam_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                cert_type TEXT NOT NULL,
                question_index INTEGER NOT NULL,
                selected_answer INTEGER NOT NULL,
                correct_answer INTEGER NOT NULL,
                is_correct INTEGER NOT NULL,
                exam_session TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS trainer_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trainee_id TEXT NOT NULL,
                trainee_name TEXT NOT NULL,
                trainer_id TEXT NOT NULL,
                trainer_name TEXT NOT NULL,
                note TEXT NOT NULL,
                session_type TEXT,
                date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS waitlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                cert_type TEXT NOT NULL,
                priority INTEGER DEFAULT 0,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS instructor_availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instructor_id TEXT NOT NULL,
                instructor_name TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                specialties TEXT,
                max_sessions_per_day INTEGER DEFAULT 3,
                active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS competitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                description TEXT,
                criteria TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS competition_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competition_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                score REAL NOT NULL,
                rank INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (competition_id) REFERENCES competitions (id)
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                instructor_id TEXT,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT,
                feedback_type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    // Certification methods
    addCertification(userId, username, certType, certCategory, certLevel, instructorId, instructorName, notes = '') {
        const stmt = this.db.prepare(`
            INSERT INTO certifications (user_id, username, cert_type, cert_category, cert_level, date_earned, instructor_id, instructor_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(userId, username, certType, certCategory, certLevel, new Date().toISOString().split('T')[0], instructorId, instructorName, notes);
    }

    getUserCertifications(userId) {
        const stmt = this.db.prepare('SELECT * FROM certifications WHERE user_id = ? ORDER BY date_earned DESC');
        return stmt.all(userId);
    }

    hasCertification(userId, certType) {
        const stmt = this.db.prepare('SELECT id FROM certifications WHERE user_id = ? AND cert_type = ?');
        return stmt.get(userId, certType) !== undefined;
    }

    // Training session methods
    createTrainingSession(sessionType, date, time, instructorId, instructorName, maxStudents = 4, notes = '') {
        const stmt = this.db.prepare(`
            INSERT INTO training_sessions (session_type, date, time, instructor_id, instructor_name, max_students, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(sessionType, date, time, instructorId, instructorName, maxStudents, notes);
    }

    joinTrainingSession(sessionId, userId, username) {
        // Check if session has space
        const session = this.getTrainingSession(sessionId);
        if (!session || session.current_students >= session.max_students) {
            return { success: false, error: 'Session is full or does not exist' };
        }

        // Check if user already joined
        const existing = this.db.prepare('SELECT id FROM session_participants WHERE session_id = ? AND user_id = ?')
            .get(sessionId, userId);
        if (existing) {
            return { success: false, error: 'Already registered for this session' };
        }

        // Add participant
        const stmt = this.db.prepare(`
            INSERT INTO session_participants (session_id, user_id, username)
            VALUES (?, ?, ?)
        `);
        const result = stmt.run(sessionId, userId, username);

        // Update current student count
        this.db.prepare('UPDATE training_sessions SET current_students = current_students + 1 WHERE id = ?')
            .run(sessionId);

        return { success: true, result };
    }

    getTrainingSession(sessionId) {
        const stmt = this.db.prepare('SELECT * FROM training_sessions WHERE id = ?');
        return stmt.get(sessionId);
    }

    getUpcomingSessions() {
        const today = new Date().toISOString().split('T')[0];
        const stmt = this.db.prepare(`
            SELECT s.*, 
                   GROUP_CONCAT(p.username, ', ') as participants
            FROM training_sessions s
            LEFT JOIN session_participants p ON s.id = p.session_id
            WHERE s.date >= ?
            GROUP BY s.id
            ORDER BY s.date, s.time
        `);
        return stmt.all(today);
    }

    // Training hours methods
    logTrainingHours(userId, username, sessionType, hours, instructorId, instructorName, notes = '') {
        const stmt = this.db.prepare(`
            INSERT INTO training_hours (user_id, username, session_type, hours, date, instructor_id, instructor_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(userId, username, sessionType, hours, new Date().toISOString().split('T')[0], instructorId, instructorName, notes);
    }

    getUserTrainingHours(userId) {
        const stmt = this.db.prepare(`
            SELECT session_type, SUM(hours) as total_hours, COUNT(*) as sessions
            FROM training_hours 
            WHERE user_id = ? 
            GROUP BY session_type
        `);
        return stmt.all(userId);
    }

    getTotalUserHours(userId) {
        const stmt = this.db.prepare('SELECT SUM(hours) as total FROM training_hours WHERE user_id = ?');
        const result = stmt.get(userId);
        return result ? result.total || 0 : 0;
    }

    // Exam methods
    saveExamResult(userId, username, certType, score, totalQuestions, passed, timeTaken) {
        const stmt = this.db.prepare(`
            INSERT INTO written_exams (user_id, username, cert_type, score, total_questions, date_taken, passed, time_taken)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(userId, username, certType, score, totalQuestions, new Date().toISOString().split('T')[0], passed, timeTaken);
    }

    getUserExamResults(userId, certType = null) {
        let query = 'SELECT * FROM written_exams WHERE user_id = ?';
        let params = [userId];
        
        if (certType) {
            query += ' AND cert_type = ?';
            params.push(certType);
        }
        
        query += ' ORDER BY date_taken DESC';
        
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    hasPassedExam(userId, certType) {
        const stmt = this.db.prepare('SELECT id FROM written_exams WHERE user_id = ? AND cert_type = ? AND passed = 1');
        return stmt.get(userId, certType) !== undefined;
    }

    // Trainer notes methods
    addTrainerNote(traineeId, traineeName, trainerId, trainerName, note, sessionType = null) {
        const stmt = this.db.prepare(`
            INSERT INTO trainer_notes (trainee_id, trainee_name, trainer_id, trainer_name, note, session_type, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(traineeId, traineeName, trainerId, trainerName, note, sessionType, new Date().toISOString().split('T')[0]);
    }

    getTrainerNotes(traineeId) {
        const stmt = this.db.prepare('SELECT * FROM trainer_notes WHERE trainee_id = ? ORDER BY created_at DESC');
        return stmt.all(traineeId);
    }

    // Dashboard methods
    getUnitReadiness() {
        const totalUsers = this.db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM certifications').get().count;
        const certifiedUsers = this.db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM certifications WHERE cert_level = ?').get('certified').count;
        
        const certificationCounts = this.db.prepare(`
            SELECT cert_type, COUNT(*) as count 
            FROM certifications 
            GROUP BY cert_type 
            ORDER BY count DESC
        `).all();

        return {
            totalUsers,
            certifiedUsers,
            readinessPercentage: totalUsers > 0 ? Math.round((certifiedUsers / totalUsers) * 100) : 0,
            certificationCounts
        };
    }

    getTopPerformers(limit = 10) {
        const stmt = this.db.prepare(`
            SELECT 
                h.user_id,
                h.username,
                COUNT(DISTINCT c.cert_type) as cert_count,
                SUM(h.hours) as total_hours,
                AVG(e.score) as avg_exam_score
            FROM training_hours h
            LEFT JOIN certifications c ON h.user_id = c.user_id
            LEFT JOIN written_exams e ON h.user_id = e.user_id
            GROUP BY h.user_id, h.username
            ORDER BY cert_count DESC, total_hours DESC
            LIMIT ?
        `);
        return stmt.all(limit);
    }

    // Close database connection
    close() {
        this.db.close();
    }
}

module.exports = TrainingDatabase;