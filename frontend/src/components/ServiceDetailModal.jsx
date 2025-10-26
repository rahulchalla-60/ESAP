import React, { useState, useEffect } from 'react';
import './ServiceDetailModal.css';
import ChatButton from './ChatButton';
import ChatModal from './ChatModal';

const ServiceDetailModal = ({ service, isOpen, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !service) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const nextImage = () => {
    if (service.media && service.media.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % service.media.length);
    }
  };

  const prevImage = () => {
    if (service.media && service.media.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + service.media.length) % service.media.length);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleContactProvider = () => {
    // You can implement contact functionality here
    alert(`Contact ${service.provider?.name} at ${service.provider?.contact || 'contact information not available'}`);
  };

  const handleSaveService = () => {
    // You can implement save functionality here
    alert('Service saved to your favorites!');
  };

  const handleChatWithProvider = (providerId, providerName) => {
    console.log(`Opening chat with provider ${providerName} (ID: ${providerId})`);
    setIsChatModalOpen(true);
  };

  const handleCloseChatModal = () => {
    setIsChatModalOpen(false);
  };

  return (
    <div className="service-modal-overlay" onClick={handleOverlayClick}>
      <div className="service-modal-container">
        {/* Header */}
        <div className="service-modal-header">
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="service-modal-content">
          {/* Left Section - Images */}
          <div className="service-modal-left">
            {service.media && service.media.length > 0 ? (
              <div className="image-gallery">
                <div className="main-image-container">
                  <img
                    src={`data:${service.media[currentImageIndex].contentType};base64,${service.media[currentImageIndex].data}`}
                    alt={service.serviceName}
                    className="main-image"
                  />
                  {service.media.length > 1 && (
                    <>
                      <button className="nav-button prev-button" onClick={prevImage}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button className="nav-button next-button" onClick={nextImage}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                
                {/* Image thumbnails */}
                {service.media.length > 1 && (
                  <div className="image-thumbnails">
                    {service.media.map((image, index) => (
                      <img
                        key={index}
                        src={`data:${image.contentType};base64,${image.data}`}
                        alt={`${service.serviceName} ${index + 1}`}
                        className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="no-image-placeholder">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <p>No images available</p>
              </div>
            )}
          </div>

          {/* Right Section - Details */}
          <div className="service-modal-right">
            <div className="service-details">
              {/* Service Title */}
              <h1 className="service-title">{service.serviceName}</h1>
              
              {/* Price */}
              <div className="price-section">
                <span className="price">${service.price}</span>
                <span className="price-label">Starting from</span>
              </div>

              {/* Provider Info */}
              <div className="provider-section">
                <div className="provider-header">
                  <div className="provider-avatar">
                    {service.provider?.photo ? (
                      <img
                        src={`data:${service.provider.photo.contentType};base64,${service.provider.photo.data}`}
                        alt={service.provider.name}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {service.provider?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="provider-info">
                    <h3 className="provider-name">{service.provider?.name || 'Unknown Provider'}</h3>
                    <p className="provider-contact">{service.provider?.contact}</p>
                    <span className="provider-role">Service Provider</span>
                  </div>
                </div>
              </div>

              {/* Service Description */}
              {service.description && (
                <div className="description-section">
                  <h3>About this service</h3>
                  <p className="service-description">{service.description}</p>
                </div>
              )}

              {/* Service Stats */}
              <div className="service-stats">
                <div className="stat-item">
                  <span className="stat-label">Listed on</span>
                  <span className="stat-value">{formatDate(service.createdAt)}</span>
                </div>
                {service.ratings && service.ratings > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Rating</span>
                    <span className="stat-value">
                      {service.ratings.toFixed(1)} ⭐
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <ChatButton
                  providerId={service.provider?._id}
                  providerName={service.provider?.name || 'Provider'}
                  isOnline={false} // TODO: This will be dynamic when online status is implemented
                  unreadCount={0} // TODO: This will be dynamic when message counting is implemented
                  onClick={handleChatWithProvider}
                />
                <button className="contact-button secondary" onClick={handleContactProvider}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Contact Provider
                </button>
                <button className="save-button secondary" onClick={handleSaveService}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Save Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={handleCloseChatModal}
        providerId={service.provider?._id}
        providerName={service.provider?.name || 'Provider'}
        providerAvatar={
          service.provider?.photo 
            ? `data:${service.provider.photo.contentType};base64,${service.provider.photo.data}`
            : null
        }
        isOnline={false} // TODO: This will be dynamic when online status is implemented
        lastSeen={null} // TODO: This will be dynamic when last seen tracking is implemented
      />
    </div>
  );
};

export default ServiceDetailModal;