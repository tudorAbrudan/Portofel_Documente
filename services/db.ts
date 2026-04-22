import * as SQLite from 'expo-sqlite';

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const db = SQLite.openDatabaseSync('documente.db');

db.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS document_pages (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    page_order INTEGER NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS persons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    last4 TEXT NOT NULL,
    expiry TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    issue_date TEXT,
    expiry_date TEXT,
    note TEXT,
    file_path TEXT,
    person_id TEXT,
    property_id TEXT,
    vehicle_id TEXT,
    card_id TEXT,
    animal_id TEXT,
    custom_type_id TEXT,
    metadata TEXT,
    auto_delete TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS animals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'câine',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_document_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fuel_records (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    date TEXT NOT NULL,
    liters REAL,
    km_total INTEGER,
    price REAL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicle_fuel_settings (
    vehicle_id TEXT PRIMARY KEY,
    service_km_interval INTEGER NOT NULL DEFAULT 10000,
    last_service_km INTEGER,
    last_service_date TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cui TEXT,
    reg_com TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_entities (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_doc_entities_doc ON document_entities(document_id);
  CREATE INDEX IF NOT EXISTS idx_doc_entities_entity ON document_entities(entity_type, entity_id);

  CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_docs_expiry ON documents(expiry_date);
  CREATE INDEX IF NOT EXISTS idx_docs_person ON documents(person_id);
  CREATE INDEX IF NOT EXISTS idx_docs_vehicle ON documents(vehicle_id);
  CREATE INDEX IF NOT EXISTS idx_docs_property ON documents(property_id);
  CREATE INDEX IF NOT EXISTS idx_pages_doc ON document_pages(document_id);
  CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_records(vehicle_id, date DESC);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at ASC);
  CREATE INDEX IF NOT EXISTS idx_chat_threads_updated ON chat_threads(updated_at DESC);
`);

// Migrare: adaugă custom_type_id dacă nu există
try {
  db.execSync('ALTER TABLE documents ADD COLUMN custom_type_id TEXT');
} catch {
  // coloana există deja
}

// Migrare: adaugă metadata dacă nu există
try {
  db.execSync('ALTER TABLE documents ADD COLUMN metadata TEXT');
} catch {
  // coloana există deja
}

// Migrare: adaugă animal_id dacă nu există
try {
  db.execSync('ALTER TABLE documents ADD COLUMN animal_id TEXT');
} catch {
  // coloana există deja
}

// Migrare: adaugă auto_delete dacă nu există
try {
  db.execSync('ALTER TABLE documents ADD COLUMN auto_delete TEXT');
} catch {
  // coloana există deja
}

// Index pe animal_id — creat după migrare pentru a garanta că există coloana
try {
  db.execSync('CREATE INDEX IF NOT EXISTS idx_docs_animal ON documents(animal_id)');
} catch {
  // indexul există deja sau coloana lipsă (fallback safe)
}

// Migrare: adaugă company_id dacă nu există
try {
  db.execSync('ALTER TABLE documents ADD COLUMN company_id TEXT');
} catch {
  // coloana există deja
}

// Index pe company_id
try {
  db.execSync('CREATE INDEX IF NOT EXISTS idx_docs_company ON documents(company_id)');
} catch {
  // indexul există deja
}

// Migrare: adaugă ocr_text dacă nu există
try {
  db.execSync('ALTER TABLE documents ADD COLUMN ocr_text TEXT');
} catch {
  // coloana există deja
}

// Migrare: deduplicare document_entities + UNIQUE index (previne duplicate la restart)
try {
  db.execSync(`
    DELETE FROM document_entities
    WHERE id NOT IN (
      SELECT MIN(id) FROM document_entities
      GROUP BY document_id, entity_type, entity_id
    )
  `);
  db.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_entities_unique
    ON document_entities(document_id, entity_type, entity_id)
  `);
} catch {
  // Index poate exista deja
}

// Migrare: populează document_entities din coloanele legacy (o singură dată)
// Cu UNIQUE index activ, INSERT OR IGNORE sare peste combinații existente
try {
  db.execSync(`
    INSERT OR IGNORE INTO document_entities (id, document_id, entity_type, entity_id)
    SELECT lower(hex(randomblob(16))), id, 'person', person_id
    FROM documents WHERE person_id IS NOT NULL
  `);
  db.execSync(`
    INSERT OR IGNORE INTO document_entities (id, document_id, entity_type, entity_id)
    SELECT lower(hex(randomblob(16))), id, 'vehicle', vehicle_id
    FROM documents WHERE vehicle_id IS NOT NULL
  `);
  db.execSync(`
    INSERT OR IGNORE INTO document_entities (id, document_id, entity_type, entity_id)
    SELECT lower(hex(randomblob(16))), id, 'property', property_id
    FROM documents WHERE property_id IS NOT NULL
  `);
  db.execSync(`
    INSERT OR IGNORE INTO document_entities (id, document_id, entity_type, entity_id)
    SELECT lower(hex(randomblob(16))), id, 'card', card_id
    FROM documents WHERE card_id IS NOT NULL
  `);
  db.execSync(`
    INSERT OR IGNORE INTO document_entities (id, document_id, entity_type, entity_id)
    SELECT lower(hex(randomblob(16))), id, 'animal', animal_id
    FROM documents WHERE animal_id IS NOT NULL
  `);
  db.execSync(`
    INSERT OR IGNORE INTO document_entities (id, document_id, entity_type, entity_id)
    SELECT lower(hex(randomblob(16))), id, 'company', company_id
    FROM documents WHERE company_id IS NOT NULL
  `);
} catch {
  // Migrare deja aplicată sau eroare neesențială
}

// Migrare: adaugă phone, email la persons dacă nu există
try {
  db.execSync('ALTER TABLE persons ADD COLUMN phone TEXT');
} catch {
  // coloana există deja
}
try {
  db.execSync('ALTER TABLE persons ADD COLUMN email TEXT');
} catch {
  // coloana există deja
}

// Migrare: adaugă file_hash la documents pentru detecție duplicate
try {
  db.execSync('ALTER TABLE documents ADD COLUMN file_hash TEXT');
} catch {
  // coloana există deja
}
try {
  db.execSync('CREATE INDEX IF NOT EXISTS idx_docs_file_hash ON documents(file_hash)');
} catch {
  // indexul există deja
}

// Notă privată — NU se trimite niciodată la AI. Vezi .claude/rules/ai-privacy.md
try {
  db.execSync('ALTER TABLE documents ADD COLUMN private_notes TEXT');
} catch {
  // coloana există deja
}
