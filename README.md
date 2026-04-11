# 🚀 NU Delivery

A full-stack MERN (MongoDB, Express, React, Node.js) web application that enables students of NIIT University to coordinate delivery of orders from the campus gate to inside campus.

![NU Delivery Banner](https://via.placeholder.com/1200x400/2563eb/ffffff?text=NU+Delivery+-+Campus+Food+Delivery+Platform)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Socket.io Events](#socketio-events)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🔐 Authentication
- **Google OAuth 2.0** integration
- **Domain-restricted access** - Only `@st.niituniversity.in` emails allowed
- **Automatic user creation** on first login
- **Phone number collection** for new users

### 📦 Order Management
- **Create Orders** with platform selection, items, expected time, and optional screenshot
- **Real-time countdown timers** showing time remaining
- **Urgency highlighting** for orders with &lt;15 minutes remaining
- **Edit and Delete** orders (owner only)

### 🤝 Delivery System
- **Offer Delivery** with custom pricing
- **View Offers** with delivery person details
- **Accept/Reject** offers (order owner)
- **Real-time notifications** via Socket.io

### 📱 User Interface
- **Responsive design** using Tailwind CSS
- **Mobile-first approach**
- **Clean, modern UI** with intuitive navigation
- **Filter by platform** and urgency
- **Order history** tracking

### ⚡ Real-time Features
- **Live order updates** using Socket.io
- **Instant offer notifications**
- **Order status changes** broadcast immediately
- **Auto-expiry** handling

## 🛠 Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Router DOM** for navigation
- **Axios** for HTTP requests
- **Socket.io Client** for real-time communication
- **Lucide React** for icons
- **date-fns** for date formatting

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Passport.js** with Google OAuth 2.0
- **Socket.io** for WebSocket connections
- **Multer** for file uploads
- **Express Session** with MongoDB store
- **CORS** for cross-origin requests

### Database
- **MongoDB** (local or Atlas)
- **Mongoose** schemas with validation
- **Indexing** for performance

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5.0 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **npm** or **yarn** (comes with Node.js)
- **Google Cloud Console** account for OAuth credentials

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nu-delivery.git
cd nu-delivery