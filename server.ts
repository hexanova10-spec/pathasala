import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Pool, type PoolClient } from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.disable('x-powered-by');
const STORE_FILE = path.resolve(__dirname, process.env.PATHASHALA_DATA_FILE || '.pathashala-data.json');
const configuredAuthSecret = process.env.PATHASHALA_AUTH_SECRET || process.env.JWT_SECRET;
const AUTH_SECRET = configuredAuthSecret || randomBytes(32).toString('hex');
if (!configuredAuthSecret) {
  console.warn('PATHASHALA_AUTH_SECRET is not configured. Login tokens will be invalidated whenever this server restarts.');
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(storedPassword: unknown, suppliedPassword: string): boolean {
  if (typeof storedPassword !== 'string') return false;
  if (!storedPassword.startsWith('scrypt$')) return storedPassword === suppliedPassword;
  const [, salt, expectedHex] = storedPassword.split('$');
  if (!salt || !expectedHex || !/^[a-f0-9]+$/i.test(expectedHex)) return false;
  const actual = scryptSync(suppliedPassword, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function createAccessToken(user: { id: string; role: string }): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ sub: user.id, role: user.role, iat: now, exp: now + 8 * 60 * 60 });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', AUTH_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

// Initialize Google GenAI SDK if API key is present
const configuredApiKey = process.env.GEMINI_API_KEY?.trim();
const apiKey = configuredApiKey && !/^(MY_GEMINI_API_KEY|YOUR_GEMINI_API_KEY|replace[-_ ]?me|placeholder)$/i.test(configuredApiKey) ? configuredApiKey : '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log('Gemini API client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// ==========================================
// SEEDED BACKEND DATA STORE FOR PROTOTYPE (persisted to a local JSON file)
// ==========================================

const db: {
  users: any[];
  homework: any[];
  submissions: any[];
  cameraAlerts: any[];
  focusEvents: any[];
  studentReports: any[];
  parentReports: any[];
  activities: any[];
  notifications: any[];
  recordings: any[];
} = {
  users: [
    {
      id: 'STU-2026-1082',
      name: 'Subhashree Nayak',
      email: 'subha@pathashala.edu',
      role: 'student',
      school: 'Bhubaneswar Government High School, Unit-1',
      identifier: 'BSE-2026-OD-8819',
      assignedClasses: [10, 9], // STRICT TWO-CLASS LIMIT
      preferredLanguage: 'Odia',
      password: 'password123'
    },
    {
      id: 'TCH-504',
      name: 'Smt. Priya Sharma',
      email: 'priya.sharma@pathashala.edu',
      role: 'teacher',
      school: 'Bhubaneswar Government High School, Unit-1',
      identifier: 'TCH-BSE-9811',
      teachingClasses: [10, 9, 8],
      teachingSubjects: ['Physics', 'General Science', 'Mathematics'],
      preferredLanguage: 'English',
      password: 'password123'
    },
    {
      id: 'PAR-912',
      name: 'Ananya Nayak',
      email: 'ananya.nayak@pathashala.edu',
      role: 'parent',
      linkedStudentIds: ['STU-2026-1082'],
      preferredLanguage: 'Odia',
      password: 'password123'
    }
  ],
  homework: [
    {
      id: 'HW-101',
      title: "Ohm's Law Circuit Diagram & V-I Graph Numerical",
      classNum: 10,
      subject: 'Physics',
      teacherId: 'TCH-504',
      teacherName: 'Smt. Priya Sharma',
      instructions: 'Draw circuit diagram and calculate resistance for 6V battery with 2.5mA current.',
      issueDate: '2026-10-10',
      dueDate: '2026-10-16',
      maxMarks: 20,
      submissionType: 'both',
      totalAssigned: 38,
      submittedCount: 31
    },
    {
      id: 'HW-102',
      title: 'Quadratic Equations: Finding Real Roots by Factorisation',
      classNum: 10,
      subject: 'Mathematics',
      teacherId: 'TCH-504',
      teacherName: 'Smt. Priya Sharma',
      instructions: 'Solve Exercises 4.2 Q1, Q3, Q5 and state discriminant nature of roots.',
      issueDate: '2026-10-12',
      dueDate: '2026-10-18',
      maxMarks: 25,
      submissionType: 'text',
      totalAssigned: 38,
      submittedCount: 22
    }
  ],
  submissions: [
    {
      id: 'SUB-01',
      assignmentId: 'HW-101',
      studentId: 'STU-2026-1082',
      studentName: 'Subhashree Nayak',
      classNum: 10,
      subject: 'Physics',
      submittedAt: '2026-10-13 18:45',
      status: 'Completed',
      textAnswer: 'V = I * R => R = 6V / (2.5e-3) = 2400 Ohms = 2.4 kΩ.',
      fileName: 'ohms_law_circuit.pdf',
      marksAwarded: 19,
      maxMarks: 20,
      teacherFeedback: 'Excellent work Subhashree! Accurate SI unit conversion.'
    }
  ],
  focusEvents: [],
  cameraAlerts: [
    {
      id: 'CAM-ALT-01',
      sessionId: 'SES-901',
      sessionTitle: 'Deep Focus: Electric Circuits & Numerical Mastery',
      studentId: 'STU-2026-1082',
      studentName: 'Subhashree Nayak',
      classNum: 10,
      timestamp: '2026-10-13 10:14 AM',
      durationSeconds: 32,
      confidence: 0.89,
      message: 'Possible camera absence detected during the learning session. Teacher review required.',
      status: 'verified_break',
      teacherNotes: 'Retrieved textbook and geometry set from shelf.',
      reviewedAt: '2026-10-13 11:30 AM'
    },
    {
      id: 'CAM-ALT-02',
      sessionId: 'SES-904',
      sessionTitle: 'Mathematics Chapter 4 Quadratic Formula Focus',
      studentId: 'STU-2026-1082',
      studentName: 'Subhashree Nayak',
      classNum: 10,
      timestamp: '2026-10-14 09:22 AM',
      durationSeconds: 18,
      confidence: 0.74,
      message: 'Possible camera absence detected during the learning session. Teacher review required.',
      status: 'awaiting_review'
    }
  ],
  studentReports: [
    {
      id: 'REP-10-OCT26',
      studentId: 'STU-2026-1082',
      studentName: 'Subhashree Nayak',
      classNum: 10,
      assignedClasses: [10, 9],
      subject: 'All Subjects (BSE Matriculation Stream)',
      reportingPeriod: 'October 1 – October 14, 2026',
      frequency: 'weekly',
      status: 'Published',
      createdAt: '2026-10-13 14:00',
      publishedAt: '2026-10-13 16:30',
      teacherId: 'TCH-504',
      teacherName: 'Smt. Priya Sharma',
      studentDetails: {
        name: 'Subhashree Nayak',
        id: 'BSE-2026-OD-8819',
        school: 'Bhubaneswar Govt High School, Unit-1',
        board: 'Odisha State Board (BSE)'
      },
      assignedClassesInfo: [10, 9],
      lessonsCompleted: 24,
      studySessionSummary: { totalHours: 18.5, focusScorePercent: 92, sessionsCount: 16 },
      dailyActivitySummary: { daysActive: 14, averageMinutesPerDay: 78 },
      homeworkCompletionRate: 94,
      quizAccuracy: 88,
      subjectMastery: [
        { subject: 'Physics', score: 91 },
        { subject: 'Mathematics', score: 86 },
        { subject: 'Chemistry', score: 84 },
        { subject: 'Biology', score: 89 },
        { subject: 'Social Science', score: 92 },
        { subject: 'Odia Sahitya', score: 95 }
      ],
      topicsRequiringPractice: ['Refraction through Glass Prism', 'Quadratic Word Problems'],
      learningImprovementTrend: '+12% increase in problem-solving accuracy.',
      teacherComments: {
        confidentialNote: 'Attentive student; recommend past board questions.',
        releasedFeedback: 'Subhashree shows exceptional dedication and conceptual clarity.'
      },
      recommendedNextSteps: ['Practice ray optics diagrams', 'Daily 15-min focus sessions']
    }
  ],
  parentReports: [
    {
      id: 'PREP-10-OCT26',
      studentReportId: 'REP-10-OCT26',
      studentId: 'STU-2026-1082',
      studentName: 'Subhashree Nayak',
      classNum: 10,
      reportingPeriod: 'October 1 – October 14, 2026',
      publishedAt: '2026-10-13 16:30',
      teacherName: 'Smt. Priya Sharma',
      lessonsCompleted: 24,
      homeworkStatus: '3 of 3 Assigned Homework Tasks on Schedule (94% Rate)',
      quizPerformance: '88% Average Quiz Accuracy',
      subjectMastery: [
        { subject: 'Physics', score: 91 },
        { subject: 'Mathematics', score: 86 },
        { subject: 'Chemistry', score: 84 },
        { subject: 'Biology', score: 89 },
        { subject: 'Social Science', score: 92 },
        { subject: 'Odia Sahitya', score: 95 }
      ],
      topicsRequiringSupport: ['Refraction through Prism', 'Quadratic word problems'],
      positiveAchievements: ['5-day daily study streak', '19/20 on Electricity homework'],
      teacherFeedback: 'Subhashree is making admirable progress in Class 10 with bilingual explanations.',
      recommendedRevision: ['Practice 2 ray diagram exercises from Chapter 11'],
      status: 'Published'
    }
  ],
  activities: [
    {
      id: 'ACT-01',
      studentId: 'STU-2026-1082',
      studentName: 'Subhashree Nayak',
      classNum: 10,
      timestamp: '09:00 AM',
      eventType: 'login',
      title: 'Student Signed In',
      description: 'Authenticated from school device with verified credentials.',
      category: 'engagement'
    },
    {
      id: 'ACT-02',
      studentId: 'STU-2026-1082',
      studentName: 'Subhashree Nayak',
      classNum: 10,
      subject: 'Physics',
      timestamp: '09:05 AM',
      eventType: 'lesson_opened',
      title: 'Opened Physics: Electric Current & Resistance',
      description: 'Bilingual textbook reading started in Odia and English.',
      category: 'learning',
      durationMinutes: 15
    }
  ],
  recordings: [],
  notifications: [
    {
      id: 'NOTIF-S1',
      recipientRole: 'student',
      recipientId: 'STU-2026-1082',
      title: 'New Homework Assigned',
      message: 'Smt. Priya Sharma assigned: Quadratic Equations Real Roots Proof. Due Oct 18.',
      category: 'homework',
      timestamp: '1 hour ago',
      read: false,
      actionUrl: '/homework',
      actionLabel: 'View Assignment'
    },
    {
      id: 'NOTIF-T1',
      recipientRole: 'teacher',
      recipientId: 'TCH-504',
      title: 'Provisional Camera Alert',
      message: '1 provisional camera absence alert awaiting review for Class 10.',
      category: 'alert',
      timestamp: '2 hours ago',
      read: false,
      actionUrl: '/teacher/camera-alerts',
      actionLabel: 'Review Alert'
    }
  ]
};

// PostgreSQL is the shared source of truth for users, homework, submissions, and recordings.
// If DATABASE_URL is absent, the existing local JSON prototype store remains available.
const pgPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX) || 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000
    })
  : null;

