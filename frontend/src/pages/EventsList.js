import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import './Events.css';

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data);
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getAvailableSpots = (event) => {
    return event.capacity - event.attendees.length;
  };

  const isEventFull = (event) => {
    return event.attendees.length >= event.capacity;
  };

  const isUserRegistered = (event) => {
    if (!user) return false;
    return event.attendees.some(attendee => attendee._id === user.id || attendee === user.id);
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="events-container">
      <div className="events-header">
        <h1>Upcoming Events</h1>
        <p>Discover and join amazing events in your area</p>
      </div>

      {events.length === 0 ? (
        <div className="no-events">
          <h2>No events available yet</h2>
          <p>Be the first to create an event!</p>
          {user && (
            <Link to="/create-event" className="btn-primary">
              Create Event
            </Link>
          )}
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div key={event._id} className="event-card">
              {event.image && (
                <div className="event-image">
                  <img 
                    src={`http://localhost:5000${event.image}`} 
                    alt={event.title}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x200?text=Event+Image';
                    }}
                  />
                </div>
              )}
              <div className="event-content">
                <h3>{event.title}</h3>
                <p className="event-description">{event.description}</p>
                
                <div className="event-details">
                  <div className="event-detail-item">
                    <span className="icon">📅</span>
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="icon">📍</span>
                    <span>{event.location}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="icon">👥</span>
                    <span>
                      {event.attendees.length} / {event.capacity} attendees
                    </span>
                  </div>
                </div>

                <div className="event-footer">
                  {isEventFull(event) ? (
                    <span className="badge badge-full">Event Full</span>
                  ) : (
                    <span className="badge badge-available">
                      {getAvailableSpots(event)} spots left
                    </span>
                  )}
                  
                  {isUserRegistered(event) && (
                    <span className="badge badge-registered">✓ Registered</span>
                  )}
                </div>

                <Link to={`/events/${event._id}`} className="btn-view">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsList;
