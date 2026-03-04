# OR Patient Tracking System

Full-stack web application for tracking patients in operating room environments. Built for University of Hertfordshire coursework.

## Project Structure

```
Operatingtheatre/
├── server/          - Backend API
├── client/          - Frontend application
└── README.md
```

## Setup Instructions

### Requirements

- Node.js v18+
- PostgreSQL 12+
- pnpm package manager

Install pnpm if you don't have it:
```bash
npm install -g pnpm
```

### Installation

1. Install dependencies:
```bash
cd server
pnpm install

cd ../client
pnpm install
```

2. Set up PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE or_tracking;
```

Run the SQL scripts in `server/README.md` to create tables.

3. Configure environment variables in `server/.env` (copy from `server/.env.example`):
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=or_tracking
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

4. Seed the database (stages, rooms, and default users):
```bash
cd server
pnpm seed
```

5. Start both servers:

Backend (port 3000):
```bash
cd server
pnpm run dev
```

Frontend (port 5173):
```bash
cd client
pnpm run dev
```

## Features Implemented

Backend:
- REST API with Express
- PostgreSQL database using Sequelize
- JWT-based authentication with token blacklist on logout
- User roles (Admin, Nurse, Reception)
- Patient and visit management
- Workflow stage tracking
- OTP-gated family portal
- Barcode generate and scan
- Rate limiting and brute-force lockout

Frontend:
- React with TypeScript
- Tailwind CSS and shadcn/ui components
- Protected routes
- Dashboard with visit tracking
- Auto-refresh every 30 seconds

## Tech Stack

Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Axios

Backend: Node.js, Express, TypeScript, Sequelize, PostgreSQL, JWT, bcrypt, Nodemailer

## Default credentials

| Username   | Password     | Role      |
|------------|--------------|-----------|
| admin      | admin123     | Admin     |
| nurse1     | nurse123     | Nurse     |
| reception  | reception123 | Reception |

## Development

Backend:
```bash
pnpm run dev      # development
pnpm run build    # compile TypeScript
pnpm seed         # seed database
```

Frontend:
```bash
pnpm run dev      # development
pnpm run build    # production build
pnpm run preview  # preview build
```

## Testing the API (Postman)

Import `OR Tracking API.postman_collection.json` into Postman. The collection covers all 9 route groups with 30 requests.

**Run Login first** — it automatically saves the JWT to `{{token}}` so every other request works without manual setup.

Suggested order:

1. Auth → Login
2. Stages → List All Stages (check the stage IDs from seed)
3. Rooms → List All Rooms (note the room IDs)
4. Visits → Create Visit (saves `{{visitId}}` automatically)
5. Visits → work through Get, Update Stage, Timeline
6. Users → Create User (saves `{{userId}}` automatically)
7. Reports → Daily Summary and Stage Duration
8. Barcode → Generate, then Scan (use the tracking ID from Create Visit)
9. Family Portal → Request OTP, then check the server console for the code, then Verify OTP
10. Auth → Logout, then "Use token after logout" (tests the blacklist)

**Family portal notes:** OTP codes are printed to the server console as `[DEV] OTP SMS to ...: 123456` since email/SMS delivery is not configured by default. Copy that code into the Verify OTP request body.

**Delete Visit** sets `active = false` rather than hard deleting. If a visit you need for family portal testing ends up inactive, create a new one before running Request OTP.

---

Project developed 2026 for University of Hertfordshire.

Author: Hasan Badaood — hb25abz@herts.ac.uk