type RelationalCollection = 'users' | 'homework' | 'submissions' | 'recordings';

async function upsertCollection(client: PoolClient, collection: RelationalCollection, records: any[]) {
  for (const record of records) {
    const payload = JSON.stringify(record);
    if (collection === 'users') {
      await client.query(
        'INSERT INTO users (id, email, role, payload) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, payload = EXCLUDED.payload, updated_at = now()',
        [record.id, record.email || '', record.role || 'student', payload]
      );
    } else if (collection === 'homework') {
      await client.query(
        'INSERT INTO homework (id, class_num, teacher_id, due_date, payload) VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (id) DO UPDATE SET class_num = EXCLUDED.class_num, teacher_id = EXCLUDED.teacher_id, due_date = EXCLUDED.due_date, payload = EXCLUDED.payload, updated_at = now()',
        [record.id, Number(record.classNum) || 1, record.teacherId || null, record.dueDate || null, payload]
      );
    } else if (collection === 'submissions') {
      await client.query(
        'INSERT INTO submissions (id, assignment_id, student_id, status, payload) VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (id) DO UPDATE SET assignment_id = EXCLUDED.assignment_id, student_id = EXCLUDED.student_id, status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = now()',
        [record.id, record.assignmentId || '', record.studentId || '', record.status || 'Submitted', payload]
      );
    } else {
      await client.query(
        'INSERT INTO class_recordings (id, class_num, teacher_id, payload) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (id) DO UPDATE SET class_num = EXCLUDED.class_num, teacher_id = EXCLUDED.teacher_id, payload = EXCLUDED.payload, updated_at = now()',
        [record.id, Number(record.classNum) || 1, record.teacherId || null, payload]
      );
    }
  }
}

async function persistPostgresCollections() {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await upsertCollection(client, 'users', db.users);
    await upsertCollection(client, 'homework', db.homework);
    await upsertCollection(client, 'submissions', db.submissions);
    await upsertCollection(client, 'recordings', db.recordings);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadPostgresCollections() {
  if (!pgPool) return;
  const [users, homework, submissions, recordings] = await Promise.all([
    pgPool.query('SELECT payload FROM users ORDER BY created_at ASC'),
    pgPool.query('SELECT payload FROM homework ORDER BY created_at ASC'),
    pgPool.query('SELECT payload FROM submissions ORDER BY created_at ASC'),
    pgPool.query('SELECT payload FROM class_recordings ORDER BY created_at ASC')
  ]);
  db.users = users.rows.map((row) => row.payload);
  db.homework = homework.rows.map((row) => row.payload);
  db.submissions = submissions.rows.map((row) => row.payload);
  db.recordings = recordings.rows.map((row) => row.payload);
}

async function initializePostgresStore() {
  if (!pgPool) return;
  const migrationPath = path.resolve(__dirname, 'migrations/001_initial.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await pgPool.query(migrationSql);
  await pgPool.query("INSERT INTO schema_migrations (version) VALUES ('001_initial') ON CONFLICT (version) DO NOTHING");

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const tableCounts: Record<RelationalCollection, number> = {
      users: Number((await client.query('SELECT count(*)::int AS count FROM users')).rows[0].count),
      homework: Number((await client.query('SELECT count(*)::int AS count FROM homework')).rows[0].count),
      submissions: Number((await client.query('SELECT count(*)::int AS count FROM submissions')).rows[0].count),
      recordings: Number((await client.query('SELECT count(*)::int AS count FROM class_recordings')).rows[0].count)
    };
    // Seed each table independently, and never overwrite a non-empty Neon table.
    if (tableCounts.users === 0) await upsertCollection(client, 'users', db.users);
    if (tableCounts.homework === 0) await upsertCollection(client, 'homework', db.homework);
    if (tableCounts.submissions === 0) await upsertCollection(client, 'submissions', db.submissions);
    if (tableCounts.recordings === 0) await upsertCollection(client, 'recordings', db.recordings);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  await loadPostgresCollections();

  // Migrate any legacy plain-text passwords already present in PostgreSQL.
  let changedPasswords = false;
  for (const user of db.users) {
    if (typeof user.password === 'string' && !user.password.startsWith('scrypt$')) {
      user.password = hashPassword(user.password);
      changedPasswords = true;
    }
  }
  if (changedPasswords) await persistPostgresCollections();
  console.log('Connected to PostgreSQL and loaded shared Pathashala records.');
}

// Successful mutations are committed to PostgreSQL before a success response is sent.
// Other prototype collections continue to be saved to the local JSON file.
app.use(async (req, res, next) => {
  if (pgPool && req.path !== '/api/health') {
    try {
      await loadPostgresCollections();
    } catch (error: any) {
      console.error('PostgreSQL request refresh failed:', error?.message || error);
      return res.status(503).json({ error: 'The database is temporarily unavailable. Please retry.' });
    }
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sendJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode >= 400) return sendJson(body);
    const persistThenRespond = async () => {
      if (pgPool) await persistPostgresCollections();
      try {
        fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
        fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2), { encoding: 'utf8', mode: 0o600 });
      } catch (error: any) {
        console.error('Failed to persist the local Pathashala snapshot:', error?.message || error);
        if (!pgPool) throw error;
      }
      return sendJson(body);
    };
    void persistThenRespond().catch((error: any) => {
      console.error('Failed to persist Pathashala data:', error?.message || error);
      if (!res.headersSent) {
        res.statusCode = 500;
        sendJson({ error: 'The change could not be saved. Please retry.' });
      }
    });
    return res;
  }) as typeof res.json;
  next();
});

// ==========================================
// REST APIS: HEALTH & AUTHENTICATION
// ==========================================

// Health check endpoint
app.get('/api/ai/status', (_req, res) => {
  // Never return the key or connection details; expose only safe readiness information.
  res.json({
    configured: Boolean(aiClient),
    provider: 'Google Gemini',
    model: 'gemini-3.8-flash',
    mode: aiClient ? 'live' : 'demo',
    message: aiClient
      ? 'Gemini is configured. Requests still depend on provider availability and quota.'
      : 'GEMINI_API_KEY is missing or looks like a placeholder on the backend.'
  });
});

