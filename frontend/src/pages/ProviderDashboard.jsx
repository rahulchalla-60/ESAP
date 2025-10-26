import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService, handleApiError } from "../config/api.js";
import { useSocket } from "../hooks/useSocket";
import chatService from "../services/chatService";
import ChatModal from "../components/ChatModal";
import ConnectionStatus from "../components/ConnectionStatus";
import "./ProviderDashboard.css";

const ProviderDashboard = () => {
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Chat-related state
  const [activeTab, setActiveTab] = useState('services'); // 'services' or 'chat'
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Socket connection
  const { isConnected, connectionError, reconnectAttempts } = useSocket();

  const [serviceForm, setServiceForm] = useState({
    serviceName: "",
    description: "",
    price: "",
    media: [],
  });

  const [servicePreviews, setServicePreviews] = useState([]);

  // Check authentication and load data
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    loadUserProfile();
  }, [navigate]);

  // Reload services when user is loaded
  useEffect(() => {
    if (user && user.role === "provider") {
      loadServices();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const response = await apiService.user.getProfile();
      setUser(response.data);
      
      // If user is not a provider, redirect
      if (response.data.role !== "provider") {
        navigate("/home");
        return;
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await apiService.services.getAll();
      
      // Filter services to show only the provider's services
      const userServices = response.data.services.filter(
        service => service.provider._id === user._id
      );
      
      setServices(userServices);
    } catch (error) {
      console.error("Error loading services:", error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Convert file to base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleServiceChange = async (e) => {
    if (e.target.name === "media") {
      const files = Array.from(e.target.files);
      const newPreviews = [];
      const newMedia = [];
      
      for (const file of files) {
        newPreviews.push(URL.createObjectURL(file));
        const base64 = await toBase64(file);
        const [meta, data] = base64.split(",");
        const contentType = meta.match(/:(.*?);/)[1];
        newMedia.push({
          data: data,
          contentType,
          filename: file.name,
        });
      }
      
      setServicePreviews(newPreviews);
      setServiceForm((prev) => ({
        ...prev,
        media: newMedia,
      }));
    } else {
      setServiceForm((prev) => ({
        ...prev,
        [e.target.name]: e.target.value,
      }));
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    setMessage("");
    
    try {
      await apiService.services.create(serviceForm);
      
      setMessage("Service created successfully!");
      setShowCreateForm(false);
      resetServiceForm();
      loadServices(); // Reload services
    } catch (error) {
      setMessage(handleApiError(error));
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      serviceName: service.serviceName,
      description: service.description,
      price: service.price.toString(),
      media: service.media || [],
    });
    setServicePreviews(service.media?.map(item => 
      `data:${item.contentType};base64,${item.data}`
    ) || []);
    setShowCreateForm(true);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    setMessage("");
    
    try {
      await apiService.services.update(editingService._id, serviceForm);
      
      setMessage("Service updated successfully!");
      setShowCreateForm(false);
      setEditingService(null);
      resetServiceForm();
      loadServices();
    } catch (error) {
      setMessage(handleApiError(error));
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm("Are you sure you want to delete this service?")) {
      return;
    }
    
    try {
      await apiService.services.delete(serviceId);
      
      setMessage("Service deleted successfully!");
      loadServices();
    } catch (error) {
      setMessage(handleApiError(error));
    }
  };

  const resetServiceForm = () => {
    setServiceForm({
      serviceName: "",
      description: "",
      price: "",
      media: [],
    });
    setServicePreviews([]);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Chat functions
  const loadConversations = async () => {
    if (!user || !isConnected) return;

    setChatLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/chat/conversations/provider/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    setIsChatModalOpen(true);
  };

  const handleCloseChatModal = () => {
    setIsChatModalOpen(false);
    setSelectedConversation(null);
  };

  const formatLastMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUnreadCount = (conversation) => {
    if (!conversation.unreadCounts || !user) return 0;
    return conversation.unreadCounts[user._id] || 0;
  };

  // Load conversations when user is loaded and socket is connected
  useEffect(() => {
    if (user && user.role === "provider" && isConnected && activeTab === 'chat') {
      loadConversations();
    }
  }, [user, isConnected, activeTab]);

  const formatPrice = (price) => {
    return `$${price}`;
  };

  const renderServiceMedia = (media) => {
    if (!media || media.length === 0) {
      return <div className="no-media">No images</div>;
    }
    
    return (
      <div className="service-media">
        {media.map((item, index) => (
          <img
            key={index}
            src={`data:${item.contentType};base64,${item.data}`}
            alt={`Service media ${index + 1}`}
            className="service-image"
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <h1>Provider Dashboard</h1>
          <p>Welcome, {user?.name}!</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => {
              setShowCreateForm(true);
              setEditingService(null);
              resetServiceForm();
            }} 
            className="create-btn"
          >
            Create New Service
          </button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Your Services ({services.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Chat Inbox ({conversations.length})
          {conversations.some(conv => getUnreadCount(conv) > 0) && (
            <span className="unread-indicator"></span>
          )}
        </button>
        <div className="connection-status-container">
          <ConnectionStatus 
            isConnected={isConnected}
            reconnectAttempts={reconnectAttempts}
            connectionError={connectionError}
          />
        </div>
      </div>

      {/* Create/Edit Service Form */}
      {showCreateForm && (
        <div className="form-overlay">
          <div className="form-modal">
            <h2>{editingService ? "Edit Service" : "Create New Service"}</h2>
            <form onSubmit={editingService ? handleUpdateService : handleCreateService}>
              <input
                name="serviceName"
                placeholder="Service Name"
                value={serviceForm.serviceName}
                onChange={handleServiceChange}
                required
              />
              <textarea
                name="description"
                placeholder="Service Description"
                value={serviceForm.description}
                onChange={handleServiceChange}
                rows="3"
              />
              <input
                name="price"
                type="number"
                placeholder="Price"
                value={serviceForm.price}
                onChange={handleServiceChange}
                required
              />
              <input
                name="media"
                type="file"
                accept="image/*"
                multiple
                onChange={handleServiceChange}
              />
              {servicePreviews.length > 0 && (
                <div className="service-previews">
                  {servicePreviews.map((preview, index) => (
                    <img key={index} src={preview} alt={`Preview ${index + 1}`} />
                  ))}
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  {editingService ? "Update Service" : "Create Service"}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingService(null);
                    resetServiceForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'services' && (
        <div className="services-section">
          <h2>Your Services ({services.length})</h2>
        {services.length === 0 ? (
          <div className="no-services">
            <p>You haven't created any services yet.</p>
            <button 
              onClick={() => {
                setShowCreateForm(true);
                setEditingService(null);
                resetServiceForm();
              }}
              className="create-first-btn"
            >
              Create Your First Service
            </button>
          </div>
        ) : (
          <div className="services-grid">
            {services.map((service) => (
              <div key={service._id} className="service-card">
                {renderServiceMedia(service.media)}
                <div className="service-info">
                  <h3>{service.serviceName}</h3>
                  <p className="service-description">{service.description}</p>
                  <p className="service-price">{formatPrice(service.price)}</p>
                  {service.ratings > 0 && (
                    <div className="service-rating">⭐ {service.ratings}/5</div>
                  )}
                  <div className="service-actions">
                    <button 
                      onClick={() => handleEditService(service)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteService(service._id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Chat Inbox Section */}
      {activeTab === 'chat' && (
        <div className="chat-section">
          <h2>Chat Inbox ({conversations.length})</h2>
          {chatLoading ? (
            <div className="chat-loading">
              <div className="loading-spinner"></div>
              <span>Loading conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="no-conversations">
              <div className="empty-chat-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>No conversations yet</h3>
              <p>When customers message you about your services, their conversations will appear here.</p>
            </div>
          ) : (
            <div className="conversations-list">
              {conversations.map((conversation) => {
                const otherParticipant = conversation.participants.find(p => p.userId !== user._id);
                const unreadCount = getUnreadCount(conversation);
                
                return (
                  <div 
                    key={conversation._id} 
                    className={`conversation-item ${unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <div className="conversation-avatar">
                      {otherParticipant?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="conversation-content">
                      <div className="conversation-header">
                        <h4 className="participant-name">
                          {otherParticipant?.name || 'Unknown User'}
                        </h4>
                        <span className="conversation-time">
                          {conversation.lastMessage ? 
                            formatLastMessageTime(conversation.lastMessage.timestamp) : 
                            formatLastMessageTime(conversation.createdAt)
                          }
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <p className="last-message">
                          {conversation.lastMessage ? 
                            conversation.lastMessage.content : 
                            'No messages yet'
                          }
                        </p>
                        {unreadCount > 0 && (
                          <span className="unread-count">{unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Chat Modal */}
      {isChatModalOpen && selectedConversation && (
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={handleCloseChatModal}
          providerId={selectedConversation.participants.find(p => p.userId !== user._id)?.userId}
          providerName={selectedConversation.participants.find(p => p.userId !== user._id)?.name || 'User'}
          serviceId={selectedConversation.serviceId}
        />
      )}
    </div>
  );
};

export default ProviderDashboard; 