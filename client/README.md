# OR Patient Tracking System - Frontend

React-based frontend application for the Operating Room Patient Tracking System.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Re-usable component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icon library

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend server running on http://localhost:3000

## Installation

```bash
cd client
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Project Structure

```
client/
├── src/
│   ├── api/                    # API client and endpoints
│   │   ├── client.ts           # Axios instance with interceptors
│   │   ├── auth.ts             # Authentication API
│   │   └── visits.ts           # Visits API
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   └── label.tsx
│   │   ├── LoginForm.tsx       # Login form component
│   │   ├── VisitCard.tsx       # Visit display card
│   │   └── CreateVisitForm.tsx # Create visit form
│   ├── pages/
│   │   ├── LoginPage.tsx       # Login page
│   │   └── DashboardPage.tsx   # Main dashboard
│   ├── lib/
│   │   └── utils.ts            # Utility functions (cn)
│   ├── App.tsx                 # Main app with routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── components.json             # shadcn/ui config
```

## Features

### Authentication
- JWT-based authentication
- Protected routes
- Auto-redirect on token expiration
- Persistent login (localStorage)

### Dashboard
- Real-time visit list
- Auto-refresh every 30 seconds
- Manual refresh button
- Visit status badges with colors
- Responsive grid layout

### Visit Management
- Create new visits
- View patient information
- Track visit stages
- MRN-based patient lookup

### UI/UX
- Modern, clean design with shadcn/ui
- Responsive layout (mobile, tablet, desktop)
- Loading states
- Error handling
- Toast notifications ready

## API Configuration

The API base URL is configured in `src/api/client.ts`:

```typescript
baseURL: 'http://localhost:3000/api'
```

Update this if your backend runs on a different URL.

## Environment Variables

Create a `.env` file if you need to configure different API endpoints:

```
VITE_API_URL=http://localhost:3000/api
```

Then update `src/api/client.ts` to use:

```typescript
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
```

## Adding shadcn/ui Components

To add more shadcn/ui components:

```bash
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add select
```

## Default Credentials

Use the credentials created in the backend setup:

- **Username**: admin
- **Password**: admin123 (or whatever you set in the backend)

## Development Notes

- The app auto-refreshes visits every 30 seconds
- Token is stored in localStorage
- Protected routes automatically redirect to login if unauthenticated
- API errors are handled with user-friendly messages

## Future Enhancements

- Stage update functionality (drag-and-drop or modal)
- Visit details modal
- Real-time updates with WebSockets
- Search and filter visits
- Export reports
- Dark mode toggle
- Notifications system
- User management
- Audit logs

## Troubleshooting

### CORS Errors
Make sure the backend has CORS enabled for `http://localhost:5173`

### API Connection Refused
Ensure the backend server is running on port 3000

### Build Errors
Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## License

Internal use only - OR Patient Tracking System