app.get('/api/health', async (req, res) => {
  let databaseConnected = false;
  let database = 'Local JSON fallback (DATABASE_URL is not configured)';
  if (pgPool) {
    database = 'PostgreSQL';
    try {
      await pgPool.query('SELECT 1');
      databaseConnected = true;
      database = 'PostgreSQL (Neon-compatible)';
    } catch (error: any) {
      console.error('PostgreSQL health check failed:', error?.message || error);
    }
  }
  res.json({
    status: 'ok',
    hasApiKey: Boolean(aiClient),
    aiAvailable: Boolean(aiClient),
    app: 'PATHASHALA AI',
    version: '2.0.0',
    mode: aiClient ? 'Live AI (Gemini 3.8 Flash)' : 'Demo Agentic Engine',
    database,
    databaseConnected
  });
});

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { identifier, password, role } = req.body || {};
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Student ID/email and password are required' });
  }

  const user = db.users.find(
    (u) =>
      (u.email?.toLowerCase() === identifier.toLowerCase() ||
        u.identifier?.toLowerCase() === identifier.toLowerCase() ||
        u.name.toLowerCase() === identifier.toLowerCase()) &&
      (!role || u.role === role)
  );

  if (!user || !verifyPassword(user.password, password)) {
    return res.status(401).json({
      error: 'Invalid credentials. Use the password assigned to this account or a provided demo account.'
    });
  }

  // Password verification uses scrypt hashes; tokens are signed and expire after eight hours.
  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school,
      identifier: user.identifier,
      assignedClasses: user.assignedClasses || [10],
      teachingClasses: user.teachingClasses,
      linkedStudentIds: user.linkedStudentIds,
      preferredLanguage: user.preferredLanguage,
      preferredSubject: user.preferredSubject
    },
    token: createAccessToken(user)
  });
});

// Auth Register (STRICT TWO-CLASS LIMIT ENFORCED)
app.post('/api/auth/register', (req, res) => {
  const { name, email, identifier, linkedStudentId, school, assignedClasses = [], preferredLanguage, preferredSubject, role = 'student', password } = req.body || {};

  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!['student', 'teacher', 'parent'].includes(role)) return res.status(400).json({ error: 'Role must be student, teacher, or parent.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'A password of at least 8 characters is required.' });
  if (!Array.isArray(assignedClasses) || assignedClasses.some((value: unknown) => !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 12)) {
    return res.status(400).json({ error: 'assignedClasses must contain class numbers from 1 to 12.' });
  }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedEmail && db.users.some((u) => u.email?.toLowerCase() === normalizedEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });

  if (role === 'student') {
    if (assignedClasses.length > 2) {
      return res.status(400).json({
        error:
          'You can access a maximum of two assigned classes. Please contact your teacher if you need to change your class assignment.'
      });
    }
  }

  const prefix = role === 'teacher' ? 'TCH' : role === 'parent' ? 'PAR' : 'STU';
  const newId = `${prefix}-${Date.now().toString().slice(-8)}`;
  const newUser = {
    id: newId,
    name,
    email: normalizedEmail || `${name.toLowerCase().replace(/\s+/g, '')}@pathashala.edu`,
    identifier: role === 'parent' ? `PAR-2026-${Math.floor(1000 + Math.random() * 9000)}` : (identifier || `BSE-2026-${Math.floor(1000 + Math.random() * 9000)}`),
    school: school || 'Odisha Model School',
    role,
    password: hashPassword(password),
    assignedClasses: role === 'student' ? (assignedClasses.length > 0 ? assignedClasses.slice(0, 2) : [10]) : [],
    teachingClasses: role === 'teacher' ? [10] : undefined,
    linkedStudentIds: role === 'parent' ? db.users.filter((student) => student.role === 'student' && [student.id, student.identifier, student.email].some((value) => typeof linkedStudentId === 'string' && value && String(value).toLowerCase() === linkedStudentId.trim().toLowerCase())).map((student) => student.id) : undefined,
    preferredLanguage: preferredLanguage || 'Odia',
    preferredSubject: role === 'student' ? (typeof preferredSubject === 'string' && preferredSubject.trim() ? preferredSubject.trim() : 'Mathematics') : undefined
  };

  db.users.push(newUser);

  const { password: _password, ...publicUser } = newUser;
  return res.status(201).json({
    success: true,
    user: publicUser,
    message: 'Account created successfully.'
  });
});

// Strict Two-Class Limit Verification Endpoint
app.post('/api/student/classes', (req, res) => {
  const { studentId, assignedClasses } = req.body;
  if (!Array.isArray(assignedClasses)) {
    return res.status(400).json({ error: 'assignedClasses must be an array of class numbers' });
  }

  if (assignedClasses.length > 2) {
    return res.status(400).json({
      error:
        'You can access a maximum of two assigned classes. Please contact your teacher if you need to change your class assignment.'
    });
  }

  const user = db.users.find((u) => u.id === studentId && u.role === 'student');
  if (!user) return res.status(404).json({ error: 'Student account not found.' });
  user.assignedClasses = assignedClasses.slice(0, 2);

  return res.json({
    success: true,
    assignedClasses: assignedClasses.slice(0, 2),
    message: 'Classes updated successfully within the maximum two-class limit.'
  });
});

// ==========================================
// CLASS RECORDINGS (Cloudinary-hosted video files)
// ==========================================

function getAuthenticatedUser(req: any) {
  const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length !== 3) return null;
  const expected = createHmac('sha256', AUTH_SECRET).update(parts[0] + '.' + parts[1]).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return db.users.find((user) => user.id === payload.sub && user.role === payload.role) || null;
  } catch { return null; }
}

function publicStudentRecord(student: any) {
  const { password: _password, ...account } = student;
  return {
    ...account,
    profile: student.profile || null,
    classNum: student.profile?.classNum || student.assignedClasses?.[0] || 10,
    assignedClasses: student.profile?.assignedClasses || student.assignedClasses || [],
    preferredLanguage: student.profile?.tutorLanguage || student.preferredLanguage || 'Odia',
    preferredSubject: student.profile?.subjects?.[0] || student.preferredSubject || 'Mathematics'
  };
}

// Save a student's live profile centrally so other authorized portals can read it.
app.put('/api/student/profile', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in again to save your profile.' });
  if (user.role !== 'student') return res.status(403).json({ error: 'Only student accounts can update a student profile.' });
  const incoming = req.body?.profile;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'A valid student profile is required.' });
  }
  const classes = Array.isArray(incoming.assignedClasses)
    ? incoming.assignedClasses.map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 12).slice(0, 2)
    : (user.assignedClasses || [10]).slice(0, 2);
  user.profile = {
    ...(user.profile || {}),
    name: user.name,
    id: user.id,
    studentId: user.identifier || user.id,
    email: user.email,
    schoolName: user.school || incoming.schoolName || '',
    classNum: Number.isInteger(Number(incoming.classNum)) && Number(incoming.classNum) >= 1 && Number(incoming.classNum) <= 12
      ? Number(incoming.classNum) : (classes[0] || 10),
    assignedClasses: classes.length ? classes : [10],
    tutorLanguage: typeof incoming.tutorLanguage === 'string' ? incoming.tutorLanguage.slice(0, 40) : (user.preferredLanguage || 'Odia'),
    interfaceLanguage: typeof incoming.interfaceLanguage === 'string' ? incoming.interfaceLanguage.slice(0, 40) : (user.preferredLanguage || 'Odia'),
    textbookLanguage: typeof incoming.textbookLanguage === 'string' ? incoming.textbookLanguage.slice(0, 40) : (user.preferredLanguage || 'Odia'),
    subjects: Array.isArray(incoming.subjects) ? incoming.subjects.filter((v: unknown) => typeof v === 'string').slice(0, 12) : [user.preferredSubject || 'Mathematics'],
    nickname: typeof incoming.nickname === 'string' ? incoming.nickname.slice(0, 80) : user.name.split(/\\s+/)[0],
    learningGoals: Array.isArray(incoming.learningGoals) ? incoming.learningGoals.filter((v: unknown) => typeof v === 'string').slice(0, 30) : [],
    accessibility: incoming.accessibility && typeof incoming.accessibility === 'object' ? incoming.accessibility : undefined
  };
  user.assignedClasses = classes.length ? classes : [10];
  user.preferredLanguage = user.profile.tutorLanguage;
  user.preferredSubject = user.profile.subjects[0] || 'Mathematics';
  return res.json({ success: true, student: publicStudentRecord(user) });
});

app.get('/api/teacher/students', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to view students.' });
  if (user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers can view the class roster.' });
  const classes = Array.isArray(user.teachingClasses) ? user.teachingClasses.map(Number) : [];
  const students = db.users.filter((student) =>
    student.role === 'student' &&
    (!user.school || !student.school || student.school === user.school) &&
    (student.assignedClasses || []).some((cls: number) => classes.includes(Number(cls)))
  ).map(publicStudentRecord);
  return res.json({ students });
});

app.get('/api/parent/children', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to view linked student data.' });
  if (user.role !== 'parent') return res.status(403).json({ error: 'Only parent accounts can view linked children.' });
  const linkedIds = Array.isArray(user.linkedStudentIds) ? user.linkedStudentIds : [];
  const children = db.users.filter((student) => student.role === 'student' && linkedIds.includes(student.id)).map(publicStudentRecord);
  return res.json({ children });
});

function requireTeacher(req: any, res: any) {
  const user = getAuthenticatedUser(req);
  if (!user) { res.status(401).json({ error: 'Please sign in again to continue.' }); return null; }
  if (user.role !== 'teacher') { res.status(403).json({ error: 'Only teacher accounts can publish class recordings.' }); return null; }
  req.authUser = user;
  return user;
}

