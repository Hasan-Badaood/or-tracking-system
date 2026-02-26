# OR Patient Tracking System

A full-stack Operating Room Patient Tracking System built with React, TypeScript, Node.js, and PostgreSQL.

## 🏗️ Project Structure

```
Operatingtheatre/
├── server/          # Backend API (Node.js + Express + PostgreSQL)
├── client/          # Frontend (React + TypeScript + Vite)
└── README.md        # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **pnpm** (recommended package manager)
- **PostgreSQL** v12 or higher

### Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

### 1. Install Dependencies

Install dependencies for both backend and frontend:

```bash
# Install backend dependencies
cd server
pnpm install

# Install frontend dependencies
cd ../client
pnpm install
```

### 2. Database Setup

Create PostgreSQL database and tables (see `server/README.md` for detailed SQL scripts):

```bash
psql -U postgres
CREATE DATABASE or_tracking;
```

Then run the SQL scripts from `server/README.md` to create tables and seed data.

### 3. Configure Environment

Update `server/.env` with your database credentials:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=or_tracking
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd server
pnpm run dev
```
Backend runs on `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd client
pnpm run dev
```
Frontend runs on `http://localhost:5173`

## 📚 Documentation

- [Backend Documentation](./server/README.md) - API endpoints, database schema, setup
- [Frontend Documentation](./client/README.md) - Components, routing, features

## 🎯 Features

### Backend
- ✅ RESTful API with Express.js
- ✅ PostgreSQL database with Sequelize ORM
- ✅ JWT authentication
- ✅ User management (Admin, Nurse, Reception roles)
- ✅ Patient and visit tracking
- ✅ Stage-based workflow management

### Frontend
- ✅ Modern React 18 with TypeScript
- ✅ shadcn/ui component library
- ✅ Tailwind CSS styling
- ✅ Protected routes with authentication
- ✅ Real-time visit tracking dashboard
- ✅ Auto-refresh functionality
- ✅ Responsive design

## 🔧 Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- Axios
- Lucide Icons

**Backend:**
- Node.js
- Express.js
- TypeScript
- Sequelize ORM
- PostgreSQL
- JWT
- bcrypt

## 📝 Default Credentials

Create a test user using bcrypt hash in the database (see `server/README.md`).

Example:
- Username: `admin`
- Password: `admin123`

## 🛠️ Development Scripts

### Backend
```bash
pnpm run dev      # Start development server
pnpm run build    # Build TypeScript
```

### Frontend
```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run preview  # Preview production build
```

## 📦 Project Timeline

This project was developed from February 19-26, 2026:
- **Week 1 (Feb 19-21)**: Backend development
- **Week 2 (Feb 22-26)**: Frontend development and integration

## 🤝 Contributing

Internal project for University of Hertfordshire.

## 📄 License

Internal use only - OR Patient Tracking System

## 👤 Author

Hasan-Badaood (hb25abz@herts.ac.uk)
