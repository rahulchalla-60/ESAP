import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ProviderDashboard.css";

const ProviderDashboard = () => {
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

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
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/services", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("All services:", response.data.services);
      console.log("Current user ID:", user?._id);
      
      // For debugging: show all services first
      if (response.data.services.length > 0) {
        console.log("First service provider ID:", response.data.services[0].provider._id);
        console.log("Current user ID:", user._id);
        console.log("Are they equal?", response.data.services[0].provider._id === user._id);
      }
      
      // Filter services to show only the provider's services
      const userServices = response.data.services.filter(
        service => service.provider._id === user._id
      );
      
      console.log("Filtered services for user:", userServices);
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
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/api/services", serviceForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage("Service created successfully!");
      setShowCreateForm(false);
      resetServiceForm();
      loadServices(); // Reload services
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create service");
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
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/services/${editingService._id}`, serviceForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage("Service updated successfully!");
      setShowCreateForm(false);
      setEditingService(null);
      resetServiceForm();
      loadServices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update service");
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm("Are you sure you want to delete this service?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/services/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage("Service deleted successfully!");
      loadServices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete service");
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

      {/* Services List */}
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
    </div>
  );
};

export default ProviderDashboard; 