app.get('/api/recordings', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in to view class recordings.' });
  const requestedClass = req.query.classNum ? Number(req.query.classNum) : undefined;
  let visible = db.recordings;
  if (user.role === 'student') {
    const classes = Array.isArray(user.assignedClasses) ? user.assignedClasses.map(Number) : [];
    visible = visible.filter((item) => classes.includes(Number(item.classNum)));
  } else if (user.role === 'teacher') {
    const classes = Array.isArray(user.teachingClasses) ? user.teachingClasses.map(Number) : [];
    visible = visible.filter((item) => !item.teacherId || item.teacherId === user.id || classes.includes(Number(item.classNum)));
  } else {
    return res.status(403).json({ error: 'This account cannot view class recordings.' });
  }
  if (requestedClass) visible = visible.filter((item) => Number(item.classNum) === requestedClass);
  return res.json({ recordings: visible });
});

app.post('/api/recordings/cloudinary-signature', (req, res) => {
  const teacher = requireTeacher(req, res);
  if (!teacher) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ error: 'Cloud video storage is not configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to the backend environment.' });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'pathashala/class-recordings';
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  return res.json({ cloudName, apiKey, timestamp, folder, signature });
});

app.post('/api/recordings', (req, res) => {
  const teacher = requireTeacher(req, res);
  if (!teacher) return;
  const { title, classNum, subject, videoUrl, publicId, durationSeconds } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || !Number.isInteger(Number(classNum)) || Number(classNum) < 1 || Number(classNum) > 12 || typeof subject !== 'string' || !subject.trim() || typeof videoUrl !== 'string' || typeof publicId !== 'string') {
    return res.status(400).json({ error: 'Title, class, subject, and a Cloudinary video upload are required.' });
  }
  const classes = Array.isArray(teacher.teachingClasses) ? teacher.teachingClasses.map(Number) : [];
  if (!classes.includes(Number(classNum))) return res.status(403).json({ error: 'You can publish recordings only to your assigned teaching classes.' });
  let parsedUrl: URL;
  try { parsedUrl = new URL(videoUrl); } catch { return res.status(400).json({ error: 'Cloudinary did not return a valid video URL.' }); }
  if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('cloudinary.com')) return res.status(400).json({ error: 'Recording must be stored in Cloudinary over HTTPS.' });
  const recording = {
    id: `REC-${Date.now()}-${randomBytes(3).toString('hex')}`,
    title: title.trim().slice(0, 160),
    classNum: Number(classNum),
    subject: subject.trim().slice(0, 80),
    videoUrl: parsedUrl.toString(),
    publicId: publicId.slice(0, 300),
    durationSeconds: Number.isFinite(Number(durationSeconds)) ? Math.max(0, Math.min(86400, Number(durationSeconds))) : undefined,
    teacherId: teacher.id,
    teacherName: teacher.name || 'Teacher',
    createdAt: new Date().toISOString()
  };
  db.recordings.unshift(recording);
  return res.status(201).json({ success: true, recording });
});

// ==========================================
// HOMEWORK MANAGEMENT ENDPOINTS
// ==========================================

app.get('/api/homework', (req, res) => {
  const user = (req as any).authUser;
  const requestedClass = req.query.classNum ? Number(req.query.classNum) : undefined;
  let items = db.homework;
  if (user.role === 'student') {
    const allowedClasses = Array.isArray(user.assignedClasses) ? user.assignedClasses : [];
    items = items.filter((item) => allowedClasses.includes(Number(item.classNum)));
  } else if (user.role === 'teacher') {
    const allowedClasses = Array.isArray(user.teachingClasses) ? user.teachingClasses : [];
    items = items.filter((item) => item.teacherId === user.id || allowedClasses.includes(Number(item.classNum)));
  } else if (user.role === 'parent') {
    const childIds = Array.isArray(user.linkedStudentIds) ? user.linkedStudentIds : [];
    const childClasses = db.users.filter((item) => childIds.includes(item.id)).flatMap((item) => item.assignedClasses || []);
    items = items.filter((item) => childClasses.includes(Number(item.classNum)));
  } else {
    return res.status(403).json({ error: 'Role not permitted.' });
  }
  if (requestedClass) items = items.filter((item) => Number(item.classNum) === requestedClass);
  const visibleIds = user.role === 'student'
    ? new Set([user.id])
    : user.role === 'parent'
      ? new Set(user.linkedStudentIds || [])
      : null;
  const submissions = visibleIds
    ? db.submissions.filter((item) => visibleIds.has(item.studentId))
    : db.submissions.filter((item) => items.some((homework) => homework.id === item.assignmentId));
  return res.json({ homework: items, submissions });
});

app.post('/api/homework', (req, res) => {
  const { title, classNum, subject, instructions, dueDate, maxMarks, teacherName } = req.body;
  if (!title || !classNum || !subject) {
    return res.status(400).json({ error: 'Title, class, and subject are required.' });
  }

  const newHw = {
    id: `HW-${Date.now().toString().slice(-6)}-${randomBytes(2).toString('hex')}`,
    title,
    classNum: Number(classNum),
    subject,
    teacherId: 'TCH-504',
    teacherName: teacherName || 'Smt. Priya Sharma',
    instructions: instructions || 'Complete the exercises and submit before deadline.',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    maxMarks: Number(maxMarks) || 20,
    submissionType: 'both',
    totalAssigned: 38,
    submittedCount: 0
  };

  db.homework.unshift(newHw);
  return res.json({ success: true, homework: newHw });
});

app.post('/api/homework/:id/submit', (req, res) => {
  const { id } = req.params;
  const { studentId, studentName, textAnswer, fileName } = req.body;

  const existingSubIdx = db.submissions.findIndex((s) => s.assignmentId === id && s.studentId === studentId);
  const newSubmission = {
    id: existingSubIdx >= 0 ? db.submissions[existingSubIdx].id : `SUB-${Date.now().toString().slice(-4)}`,
    assignmentId: id,
    studentId: studentId || 'STU-2026-1082',
    studentName: studentName || 'Subhashree Nayak',
    classNum: 10,
    subject: 'Assigned Subject',
    submittedAt: new Date().toLocaleString(),
    status: 'Submitted',
    textAnswer: textAnswer || '',
    fileName: fileName || '',
    maxMarks: 20
  };

  if (existingSubIdx >= 0) {
    db.submissions[existingSubIdx] = { ...db.submissions[existingSubIdx], ...newSubmission };
  } else {
    db.submissions.push(newSubmission);
  }

  // Count unique submissions; resubmitting must not inflate the total.
  const hw = db.homework.find((h) => h.id === id);
  if (hw && existingSubIdx < 0) {
    hw.submittedCount = db.submissions.filter((submission) => submission.assignmentId === id).length;
  }

  return res.json({ success: true, submission: newSubmission });
});

// ==========================================
// CAMERA PRESENCE CHECK ALERTS ENDPOINTS
// ==========================================

app.get('/api/camera-alerts', (req, res) => {
  const user = (req as any).authUser;
  if (user.role !== 'teacher') return res.status(403).json({ error: 'Teacher access required.' });
  const classes = Array.isArray(user.teachingClasses) ? user.teachingClasses : [];
  const alerts = db.cameraAlerts.filter((item) => classes.includes(Number(item.classNum)));
  return res.json({ alerts });
});

app.post('/api/camera-alerts', (req, res) => {
  const { sessionId, sessionTitle, studentId, studentName, durationSeconds, confidence } = req.body;
  const newAlert = {
    id: `CAM-ALT-${Date.now().toString().slice(-3)}`,
    sessionId: sessionId || 'SES-FOCUS',
    sessionTitle: sessionTitle || 'Study Focus Session',
    studentId: studentId || 'STU-2026-1082',
    studentName: studentName || 'Subhashree Nayak',
    classNum: 10,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    durationSeconds: Number(durationSeconds) || 20,
    confidence: Number(confidence) || 0.85,
    message: 'Possible camera absence detected during the learning session. Teacher review required.',
    status: 'awaiting_review'
  };

  db.cameraAlerts.unshift(newAlert);
  return res.json({ success: true, alert: newAlert });
});

