# Backend API

Node.js/Express backend for OR patient tracking system.

## Tech Used

Node.js, Express, TypeScript, Sequelize, PostgreSQL, JWT, bcrypt

## Setup

Need Node.js 18+ and PostgreSQL installed.

```bash
cd server
pnpm install
```

## Database

Create PostgreSQL database:

```sql
CREATE DATABASE or_tracking;
```

Then create tables:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  mrn VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL
);

INSERT INTO stages (name, color) VALUES
('Arrived', '#3498db'),
('Pre-Op', '#f39c12'),
('Ready', '#27ae60'),
('In Theatre', '#e74c3c'),
('Recovery', '#9b59b6'),
('Discharged', '#95a5a6');

CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  visit_tracking_id VARCHAR(30) UNIQUE NOT NULL,
  patient_id INTEGER REFERENCES patients(id),
  current_stage_id INTEGER REFERENCES stages(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Config

Update `.env` file:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=or_tracking
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=some_random_secret
```

## Create Test User

Generate password hash:

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('admin123', 10, (err, hash) => console.log(hash));
```

Insert user:

```sql
INSERT INTO users (username, password_hash, name, role)
VALUES ('admin', 'your_bcrypt_hash_here', 'Admin User', 'admin');
```

## Running

```bash
pnpm run dev
```

Server runs on http://localhost:3000

## API Endpoints

**Auth:**
- POST /api/auth/login

**Visits:**
- GET /api/visits
- POST /api/visits
- PUT /api/visits/:id/stage

**Health:**
- GET /health

All visit endpoints need JWT token in Authorization header.

## Project Structure

```
server/
├── src/
│   ├── config/          - Database setup
│   ├── models/          - Sequelize models
│   ├── controllers/     - Request handlers
│   ├── routes/          - API routes
│   ├── middleware/      - Auth middleware
│   └── server.ts        - Main file
├── package.json
└── tsconfig.json
```
