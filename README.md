# Service Marketplace Web Application

A full-stack web application that enables users to register, authenticate, and manage service listings. The platform supports both service providers and customers, allowing providers to create and manage their offerings, while customers can browse and search for services.

## Features
- User registration, login, and JWT-based authentication
- Role-based access for service providers and customers
- Service creation, update, deletion, and retrieval
- Image upload and cloud storage integration (Cloudinary)
- Responsive React frontend with protected routes
- RESTful API with Express and MongoDB

## Tech Stack
- **Frontend:** React, Vite, React Router, Axios, ESLint
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Multer, Cloudinary

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- MongoDB Atlas or local MongoDB instance
- Cloudinary account (for image uploads)

### Environment Variables
Create a `.env` file in the `backend/` directory with the following:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

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