app.post('/api/camera-alerts/:id/review', (req, res) => {
  const { id } = req.params;
  const { status, teacherNotes } = req.body;

  const alert = db.cameraAlerts.find((a) => a.id === id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  alert.status = status;
  alert.teacherNotes = teacherNotes || '';
  alert.reviewedAt = new Date().toLocaleString();

  return res.json({ success: true, alert });
});

// ==========================================
 // STUDY FOCUS EVENTS & PARENT NOTIFICATIONS
 // Prototype delivery: notifications are stored in memory. Real phone push requires
 // a service worker + Web Push/FCM credentials and an authenticated subscription.
 // ==========================================

app.post('/api/focus-events', (req, res) => {
  const { studentId, studentName, sessionId, level, awaySeconds, reason } = req.body || {};
  const student = db.users.find((u) => u.id === studentId && u.role === 'student');
  if (!student) return res.status(400).json({ error: 'A valid studentId is required.' });

  const seconds = Number(awaySeconds);
  if (![60, 300, 600].includes(seconds) || !['student', 'parent', 'alarm'].includes(level)) {
    return res.status(400).json({ error: 'Unsupported focus event.' });
  }

  const parent = db.users.find((u) => u.role === 'parent' && (u.linkedStudentIds || []).includes(student.id));
  const now = new Date().toISOString();
  const event = {
    id: `FOCUS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentId: student.id,
    studentName: studentName || student.name,
    sessionId: sessionId || 'FOCUS-SESSION',
    level,
    awaySeconds: seconds,
    reason: typeof reason === 'string' ? reason.slice(0, 80) : 'window_not_focused',
    createdAt: now
  };

  if (!db.focusEvents) db.focusEvents = [];
  db.focusEvents.unshift(event);

  const createNotification = (recipientRole: 'student' | 'parent', recipientId: string, title: string, message: string, category = 'focus') => {
    db.notifications.unshift({
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientRole,
      recipientId,
      title,
      message,
      category,
      timestamp: now,
      read: false,
      actionUrl: recipientRole === 'parent' ? '/parent' : '/focus-session'
    });
  };

  if (seconds >= 60 && level === 'student') {
    createNotification('student', student.id, 'Let’s return to learning', 'Your study window has been inactive for about 1 minute. Take a breath and resume when ready.');
  }
  if (seconds >= 300 && level === 'parent' && parent) {
    createNotification('parent', parent.id, 'Study session needs a check-in', `${student.name}’s study window has been inactive for about 5 minutes. Please check in supportively.`);
  }
  if (seconds >= 600 && level === 'alarm') {
    createNotification('student', student.id, 'Focus check-in', 'Your study window has been inactive for about 10 minutes. Please resume or end your session.');
    if (parent) createNotification('parent', parent.id, 'Study session alert', `${student.name}’s study window has been inactive for about 10 minutes. Please check in.`, 'alert');
  }

  return res.json({ success: true, event, parentLinked: Boolean(parent) });
});

app.get('/api/notifications', (req, res) => {
  const { recipientRole, recipientId, role } = req.query;
  let notifications = db.notifications;
  const selectedRole = recipientRole || role;
  if (selectedRole) notifications = notifications.filter((item) => item.recipientRole === String(selectedRole));
  if (recipientId) notifications = notifications.filter((item) => item.recipientId === String(recipientId));
  return res.json({ notifications });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const item = db.notifications.find((n) => n.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Notification not found.' });
  item.read = true;
  return res.json({ success: true, notification: item });
});

// ==========================================
// TEACHER & PARENT REPORTS ENDPOINTS
// ==========================================

app.get('/api/reports', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to view reports.' });
  if (user.role === 'parent') {
    const linkedIds = Array.isArray(user.linkedStudentIds) ? user.linkedStudentIds : [];
    return res.json({
      studentReports: [],
      parentReports: db.parentReports.filter((report) => linkedIds.includes(report.studentId) && report.status === 'Published')
    });
  }
  if (user.role === 'teacher') {
    const classes = Array.isArray(user.teachingClasses) ? user.teachingClasses.map(Number) : [];
    return res.json({
      studentReports: db.studentReports.filter((report) => report.teacherId === user.id || classes.includes(Number(report.classNum))),
      parentReports: []
    });
  }
  return res.status(403).json({ error: 'Report access denied.' });
});

app.post('/api/reports', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to create a report.' });
  if (user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers can create student reports.' });
  const reportData = req.body || {};
  const classNum = Number(reportData.classNum);
  if (typeof reportData.studentName !== 'string' || !reportData.studentName.trim() ||
      typeof reportData.studentId !== 'string' || !reportData.studentId.trim() ||
      !Number.isInteger(classNum) || classNum < 1 || classNum > 12 ||
      typeof reportData.reportingPeriod !== 'string' || !reportData.reportingPeriod.trim()) {
    return res.status(400).json({ error: 'Student name, student ID, valid class, and reporting period are required.' });
  }
  const teacherClasses = Array.isArray(user.teachingClasses) ? user.teachingClasses.map(Number) : [];
  if (teacherClasses.length && !teacherClasses.includes(classNum)) {
    return res.status(403).json({ error: 'You can create reports only for your assigned classes.' });
  }
  const student = db.users.find((item) => item.role === 'student' &&
    [item.id, item.identifier, item.email].some((value) => typeof value === 'string' && value.toLowerCase() === reportData.studentId.trim().toLowerCase()));
  if (!student) return res.status(404).json({ error: 'No registered student matches that Student ID. Use the ID from the student account.' });
  if (Array.isArray(student.assignedClasses) && student.assignedClasses.length &&
      !student.assignedClasses.map(Number).includes(classNum)) {
    return res.status(400).json({ error: 'The selected class does not match this student’s assigned classes.' });
  }
  const template = db.studentReports.find((item) => item.studentId === student.id) || {};
  const safeReport = {
    ...template,
    ...reportData,
    id: `REP-${Date.now()}-${randomBytes(3).toString('hex')}`,
    studentId: student.id,
    studentName: student.name,
    classNum,
    assignedClasses: [classNum],
    assignedClassesInfo: [classNum],
    studentDetails: {
      ...(template.studentDetails || {}),
      ...(reportData.studentDetails || {}),
      name: student.name,
      id: student.identifier || student.id,
      school: student.school || '',
      board: (reportData.studentDetails && reportData.studentDetails.board) || (template.studentDetails && template.studentDetails.board) || 'School Board'
    },
    teacherId: user.id,
    teacherName: user.name || 'Teacher',
    createdAt: new Date().toLocaleString(),
    publishedAt: undefined,
    status: 'Draft'
  };
  db.studentReports.unshift(safeReport);
  return res.status(201).json({ success: true, report: safeReport });
});

app.post('/api/reports/:id/publish', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to publish reports.' });
  if (user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers can publish student reports.' });
  const { id } = req.params;
  const report = db.studentReports.find((r) => r.id === id && (r.teacherId === user.id || (Array.isArray(user.teachingClasses) && user.teachingClasses.map(Number).includes(Number(r.classNum)))));
  if (!report) return res.status(404).json({ error: 'Report not found in your assigned classes.' });

  report.status = 'Published';
  report.publishedAt = new Date().toLocaleString();

  const parentRep = {
    id: `PREP-${id}`,
    studentReportId: report.id,
    studentId: report.studentId,
    studentName: report.studentName,
    classNum: report.classNum,
    reportingPeriod: report.reportingPeriod,
    publishedAt: report.publishedAt,
    teacherName: report.teacherName,
    lessonsCompleted: report.lessonsCompleted,
    homeworkStatus: `${report.homeworkCompletionRate}% Homework Completed`,
    quizPerformance: `${report.quizAccuracy}% Quiz Accuracy`,
    subjectMastery: report.subjectMastery,
    topicsRequiringSupport: report.topicsRequiringPractice,
    positiveAchievements: [
      'Consistent daily focused study sessions.',
      'Active participation in bilingual doubt-solving.'
    ],
    teacherFeedback: report.teacherComments?.releasedFeedback || 'Good performance.',
    recommendedRevision: report.recommendedNextSteps,
    status: 'Published'
  };
  db.parentReports.unshift(parentRep);
  return res.json({ success: true, studentReport: report, parentReport: parentRep });
});

// ==========================================
// DAILY ACTIVITY & NOTIFICATIONS ENDPOINTS
// ==========================================

app.get('/api/activity', (req, res) => {
  return res.json({ activities: db.activities });
});

app.post('/api/activity', (req, res) => {
  const { eventType, title, description, category, classNum, subject, studentId, studentName } = req.body;
  const newEvent = {
    id: `ACT-${Date.now().toString().slice(-4)}`,
    studentId: studentId || 'STU-2026-1082',
    studentName: studentName || 'Subhashree Nayak',
    classNum: Number(classNum) || 10,
    subject,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    eventType: eventType || 'engagement',
    title: title || 'Learning Interaction',
    description: description || '',
    category: category || 'engagement'
  };

  db.activities.unshift(newEvent);
  return res.json({ success: true, event: newEvent });
});



// ==========================================
// GEMINI AI INTEGRATION ROUTES
// ==========================================

function buildSystemInstruction(
  classNum: number,
  subject: string,
  board: string,
  targetLanguage: string,
  textbookLanguage?: string,
  action?: string
) {
  let gradeGuidance = '';
  if (classNum <= 2) {
    gradeGuidance =
      'Class 1-2 student: Use ultra-simple words, friendly tone, short sentences, fun analogies, emojis, and maximum concrete clarity. Keep explanation very short.';
  } else if (classNum <= 5) {
    gradeGuidance =
      'Class 3-5 student: Use familiar daily-life examples, intuitive metaphors, step-by-step breakdown, and encouraging cheerful tone.';
  } else if (classNum <= 8) {
    gradeGuidance =
      'Class 6-8 student: Progressive introduction of scientific terms, clear logic, real-world examples, and foundational clarity.';
  } else if (classNum <= 10) {
    gradeGuidance =
      'Class 9-10 student: Strong conceptual clarity, standard textbook terminology (NCERT / BSE Odisha), school exam & board preparation focus, clear formulas, and key points to avoid marks deduction.';
  } else {
    gradeGuidance =
      'Class 11-12 student: Rigorous academic depth, clear derivations, formal equations, SI units, numerical step-by-step methodology, competitive exam alignment (JEE/NEET/CHSE/CBSE).';
  }

  let actionGuidance = '';
  if (action === 'explain_simply') {
    actionGuidance =
      'SPECIFIC ACTION: Explain as simply as possible using a relatable everyday analogy. Avoid heavy jargon.';
  } else if (action === 'explain_detail') {
    actionGuidance =
      'SPECIFIC ACTION: Provide an in-depth academic explanation covering the origin of the concept, governing principles, real-life implications, and exam tips.';
  } else if (action === 'give_example') {
    actionGuidance =
      'SPECIFIC ACTION: Focus primarily on giving concrete, vivid examples from Indian and Odisha everyday life (e.g., paddy fields, monsoon, solar lanterns, bicycles, cooking, local transport).';
  } else if (action === 'show_steps') {
    actionGuidance =
      'SPECIFIC ACTION: Format as a strict Step-by-Step procedural derivation or numerical calculation with given values, formula used, substitution, calculation, and final result with units.';
  } else if (action === 'generate_quiz') {
    actionGuidance =
      'SPECIFIC ACTION: Generate the number of high-quality multiple-choice questions requested by the user (default to 2 if no count is specified), with four options each, correct answers, and brief explanations, suitable for Class ' +
      classNum + '.';
  } else if (action === 'save_notes') {
    actionGuidance =
      'SPECIFIC ACTION: Format as crisp, bulleted revision study notes highlighting Key Definition, Must-Remember Formula, and High-Yield Board Exam Points.';
  } else if (action === 'lesson_plan') {
    actionGuidance =
      'SPECIFIC ACTION: Produce a practical 45-minute lesson plan with measurable learning objectives, materials, timed teacher/student activities, checks for understanding, differentiation, recap, and homework.';
  } else if (action === 'worksheet') {
    actionGuidance =
      'SPECIFIC ACTION: Produce a printable worksheet with clear instructions, varied age-appropriate questions, marks per question, a total marks line, and a separate answer key at the end.';
  } else if (action === 'multilingual') {
    actionGuidance =
      'SPECIFIC ACTION: Teach in the requested target language using authentic script, retain important English technical terms in parentheses, and finish with a short bilingual glossary and recap.';
  } else if (action === 'grade_homework') {
    actionGuidance =
      'SPECIFIC ACTION: Evaluate the supplied student answer fairly against the question and rubric. Return a suggested score, what is correct, what needs improvement, specific feedback, and a model answer. Never claim the teacher has finalized the grade.';
  }

  const isUrdu = targetLanguage.toLowerCase() === 'urdu';
  const langGuidance =
    targetLanguage && targetLanguage !== 'English'
      ? `IMPORTANT: Respond in the student's selected language: ${targetLanguage}. Ensure authentic script (${isUrdu ? 'Urdu Arabic script with appropriate RTL phrasing' : 'authentic Indic script'}). If textbook language is ${textbookLanguage || 'English'}, explain the terms in ${targetLanguage} while keeping essential English technical terms in brackets where helpful for examinations.`
      : 'Respond in clear, accessible English with precise terminology.';

  return `You are PATHASHALA AI, an expert educational tutor for Indian school students.
Target Student: Class ${classNum} (${gradeGuidance})
Selected study subject: ${subject}
School Board: ${board || 'Odisha State Board (BSE/CHSE) / CBSE'}
${langGuidance}
${actionGuidance}

STRICT RESPONSE RULES:
1. Answer the actual topic or question the student typed. The selected study subject is context only; it must NEVER be used to refuse, redirect, or scold the student for asking about another school subject. For example, answer "Explain photosynthesis" as Biology even when the selected subject is Physics.
2. Use ${targetLanguage || 'English'} throughout the response. Do not switch to English merely because the question was typed in English. Keep only necessary scientific terms, symbols, and formulas in their standard form, with simple explanation in the selected language.
3. Use plain readable text. Do not output Markdown escape sequences such as \\* or raw LaTeX delimiters such as $...$. Write equations in simple text when practical.
4. Start directly with the answer. Avoid long greetings, self-introductions, warnings about the selected subject, and unnecessary exam advice unless requested.
5. Match the requested length and action. For a simple explanation, use a short definition and 3-5 clear points. For a numerical problem, show the formula, substitution, and final answer.
6. Use vocabulary suitable for Class ${classNum}; be respectful, clear, and accurate.`;
}

// Try the primary Gemini model, then compatible stable fallbacks during temporary capacity errors.
async function generateWithGeminiFallback(request: { contents: any; config?: any }) {
  const models = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  let lastError: any;
  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await aiClient!.models.generateContent({ model, ...request });
        return { response, model };
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.status || error?.code || error?.error?.code);
        const message = String(error?.message || error?.error?.message || '');
        const transient = [408, 429, 500, 502, 503, 504].includes(status) ||
          /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|temporarily unavailable|rate.?limit/i.test(message);
        if (!transient) throw error;
        if (attempt < 2) {
          const delayMs = 700 * attempt;
          console.warn(`Gemini model ${model} temporary failure (attempt ${attempt}/2); retrying in ${delayMs}ms.`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else if (model !== models[models.length - 1]) {
          console.warn(`Gemini model ${model} remains unavailable; trying the next compatible model.`);
        }
      }
    }
  }
  throw lastError || new Error('All configured Gemini models are temporarily unavailable.');
}

// AI Study Studio generation endpoint used by the Student Portal.
app.post('/api/gemini/study-studio', async (req, res) => {
  const {
    type = 'short_notes',
    topic,
    classNum = 10,
    subject = 'Science',
    language = 'English'
  } = req.body || {};

  const allowedTypes = new Set(['short_notes', 'summary', 'flashcards', 'formulas', 'mindmap', 'vocab']);
  const numericClass = Number(classNum);
  const cleanTopic = typeof topic === 'string' ? topic.trim().slice(0, 2000) : '';
  const cleanSubject = typeof subject === 'string' ? subject.trim().slice(0, 80) : 'Science';
  const cleanLanguage = typeof language === 'string' ? language.trim().slice(0, 40) : 'English';

  if (!allowedTypes.has(type)) {
    return res.status(400).json({ error: 'Choose a supported Study Studio material format.' });
  }
  if (!cleanTopic) {
    return res.status(400).json({ error: 'Enter a chapter or topic before generating study material.' });
  }
  if (!Number.isInteger(numericClass) || numericClass < 1 || numericClass > 12) {
    return res.status(400).json({ error: 'Class must be a number from 1 to 12.' });
  }
  if (!aiClient) {
    return res.status(503).json({
      error: 'Live AI is not connected. Add a valid GEMINI_API_KEY to the backend environment and redeploy. No study material was generated.',
      isDemo: true
    });
  }

  const formatInstructions: Record<string, string> = {
    short_notes: 'Create clear, concise revision notes with headings, definitions, key points, and examples.',
    summary: 'Write a structured chapter summary with the main ideas, important terms, and a short recap.',
    flashcards: 'Create 8 study flashcards. For each, show Question: and Answer: on separate lines.',
    formulas: 'Create a formula sheet. For each formula, explain symbols, SI units where relevant, and one short example.',
    mindmap: 'Create a readable text mind map. Put the central topic first, then organize branches and sub-branches using indentation and arrows. Preserve and logically organize the student-provided ideas included in the topic.',
    vocab: 'Create a vocabulary list with key terms, simple definitions, and one example for each.'
  };

  try {
    const systemInstruction = buildSystemInstruction(
      numericClass,
      cleanSubject,
      'Odisha State Board (BSE/CHSE) / CBSE',
      cleanLanguage,
      'English',
      type === 'short_notes' ? 'save_notes' : undefined
    );
    const prompt = `${systemInstruction}

Study Studio format: ${type}
Formatting instructions: ${formatInstructions[type]}

Generate original, accurate school-level learning material for this topic:
${cleanTopic}

Requirements:
- Use the requested language: ${cleanLanguage}.
- Match Class ${numericClass} and subject ${cleanSubject}.
- Keep the output organized and useful for revision.
- Do not claim the content came from an official textbook unless a source was provided.
- Return only the study material, without an introduction about being an AI.`;

    const { response, model: usedModel } = await generateWithGeminiFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.35, maxOutputTokens: 4096 }
    });
    const generatedText = response.text;
    if (typeof generatedText !== 'string' || !generatedText.trim()) {
      return res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
    }
    return res.json({ content: generatedText.trim(), source: usedModel, isDemo: false });
  } catch (error: any) {
    const message = String(error?.message || error?.error?.message || 'Unknown Gemini generation error').slice(0, 400);
    console.error('Study Studio Gemini generation failed:', message);
    const status = Number(error?.status || error?.code || error?.error?.code);
    return res.status(status === 429 ? 429 : 502).json({
      error: status === 429
        ? 'Gemini rate limit or quota reached. Please wait and try again.'
        : 'Gemini could not generate Study Studio material. Check the backend logs and Gemini API key, then try again.',
      detail: process.env.NODE_ENV === 'production' ? undefined : message,
      isDemo: false
    });
  }
});

