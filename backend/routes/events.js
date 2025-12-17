const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('creator', 'name email')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create event (with image upload)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, date, location, capacity } = req.body;

    // Validation
    if (!title || !description || !date || !location || !capacity) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const eventData = {
      title,
      description,
      date,
      location,
      capacity: parseInt(capacity),
      creator: req.user.id,
      attendees: [],
      image: req.file ? `/uploads/${req.file.filename}` : ''
    };

    const event = new Event(eventData);
    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('creator', 'name email');

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update event
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const { title, description, date, location, capacity } = req.body;

    // Update fields
    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = date;
    if (location) event.location = location;
    if (capacity) event.capacity = parseInt(capacity);
    if (req.file) event.image = `/uploads/${req.file.filename}`;

    await event.save();

    const updatedEvent = await Event.findById(event._id)
      .populate('creator', 'name email');

    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    // Delete image file if exists
    if (event.image) {
      const imagePath = path.join(__dirname, '..', event.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// RSVP to event (WITH CONCURRENCY HANDLING - MOST IMPORTANT!)
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

    // Check if event date has passed
    if (new Date(event.date) < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot RSVP to past events' });
    }

    // Check if user is already registered
    const isAlreadyRegistered = event.attendees.some(
      attendee => attendee.toString() === req.user.id
    );

    if (isAlreadyRegistered) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'You are already registered for this event' });
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

    res.json({ 
      message: 'RSVP successful', 
      event: updatedEvent 
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('RSVP Error:', error);
    res.status(500).json({ message: 'RSVP failed', error: error.message });
  }
});

// Cancel RSVP
router.post('/:id/cancel-rsvp', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is registered
    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee.toString() === req.user.id
    );

    if (attendeeIndex === -1) {
      return res.status(400).json({ message: 'You are not registered for this event' });
    }

    // Remove user from attendees
    event.attendees.splice(attendeeIndex, 1);
    await event.save();

    const updatedEvent = await Event.findById(event._id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    res.json({ 
      message: 'RSVP cancelled successfully', 
      event: updatedEvent 
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's created events
router.get('/user/created', auth, async (req, res) => {
  try {
    const events = await Event.find({ creator: req.user.id })
      .populate('creator', 'name email')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's attending events
router.get('/user/attending', auth, async (req, res) => {
  try {
    const events = await Event.find({ attendees: req.user.id })
      .populate('creator', 'name email')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;