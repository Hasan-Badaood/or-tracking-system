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

3. Configure environment variables in `server/.env`:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=or_tracking
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

4. Start both servers:

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
- JWT-based authentication
- User roles (Admin, Nurse, Reception)
- Patient and visit management
- Workflow stage tracking

Frontend:
- React with TypeScript
- Tailwind CSS and shadcn/ui components
- Protected routes
- Dashboard with visit tracking
- Auto-refresh every 30 seconds

## Tech Stack

Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Axios

Backend: Node.js, Express, TypeScript, Sequelize, PostgreSQL, JWT, bcrypt

## Notes

You'll need to create a test user in the database. Check `server/README.md` for instructions on generating the bcrypt hash.

Default test credentials:
- Username: admin
- Password: admin123

## Development

Backend:
```bash
pnpm run dev      # development
pnpm run build    # compile TypeScript
```

Frontend:
```bash
pnpm run dev      # development
pnpm run build    # production build
pnpm run preview  # preview build
```

Project developed February 2026 for University of Hertfordshire.

Author: Hasan-Badaood (hb25abz@herts.ac.uk)