// Generate fresh, student-specific practice questions for the Practice Zone.
app.post('/api/gemini/practice-questions', async (req, res) => {
  const { classNum = 10, subject = 'Mathematics', language = 'English', mode = 'adaptive', difficulty = 'All', recentMistakes = [], refreshSeed = '' } = req.body || {};
  const numericClass = Number(classNum);
  const cleanSubject = typeof subject === 'string' ? subject.trim().slice(0, 100) : 'Mathematics';
  const cleanLanguage = typeof language === 'string' ? language.trim().slice(0, 40) : 'English';
  const cleanMode = ['adaptive', 'board_prep', 'daily_challenge'].includes(mode) ? mode : 'adaptive';
  const cleanDifficulty = ['All', 'Beginner', 'Easy', 'Medium', 'Advanced'].includes(difficulty) ? difficulty : 'All';
  const mistakeTopics = Array.isArray(recentMistakes)
    ? recentMistakes.slice(-8).map((item: any) => String(item?.concept || item?.question || '').slice(0, 180)).filter(Boolean)
    : [];

  if (!Number.isInteger(numericClass) || numericClass < 1 || numericClass > 12) {
    return res.status(400).json({ error: 'Class must be a number from 1 to 12.' });
  }
  if (!cleanSubject) return res.status(400).json({ error: 'Choose a subject to generate practice questions.' });
  if (!aiClient) {
    return res.status(503).json({ error: 'Live practice generation is not configured. Add GEMINI_API_KEY to the backend environment and redeploy.' });
  }

  const modeInstructions: Record<string, string> = {
    adaptive: 'Mix conceptual understanding and application questions. If recent mistakes are provided, focus extra questions on those weak concepts while still covering the chapter.',
    board_prep: 'Create board-exam-style questions with precise wording, realistic numericals where suitable, and exam-appropriate difficulty.',
    daily_challenge: 'Create varied, engaging challenge questions that test reasoning and application, not only memorization.'
  };

  try {
    const prompt = `Create exactly 8 NEW multiple-choice practice questions for an Indian school student.
Class: ${numericClass}
Subject: ${cleanSubject}
Language: ${cleanLanguage}
Practice mode: ${cleanMode} — ${modeInstructions[cleanMode]}
Requested difficulty: ${cleanDifficulty === 'All' ? 'mix Beginner, Easy, Medium, and Advanced appropriately for this class' : cleanDifficulty}
Student's recent incorrect answers / weak concepts: ${mistakeTopics.length ? mistakeTopics.join('; ') : 'No mistake history yet; cover a varied set of core concepts for this class and subject.'}
Fresh-set variation key: ${String(refreshSeed).slice(0, 80)}

Requirements:
- Questions must match Class ${numericClass} and subject ${cleanSubject}, and must be different from generic unrelated subjects.
- Make this set distinct from previous sets; vary the concepts, wording, examples, and numbers each time.
- Use ${cleanLanguage} for question, options, and explanation where possible; keep standard scientific terms and formulas readable.
- Include exactly four answer options per question and exactly one correct answer.
- Keep age-appropriate, accurate, curriculum-aligned questions. Do not invent official board questions.
- Return ONLY valid JSON with this shape:
{"questions":[{"id":"unique-string","question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","concept":"...","difficulty":"Easy","classNum":${numericClass},"subject":"${cleanSubject}"}]}
- correctIndex must be 0, 1, 2, or 3. difficulty must be Beginner, Easy, Medium, or Advanced. No markdown fences or extra text.`;

    const { response, model: usedModel } = await generateWithGeminiFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.85, maxOutputTokens: 5000, responseMimeType: 'application/json' }
    });
    const raw = response.text;
    if (typeof raw !== 'string' || !raw.trim()) return res.status(502).json({ error: 'AI returned an empty practice set. Please try again.' });
    let parsed: any;
    try {
      parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch {
      return res.status(502).json({ error: 'AI returned invalid question data. Please generate a new set.' });
    }
    const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions;
    const questions = (Array.isArray(rawQuestions) ? rawQuestions : []).filter((q: any) =>
      q && typeof q.question === 'string' && q.question.trim() &&
      Array.isArray(q.options) && q.options.length === 4 && q.options.every((o: any) => typeof o === 'string') &&
      Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3 &&
      typeof q.explanation === 'string' && typeof q.concept === 'string' &&
      ['Beginner', 'Easy', 'Medium', 'Advanced'].includes(q.difficulty)
    ).slice(0, 8).map((q: any, index: number) => ({
      id: `ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      question: q.question.trim(),
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      concept: q.concept,
      difficulty: q.difficulty,
      classNum: numericClass,
      subject: cleanSubject,
      board: 'Personalized AI Practice'
    }));
    if (questions.length < 4) return res.status(502).json({ error: 'AI generated too few valid questions. Please try a fresh set.' });
    return res.json({ questions, source: usedModel, isDemo: false });
  } catch (error: any) {
    const message = String(error?.message || error?.error?.message || 'Unknown Gemini generation error').slice(0, 300);
    console.error('Practice question generation failed:', message);
    const status = Number(error?.status || error?.code || error?.error?.code);
    return res.status(status === 429 ? 429 : 502).json({
      error: status === 429 ? 'AI practice quota reached. Wait a moment and try again.' : 'AI could not generate practice questions. Check backend logs and Gemini configuration.',
      detail: process.env.NODE_ENV === 'production' ? undefined : message
    });
  }
});

// AI Tutor chat endpoint
app.post('/api/gemini/tutor', async (req, res) => {
  const {
    question,
    classNum = 10,
    subject = 'Physics',
    board = 'Odisha State Board',
    targetLanguage = 'Odia',
    textbookLanguage = 'English',
    action = 'explain_concept',
    imageBase64
  } = req.body;

  if ((!question || typeof question !== 'string' || !question.trim()) && !imageBase64) {
    return res.status(400).json({ error: 'Enter a question or attach an image before asking the AI tutor.' });
  }
  if (typeof question === 'string' && question.length > 12000) {
    return res.status(413).json({ error: 'Your question is too long. Please keep it under 12,000 characters.' });
  }
  const numericClass = Number(classNum);
  if (!Number.isInteger(numericClass) || numericClass < 1 || numericClass > 12) {
    return res.status(400).json({ error: 'Class must be a number from 1 to 12.' });
  }
  const supportedActions = ['explain_concept', 'explain_simply', 'explain_detail', 'give_example', 'show_steps', 'generate_quiz', 'save_notes', 'lesson_plan', 'worksheet', 'multilingual', 'grade_homework'];
  if (typeof action !== 'string' || !supportedActions.includes(action)) {
    return res.status(400).json({ error: 'Unsupported AI tool action.' });
  }
  if (imageBase64 && (typeof imageBase64 !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageBase64))) {
    return res.status(400).json({ error: 'Attach a PNG, JPG, or WebP image.' });
  }

  const queryText = (typeof question === 'string' && question.trim()) ? question.trim() : `Action: ${action} for ${subject}`;
  const systemInstruction = buildSystemInstruction(
    numericClass,
    String(subject).slice(0, 100),
    String(board).slice(0, 100),
    String(targetLanguage).slice(0, 60),
    String(textbookLanguage).slice(0, 60),
    action
  );

  // If live AI client is available, call Gemini API
  if (aiClient) {
    try {
      const parts: any[] = [
        { text: `${systemInstruction}\n\nStudent Action Requested: ${action}\nStudent Question: ${queryText}` }
      ];

      if (imageBase64) {
        const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        parts.push({
          inlineData: {
            data: pureBase64,
            mimeType
          }
        });
      }

      const { response, model: usedModel } = await generateWithGeminiFallback({
        contents: parts,
        config: { temperature: 0.35, maxOutputTokens: 4096 }
      });

      const responseText = response.text;
      if (responseText) {
        return res.json({
          answer: responseText,
          source: usedModel,
          isDemo: false,
          language: targetLanguage,
          classNum,
          subject
        });
      }
    } catch (err: any) {
      console.warn('Gemini live call failed:', err?.message);
    }
  }

  // Never return a canned answer for an unrelated question when live generation fails.
  // A clear error is safer than presenting incorrect content as an AI answer.
  return res.status(503).json({
    error: aiClient
      ? 'Gemini could not generate a response right now. Please try again shortly. If this continues, check the Render logs for Gemini API quota, model, or key errors.'
      : 'Live AI is not connected. Add a valid GEMINI_API_KEY to the Render backend environment and redeploy.',
    isDemo: true,
    source: 'gemini-unavailable'
  });
});

// Photo doubt solver vision endpoint
app.post('/api/gemini/vision', async (req, res) => {
  let visionErrorMessage = '';
  const { imageBase64, classNum = 10, subject = 'Physics', language = 'Odia', prompt } = req.body;

  if (typeof imageBase64 !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageBase64)) {
    return res.status(400).json({ error: 'Upload a PNG, JPG, or WebP image to solve a textbook question.' });
  }
  if (imageBase64.length > 12_000_000) {
    return res.status(413).json({ error: 'Image is too large. Please choose a smaller image (under about 9 MB).' });
  }
  const numericClass = Number(classNum);
  if (!Number.isInteger(numericClass) || numericClass < 1 || numericClass > 12) {
    return res.status(400).json({ error: 'Class must be a number from 1 to 12.' });
  }

  if (aiClient) {
    try {
      const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const { response, model: usedModel } = await generateWithGeminiFallback({
        contents: [
          {
            text: `You are PATHASHALA AI textbook scanner. The student is in Class ${classNum}, studying ${subject}.
Language preference: ${language}.
STRICT SIMPLE-ANSWER RULES (follow these even if the student asks to solve step by step):
1. Answer in ${language}, using very easy everyday words suitable for Class ${classNum}.
2. Give the answer directly first. Keep the whole answer SHORT: usually 3-5 lines maximum.
3. For a maths or physics calculation, show only: Formula, values/calculation, Final answer. Do not explain LCM or basic arithmetic in paragraphs unless the student asks.
4. Do NOT write long introductions, formal textbook definitions, repeated question text, long headings, or phrases such as "the reciprocal of the equivalent resistance is equal to the sum of the reciprocals".
5. Explain any necessary technical word in a few simple words. Keep the correct formula and units.
6. If the photo is unclear, say simply: "I can't read the question clearly. Please upload a clearer photo." Do not guess.
7. Only give a longer explanation if the student explicitly asks for more detail.
Student request: ${prompt || 'Give a short answer in very simple language'}.
Remember: SIMPLE AND SHORT is more important than showing many steps.`
          },
          {
            inlineData: {
              data: pureBase64,
              mimeType
            }
          }
        ]
      });

      if (response.text) {
        return res.json({
          solution: response.text,
          detectedTopic: `${subject} Textbook Problem`,
          isDemo: false,
          source: usedModel
        });
      }
    } catch (e: any) {
      visionErrorMessage = String(e?.message || e?.error?.message || 'Unknown Gemini image-analysis error').slice(0, 500);
      console.warn('Gemini vision API error:', visionErrorMessage);
    }
  }

  return res.status(503).json({
    error: aiClient
      ? `Gemini image analysis failed: ${visionErrorMessage || 'The model returned no solution.'} Please try again shortly.`
      : 'Live image analysis is not connected. Add a valid GEMINI_API_KEY to the Render backend environment and redeploy. No answer was generated from the image.',
    isDemo: true,
    source: 'gemini-unavailable'
  });
});

// Deterministic fallback response generator
function generateAgenticFallback(
  question: string,
  classNum: number,
  subject: string,
  language: string,
  action: string
) {
  const langLower = (language || 'english').toLowerCase();
  const isOdia = langLower === 'odia';

  if (action === 'generate_quiz') {
    if (isOdia) {
      return {
        answer: `### 📝 ଦ୍ରୁତ ପରୀକ୍ଷା (Quick Quiz) • ଶ୍ରେଣୀ ${classNum} ${subject}

**ପ୍ରଶ୍ନ ୧:** ବିଦ୍ୟୁତ ପ୍ରବାହ (Electric Current) ର SI ଏକକ କ’ଣ?
- A) ଭୋଲ୍ଟ (Volt)
- B) ଆମ୍ପିୟର (Ampere)
- C) ଓମ୍ (Ohm)
- D) ଜୁଲ୍ (Joule)
*(ସଠିକ୍ ଉତ୍ତର: B - ଆମ୍ପିୟର)*

