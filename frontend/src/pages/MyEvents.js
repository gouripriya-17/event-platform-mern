import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import './MyEvents.css';

const MyEvents = () => {
  const { user } = useContext(AuthContext);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('created');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyEvents();
    }
  }, [user]);

  const fetchMyEvents = async () => {
    try {
      const [created, attending] = await Promise.all([
        api.get('/events/user/created'),
        api.get('/events/user/attending')
      ]);
      setCreatedEvents(created.data);
      setAttendingEvents(attending.data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
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

  if (!user) {
    return (
      <div className="auth-required">
        <h2>Please login to view your events</h2>
        <Link to="/login" className="btn-primary">Go to Login</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading your events...</div>;
  }

  const displayEvents = activeTab === 'created' ? createdEvents : attendingEvents;

  return (
    <div className="my-events-container">
      <h1>My Events</h1>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'created' ? 'active' : ''}`}
          onClick={() => setActiveTab('created')}
        >
          Created Events ({createdEvents.length})
        </button>
        <button
          className={`tab ${activeTab === 'attending' ? 'active' : ''}`}
          onClick={() => setActiveTab('attending')}
        >
          Attending Events ({attendingEvents.length})
        </button>
      </div>

      <div className="events-content">
        {displayEvents.length === 0 ? (
          <div className="no-events">
            <h2>No events found</h2>
            <p>
              {activeTab === 'created' 
                ? "You haven't created any events yet."
                : "You haven't RSVP'd to any events yet."}
            </p>
            <Link to={activeTab === 'created' ? '/create-event' : '/'} className="btn-primary">
              {activeTab === 'created' ? 'Create Event' : 'Browse Events'}
            </Link>
          </div>
        ) : (
          <div className="events-grid">
            {displayEvents.map((event) => (
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

                  <Link to={`/events/${event._id}`} className="btn-view">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents;
