# 🎉 Event Platform - MERN Stack Application

A full-stack event management platform built with MongoDB, Express.js, React.js, and Node.js (MERN Stack). Users can create events, RSVP to events, and manage their event attendance with real-time capacity tracking and concurrency handling.

## 🌐 Live Demo

- **Frontend**: https://event-platform-mern-a746m4blr-gowri-priyas-projects.vercel.app/
- **Backend**:https://event-platform-mern.onrender.com

## 📋 Features Implemented

### Core Features
- ✅ **User Authentication**
  - Secure registration and login with JWT tokens
  - Password hashing with bcryptjs
  - Protected routes with authentication middleware

- ✅ **Event Management (CRUD)**
  - Create events with title, description, date, location, and capacity
  - Upload event images (up to 5MB)
  - Edit events (only by creator)
  - Delete events (only by creator)
  - View all upcoming events

- ✅ **RSVP System with Capacity Enforcement**
  - Users can RSVP to events
  - Cancel RSVP functionality
  - Real-time capacity tracking
  - Prevents duplicate RSVPs
  - **Concurrency handling** to prevent overbooking

- ✅ **User Dashboard**
  - View events created by user
  - View events user is attending
  - Tab-based navigation

- ✅ **Responsive Design**
  - Mobile-first approach
  - Works seamlessly on Desktop, Tablet, and Mobile
  - Modern gradient UI with purple theme

### Bonus Features
- ✅ Image upload and display for events
- ✅ Advanced form validation
- ✅ Real-time attendee count
- ✅ User profile display in navbar

## 🛡️ Critical Feature: Concurrency Handling

### The Problem
When multiple users try to RSVP to an event simultaneously for the last available spot, there's a risk of "overbooking" - where more users than the capacity limit can register due to race conditions.

### Our Solution: MongoDB Transactions with Session Locking

We implemented **MongoDB transactions** to handle concurrent RSVP requests atomically. This ensures data consistency and prevents race conditions.

#### Implementation (backend/routes/events.js)

```javascript
// RSVP to event (WITH CONCURRENCY HANDLING)
router.post('/:id/rsvp', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find event with session lock
    const event = await Event.findById(req.params.id).session(session);

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already registered
    const isAlreadyRegistered = event.attendees.some(
      attendee => attendee.toString() === req.user.id
    );

    if (isAlreadyRegistered) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Already registered' });
    }

    // Check capacity (CRITICAL FOR PREVENTING OVERBOOKING)
    if (event.attendees.length >= event.capacity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Event is full' });
    }

    // Add user to attendees
    event.attendees.push(req.user.id);
    await event.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    const updatedEvent = await Event.findById(event._id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    res.json({ message: 'RSVP successful', event: updatedEvent });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'RSVP failed', error: error.message });
  }
});
```

#### How It Works

1. **Start Transaction**: `mongoose.startSession()` creates a new database session
2. **Session Lock**: `findById().session(session)` locks the event document
3. **Atomic Operations**: All checks and updates happen within the transaction
4. **Commit or Abort**: 
   - If all checks pass → `commitTransaction()` saves changes
   - If any check fails → `abortTransaction()` rolls back changes
5. **Guaranteed Consistency**: Only one user can modify the event at a time

#### Why This Prevents Race Conditions

- **Isolation**: Each transaction operates independently
- **Atomicity**: All operations succeed or fail together (no partial updates)
- **Locking**: MongoDB locks the document during the transaction
- **Sequential Processing**: Even with simultaneous requests, transactions are processed sequentially

#### Testing Concurrency

To verify this works:
1. Create an event with capacity 2
2. Open 2 browser windows with different users
3. Both users click RSVP at exactly the same time
4. Result: Only 2 users will be registered, the 3rd attempt fails with "Event is full"

## 🚀 Running Locally

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- Git

### Backend Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd event-platform
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Create `.env` file in backend folder:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
```

4. Start the backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Install frontend dependencies:
```bash
cd frontend
npm install
```

2. Create `.env` file in frontend folder:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

3. Start the frontend:
```bash
npm start
```

Frontend will open at `http://localhost:3000`

## 📁 Project Structure

```
event-platform/
├── backend/
│   ├── models/
│   │   ├── User.js           # User schema with password hashing
│   │   └── Event.js          # Event schema with attendees
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   └── events.js         # Event CRUD and RSVP routes
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── uploads/              # Event images storage
│   ├── server.js             # Express server setup
│   └── .env                  # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js     # Navigation bar
│   │   │   └── Navbar.css
│   │   ├── pages/
│   │   │   ├── EventsList.js      # Home page - all events
│   │   │   ├── EventDetail.js     # Single event details
│   │   │   ├── CreateEvent.js     # Create event form
│   │   │   ├── EditEvent.js       # Edit event form
│   │   │   ├── MyEvents.js        # User dashboard
│   │   │   ├── Login.js           # Login page
│   │   │   └── Register.js        # Registration page
│   │   ├── context/
│   │   │   └── AuthContext.js     # Global auth state
│   │   ├── utils/
│   │   │   └── api.js             # Axios configuration
│   │   ├── App.js                 # Main app with routing
│   │   └── App.css                # Global styles
│   └── .env                       # Environment variables
│
└── README.md
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Frontend
- **React.js** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Context API** - State management
- **CSS3** - Styling with gradients and flexbox

## 🌐 Deployment

### Backend (https://event-platform-mern.onrender.com)
1. Push code to GitHub
2. Connect Render to GitHub repo
3. Set environment variables
4. Deploy with Node.js runtime

### Frontend (https://event-platform-mern-a746m4blr-gowri-priyas-projects.vercel.app/)
1. Connect Vercel to GitHub repo
2. Set `REACT_APP_API_URL` to backend URL
3. Deploy with Create React App preset

## 📸 Screenshots

[Add screenshots of your application here]
- Home page with events list
- Event details page
- Create event form
- User dashboard
- Mobile responsive view

## 🧪 Testing Guide

### Manual Testing
1. **Register** a new user
2. **Create** an event with image
3. **RSVP** to events
4. **Edit** your own events
5. **Delete** your events
6. Test **capacity limits**
7. Test **concurrent RSVPs** (2 browsers)
8. Test on **mobile devices**

### Capacity Testing
```
1. Create event with capacity 2
2. Open Chrome and Firefox
3. Register user1 in Chrome
4. Register user2 in Firefox
5. Both RSVP simultaneously
6. Verify only 2 users registered
7. Try with 3rd user → Should fail
```

## 🔐 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token-based authentication
- Protected API routes
- Input validation on backend
- File upload size limits (5MB)
- Image type restrictions (JPEG, PNG, GIF)
- CORS configuration
- SQL injection prevention (MongoDB)

## 🚧 Future Enhancements

- Email notifications for RSVPs
- Event categories and filtering
- Search functionality
- Google Maps integration
- Calendar view
- AI-powered event descriptions
- Social sharing
- Event reminders
- Payment integration for paid events

## 👨‍💻 Author

**Gowri Priya**
- GitHub: @gouripriya-17
- Email: gowripriya.kaluvacharla@gmail.com

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Assignment provided by Fission Infotech
- MongoDB Atlas for database hosting
- Render and Vercel for free deployment
- React community for excellent documentation

---

**Note**: This project was created as part of a technical screening assignment for a Full Stack Developer Intern position.