**ପ୍ରଶ୍ନ ୨:** ଓମ୍‌ଙ୍କ ନିୟମ ଅନୁସାରେ କେଉଁ ସୂତ୍ରଟି ସଠିକ୍?
- A) $V = I / R$
- B) $V = I \\times R$
- C) $R = V \\times I$
- D) $I = V \\times R$
*(ସଠିକ୍ ଉତ୍ତର: B - $V = IR$)*`,
        source: 'offline-agent-engine',
        language: 'Odia',
        classNum,
        subject
      };
    }

    return {
      answer: `### 📝 Quick Diagnostic Quiz • Class ${classNum} ${subject}

**Question 1:** What is the SI unit of Electric Current?
- A) Volt (V)
- B) Ampere (A)
- C) Ohm (Ω)
- D) Coulomb (C)
*(Correct Answer: B - Ampere)*

**Question 2:** According to Ohm's Law at constant temperature:
- A) $V = I \\times R$
- B) $I = V \\times R$
- C) $V = I / R$
- D) $R = V \\times I$
*(Correct Answer: A - $V = IR$)*`,
      source: 'offline-agent-engine',
      language: language || 'English',
      classNum,
      subject
    };
  }

  if (isOdia) {
    return {
      answer: `### 💡 PATHASHALA AI ଶିକ୍ଷଣ ମାର୍ଗଦର୍ଶକ (Class ${classNum} • ${subject})
