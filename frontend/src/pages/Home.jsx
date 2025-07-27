import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const Home = () => {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Get user profile to check role
    const getUserProfile = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
        
        // If user is a provider, redirect them (providers shouldn't see this page)
        if (response.data.role === "provider") {
          navigate("/provider-dashboard"); // You can create this later
          return;
        }
        
        // Load services
        loadServices();
      } catch (error) {
        console.error("Error fetching user profile:", error);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    getUserProfile();
  }, [navigate]);

  const loadServices = async (search = "") => {
    try {
      setLoading(true);
      const url = `http://localhost:5000/api/services${search ? `?search=${encodeURIComponent(search)}` : ""}`;
      console.log("Fetching services from:", url);
      
      const response = await axios.get(url);
      console.log("Services response:", response.data);
      
      setServices(response.data.services || []);
    } catch (error) {
      console.error("Error loading services:", error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      loadServices(searchTerm.trim());
    } else {
      loadServices(); // Load all services if search is empty
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    loadServices(); // Load all services
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
      return <div className="no-media">No images available</div>;
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
      <div className="home-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Welcome, {user?.name}!</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
          {searchTerm && (
            <button type="button" onClick={handleClearSearch} className="clear-search-btn">
              Clear Search
            </button>
          )}
        </form>
      </div>

      <div className="services-section">
        <h2>Available Services</h2>
        {services.length === 0 ? (
          <div className="no-services">No services found</div>
        ) : (
          <div className="services-grid">
            {services.map((service) => (
              <div key={service._id} className="service-card">
                {renderServiceMedia(service.media)}
                <div className="service-info">
                  <h3>{service.serviceName}</h3>
                  <p className="service-description">{service.description}</p>
                  <p className="service-provider">By: {service.provider?.name}</p>
                  <p className="service-price">{formatPrice(service.price)}</p>
                  {service.ratings > 0 && (
                    <div className="service-rating">
                      ⭐ {service.ratings}/5
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 