# Service Marketplace Web Application

A full-stack web application that enables users to register, authenticate, and manage service listings. The platform supports both service providers and customers, allowing providers to create and manage their offerings, while customers can browse and search for services.

## Features
- User registration, login, and JWT-based authentication
- Role-based access for service providers and customers
- Service creation, update, deletion, and retrieval
- Image upload and storage in MongoDB
- Responsive React frontend with protected routes
- RESTful API with Express and MongoDB
- Comprehensive error handling and input validation
- Environment-based configuration

## Tech Stack
- **Frontend:** React, Vite, React Router, Axios, ESLint
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Express-Validator

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- MongoDB Atlas or local MongoDB instance

### Environment Variables

#### Backend Environment Variables
Create a `.env` file in the `backend/` directory with the following variables:

**Required Variables:**
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```

**Optional Variables (with defaults):**
```
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_EXPIRES_IN=30d
BCRYPT_ROUNDS=10
MAX_FILE_SIZE=52428800
```

#### Frontend Environment Variables
Create a `.env` file in the `frontend/` directory with the following:
```
VITE_API_BASE_URL=http://localhost:5000
```

**Environment Variable Descriptions:**

**Backend Variables:**
- `MONGO_URI` - MongoDB connection string (required)
- `JWT_SECRET` - Secret key for JWT token signing (required, min 32 chars)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)
- `JWT_EXPIRES_IN` - JWT token expiration time (default: 30d)
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 10)
- `MAX_FILE_SIZE` - Maximum file upload size in bytes (default: 50MB)

**Frontend Variables:**
- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:5000)

**Note:** You can copy the example files:
- Backend: `cp backend/.env.example backend/.env`
- Frontend: `cp frontend/.env.example frontend/.env`

### Installation
#### Backend
```bash
cd backend
npm install
# Start in development mode
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173` and the backend on `http://localhost:5000` by default.

## Scripts
### Backend
- `npm run dev` — Start backend with nodemon
- `npm start` — Start backend with Node.js

### Frontend
- `npm run dev` — Start frontend with Vite
- `npm run build` — Build frontend for production
- `npm run lint` — Lint frontend code
- `npm run preview` — Preview production build

## API Endpoints
### User Routes (`/api/users`)
- `POST /register` — Register a new user
- `POST /login` — Login and receive JWT
- `POST /logout` — Logout (client-side token removal)
- `GET /profile` — Get authenticated user's profile (protected)

### Service Routes (`/api/services`)
- `GET /` — List all services
- `POST /` — Create a new service (provider only, protected)
- `PUT /:id` — Update a service (provider only, protected)
- `DELETE /:id` — Delete a service (provider only, protected)

## License
This project is licensed under the ISC License.