**ପ୍ରଶ୍ନ:** "${question}"

**ସରଳ ବୁଝାମଣା:**
ଓମ୍‌ଙ୍କ ନିୟମ ଅନୁସାରେ ଏକ ପରିବାହୀ ଦେଇ ପ୍ରବାହିତ ବିଦ୍ୟୁତ ପ୍ରବାହ ($I$), ତାହାର ଦୁଇ ପ୍ରାନ୍ତ ମଧ୍ୟରେ ଥିବା ବିଦ୍ୟୁତ ବିଭବାନ୍ତର ($V$) ସହିତ ସମାନୁପାତୀ।

**ଗାଣିତିକ ସୂତ୍ର:**
$$V = I \\times R$$
ଯେଉଁଠାରେ:
- $V$ = ବିଭବାନ୍ତର (ଭୋଲ୍ଟ)
- $I$ = ବିଦ୍ୟୁତ ପ୍ରବାହ (ଆମ୍ପିୟର)
- $R$ = ପରିବାହୀର ପ୍ରତିରୋଧ (ଓମ୍, $\\Omega$)

*ପରୀକ୍ଷା ପାଇଁ ମନେରଖନ୍ତୁ: ତାପମାତ୍ରା ସ୍ଥିର ରହିବା ଆବଶ୍ୟକ!* ✨`,
      source: 'offline-agent-engine',
      language: 'Odia',
      classNum,
      subject
    };
  }

  return {
    answer: `### 💡 PATHASHALA AI Concept Guide (Class ${classNum} • ${subject})
**Question / Topic:** *"${question}"*

#### 1. Core Principle
At the Class ${classNum} level, this fundamental concept connects mathematical principles with practical applications.

#### 2. Key Formula & Relationship
$$V = I \\times R$$
- **Voltage ($V$):** Potential difference measured in Volts.
- **Current ($I$):** Rate of charge flow measured in Amperes.
- **Resistance ($R$):** Property opposing current flow measured in Ohms ($\\Omega$).

#### 3. Recommended Action
Practice one of the quick options below: **Show Steps** or **Generate Quiz** to test your exam readiness!`,
    source: 'offline-agent-engine',
    language: language || 'English',
    classNum,
    subject
  };
}

// Start Server
async function startServer() {
  try {
    const saved = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    for (const key of Object.keys(db)) if (Array.isArray(saved[key])) (db as any)[key] = saved[key];
    console.log('Loaded Pathashala records from persistent store.');
  } catch (error: any) {
    if (error?.code !== 'ENOENT') console.error('Could not load persisted data; using seeded demo data:', error?.message || error);
  }
  // Upgrade legacy seeded or saved demo passwords before serving any requests.
  let migratedPasswords = false;
  for (const user of db.users) {
    if (typeof user.password === 'string' && !user.password.startsWith('scrypt$')) {
      user.password = hashPassword(user.password);
      migratedPasswords = true;
    }
  }
  if (migratedPasswords || !fs.existsSync(STORE_FILE)) {
    try {
      fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2), { encoding: 'utf8', mode: 0o600 });
      console.log('Saved hashed demo credentials to the local data store.');
    } catch (error: any) {
      console.error('Could not save migrated credentials:', error?.message || error);
    }
  }

  if (pgPool) {
    try {
      await initializePostgresStore();
      // A local snapshot is optional when PostgreSQL is authoritative (some hosts use read-only filesystems).
      try {
        fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
        fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2), { encoding: 'utf8', mode: 0o600 });
      } catch (snapshotError: any) {
        console.warn('PostgreSQL is ready; local JSON snapshot was skipped:', snapshotError?.message || snapshotError);
      }
    } catch (error: any) {
      console.error('Could not initialize PostgreSQL. Refusing to start with a broken configured database:', error?.message || error);
      await pgPool.end();
      process.exitCode = 1;
      return;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PATHASHALA AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
