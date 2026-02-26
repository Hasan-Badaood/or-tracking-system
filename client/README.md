# Frontend

React application for OR patient tracking.

## Tech Used

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Axios

## Running

Make sure backend is running on port 3000 first.

```bash
cd client
pnpm install
pnpm run dev
```

Opens on http://localhost:5173

## Features

- Login authentication
- Dashboard showing active visits
- Create new patient visits
- Auto-refresh every 30 seconds
- Responsive design

## API Setup

API calls go to `http://localhost:3000/api` (configured in `src/api/client.ts`)

Change this if backend runs elsewhere.

## Login

Default credentials (if set up in backend):
- Username: admin
- Password: admin123

## Build

```bash
pnpm run build
pnpm run preview
```

## Common Issues

**CORS errors**: Check backend has CORS enabled for localhost:5173

**Can't connect**: Make sure backend server is running

**Build fails**: Try deleting node_modules and running pnpm install again
