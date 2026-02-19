# OR Patient Tracking System - Backend

Backend API for the Operating Room Patient Tracking System.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Database Setup

Create the PostgreSQL database and tables:

```sql
-- Create database
CREATE DATABASE or_tracking;

-- Connect to the database
\c or_tracking

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  mrn VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stages table
CREATE TABLE stages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL
);

-- Insert stages
INSERT INTO stages (name, color) VALUES
('Arrived', '#3498db'),
('Pre-Op', '#f39c12'),
('Ready', '#27ae60'),
('In Theatre', '#e74c3c'),
('Recovery', '#9b59b6'),
('Discharged', '#95a5a6');

-- Visits table
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

### 3. Create Test User

```sql
-- Hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO users (username, password_hash, name, role)
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'System Admin', 'admin');
```

Note: You'll need to generate a proper bcrypt hash. You can use an online bcrypt generator or run:

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('admin123', 10, (err, hash) => console.log(hash));
```

### 4. Configure Environment

Update the `.env` file with your database credentials:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=or_tracking
DB_USER=postgres
DB_PASSWORD=your_actual_password
JWT_SECRET=your_jwt_secret_key_change_in_production
```

### 5. Run the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "System Admin",
    "role": "admin"
  }
}
```

### Visits

#### Get All Active Visits
```
GET /api/visits
Authorization: Bearer <token>
```

#### Create Visit
```
POST /api/visits
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient": {
    "mrn": "12345",
    "first_name": "John",
    "last_name": "Smith"
  }
}
```

#### Update Visit Stage
```
PUT /api/visits/:id/stage
Authorization: Bearer <token>
Content-Type: application/json

{
  "to_stage_id": 2
}
```

### Health Check
```
GET /health
```

## Development

- `npm run dev` - Start development server with ts-node
- `npm run build` - Build TypeScript to JavaScript

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.ts       # Database connection
│   ├── models/
│   │   ├── User.ts           # User model
│   │   ├── Patient.ts        # Patient model
│   │   ├── Visit.ts          # Visit model
│   │   └── Stage.ts          # Stage model
│   ├── routes/
│   │   ├── auth.ts           # Auth routes
│   │   └── visits.ts         # Visit routes
│   ├── controllers/
│   │   ├── authController.ts # Auth logic
│   │   └── visitController.ts # Visit logic
│   ├── middleware/
│   │   └── auth.ts           # JWT authentication
│   └── server.ts             # Main server file
├── package.json
├── tsconfig.json
└── .env
```

## Technologies Used

- Express.js - Web framework
- TypeScript - Type safety
- Sequelize - ORM
- PostgreSQL - Database
- JWT - Authentication
- bcrypt - Password hashing
