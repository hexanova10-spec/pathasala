-- PATHASHALA AI initial PostgreSQL schema (safe to run repeatedly).
-- Full application records are retained in JSONB payloads while frequently queried
-- fields are indexed relational columns for class/role/assignment lookups.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS homework (
  id TEXT PRIMARY KEY,
  class_num INTEGER NOT NULL CHECK (class_num BETWEEN 1 AND 12),
  teacher_id TEXT,
  due_date DATE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homework_class_due_idx ON homework (class_num, due_date);
CREATE INDEX IF NOT EXISTS homework_teacher_idx ON homework (teacher_id);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS submissions_assignment_student_idx
  ON submissions (assignment_id, student_id);
CREATE INDEX IF NOT EXISTS submissions_student_idx ON submissions (student_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions (status);

CREATE TABLE IF NOT EXISTS class_recordings (
  id TEXT PRIMARY KEY,
  class_num INTEGER NOT NULL CHECK (class_num BETWEEN 1 AND 12),
  teacher_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS class_recordings_class_idx ON class_recordings (class_num);
CREATE INDEX IF NOT EXISTS class_recordings_teacher_idx ON class_recordings (teacher_id);


CREATE TABLE IF NOT EXISTS student_reports (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_num INTEGER NOT NULL CHECK (class_num BETWEEN 1 AND 12),
  teacher_id TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_reports_student_idx ON student_reports (student_id);
CREATE INDEX IF NOT EXISTS student_reports_teacher_class_idx ON student_reports (teacher_id, class_num);

CREATE TABLE IF NOT EXISTS parent_reports (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_reports_student_status_idx ON parent_reports (student_id, status);
