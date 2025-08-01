# Lost & Found Platform

A fully-featured, community-driven web application built using the **MERN stack (MongoDB, Express.js, React.js, Node.js)** to solve the common issue of lost item recovery in college campuses and similar environments.

## Features

### Core Functionality
- **Public Browsing**: Browse lost/found posts without login
- **User Authentication**: Email-based registration and login system
- **Post Management**: Create and manage lost/found item posts
- **Real-time Chat**: Secure communication between users
- **Rating System**: Rate helpful users with star-based trust scores
- **Mobile Responsive**: Optimized for all devices

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **Real-time Communication**: Socket.io for instant messaging
- **MongoDB Database**: Scalable NoSQL data storage
- **RESTful APIs**: Well-structured backend endpoints
- **Protected Routes**: Role-based access control

## Project Structure

```
lost-found-platform/
├── backend/                 # Node.js + Express backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication & validation
│   ├── config/             # Database & environment config
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # State management
│   │   ├── utils/          # Helper functions
│   │   └── App.js          # Main app component
│   └── public/             # Static assets
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install backend dependencies: `cd backend && npm install`
3. Install frontend dependencies: `cd frontend && npm install`
4. Set up environment variables
5. Start MongoDB service
6. Run backend: `npm run dev`
7. Run frontend: `npm start`

## Technologies Used

- **Frontend**: React.js, React Router, Axios, Socket.io-client
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: WebSocket connections
- **Styling**: CSS3, Responsive Design

## Use Cases

- College campuses and hostels
- Corporate offices
- Libraries and public spaces
- Events and festivals
- Community centers

This platform encourages peer interaction, trust, and responsibility in shared spaces while providing a modern solution to item recovery.