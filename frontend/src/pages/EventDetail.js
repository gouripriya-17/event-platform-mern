import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import './EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
    } catch (err) {
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const response = await api.post(`/events/${id}/rsvp`);
      setEvent(response.data.event);
      alert('RSVP successful!');
    } catch (err) {
      alert(err.response?.data?.message || 'RSVP failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRSVP = async () => {
    setActionLoading(true);
    try {
      const response = await api.post(`/events/${id}/cancel-rsvp`);
      setEvent(response.data.event);
      alert('RSVP cancelled successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel RSVP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await api.delete(`/events/${id}`);
        alert('Event deleted successfully');
        navigate('/');
      } catch (err) {
        alert('Failed to delete event');
      }
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

  const isUserRegistered = () => {
    if (!user || !event) return false;
    return event.attendees.some(attendee => 
      attendee._id === user.id || attendee === user.id
    );
  };

  const isCreator = () => {
    if (!user || !event) return false;
    return event.creator._id === user.id || event.creator === user.id;
  };

  const isEventFull = () => {
    if (!event) return false;
    return event.attendees.length >= event.capacity;
  };

  if (loading) {
    return <div className="loading">Loading event details...</div>;
  }

  if (error || !event) {
    return (
      <div className="error-container">
        <h2>Event not found</h2>
        <Link to="/" className="btn-primary">Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="event-detail-container">
      <div className="event-detail-card">
        {event.image && (
          <div className="event-detail-image">
            <img 
              src={`http://localhost:5000${event.image}`} 
              alt={event.title}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/800x400?text=Event+Image';
              }}
            />
          </div>
        )}

        <div className="event-detail-content">
          <h1>{event.title}</h1>
          
          <div className="event-meta">
            <span className="meta-item">
              <span className="icon">👤</span>
              Created by: {event.creator.name}
            </span>
          </div>

          <div className="event-info-grid">
            <div className="info-item">
              <span className="icon">📅</span>
              <div>
                <strong>Date & Time</strong>
                <p>{formatDate(event.date)}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="icon">📍</span>
              <div>
                <strong>Location</strong>
                <p>{event.location}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="icon">👥</span>
              <div>
                <strong>Attendees</strong>
                <p>{event.attendees.length} / {event.capacity}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="icon">🎟️</span>
              <div>
                <strong>Available Spots</strong>
                <p>{event.capacity - event.attendees.length}</p>
              </div>
            </div>
          </div>

          <div className="event-description-section">
            <h2>About this event</h2>
            <p>{event.description}</p>
          </div>

          {event.attendees.length > 0 && (
            <div className="attendees-section">
              <h3>Attendees ({event.attendees.length})</h3>
              <div className="attendees-list">
                {event.attendees.map((attendee, index) => (
                  <div key={index} className="attendee-item">
                    <span className="attendee-avatar">
                      {attendee.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                    <span>{attendee.name || 'Anonymous'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="event-actions">
            {isCreator() ? (
              <>
                <Link to={`/events/${id}/edit`} className="btn-edit">
                  Edit Event
                </Link>
                <button onClick={handleDelete} className="btn-delete">
                  Delete Event
                </button>
              </>
            ) : (
              <>
                {isUserRegistered() ? (
                  <button 
                    onClick={handleCancelRSVP} 
                    className="btn-cancel"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Cancel RSVP'}
                  </button>
                ) : (
                  <button 
                    onClick={handleRSVP} 
                    className="btn-rsvp"
                    disabled={actionLoading || isEventFull()}
                  >
                    {actionLoading ? 'Processing...' : isEventFull() ? 'Event Full' : 'RSVP Now'}
                  </button>
                )}
              </>
            )}
            <Link to="/" className="btn-back">Back to Events</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
