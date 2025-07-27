import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Register.css";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    password: "",
    role: "",
    photo: null,
  });
  
  const [serviceForm, setServiceForm] = useState({
    serviceName: "",
    description: "",
    price: "",
    media: [],
  });
  
  const [preview, setPreview] = useState(null);
  const [servicePreviews, setServicePreviews] = useState([]);
  const [message, setMessage] = useState("");
  const [showServiceForm, setShowServiceForm] = useState(false);

  // Convert file to base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleChange = async (e) => {
    if (e.target.name === "photo") {
      const file = e.target.files[0];
      setPreview(URL.createObjectURL(file));
      const base64 = await toBase64(file);
      const [meta, data] = base64.split(",");
      const contentType = meta.match(/:(.*?);/)[1];
      setForm((prev) => ({
        ...prev,
        photo: { data: data, contentType },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [e.target.name]: e.target.value,
      }));
      
      // Show service form when provider is selected
      if (e.target.name === "role" && e.target.value === "provider") {
        setShowServiceForm(true);
      } else if (e.target.name === "role" && e.target.value !== "provider") {
        setShowServiceForm(false);
      }
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    
    try {
      // Register user first
      const userResponse = await axios.post("http://localhost:5000/api/users/register", form);
      
      // If provider and service form is filled, create service
      if (form.role === "provider" && showServiceForm && serviceForm.serviceName) {
        const token = userResponse.data.token;
        await axios.post("http://localhost:5000/api/services", serviceForm, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setMessage("Registration and service creation successful!");
      } else {
        setMessage("Registration successful!");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="register-outer">
      <div className="register-container">
        <h2>Register</h2>
        <form className="register-form" onSubmit={handleSubmit}>
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
          <input name="contact" placeholder="Email or Phone" value={form.contact} onChange={handleChange} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          <select name="role" value={form.role} onChange={handleChange} required>
            <option value="" disabled hidden>Role</option>
            <option value="getter">Getter</option>
            <option value="provider">Provider</option>
          </select>
          <input name="photo" type="file" accept="image/*" onChange={handleChange} />
          {preview && <img src={preview} alt="Preview" />}
          
          {/* Service Form for Providers */}
          {showServiceForm && (
            <div className="service-form-section">
              <h3>Service Details</h3>
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
            </div>
          )}
          
          <button type="submit">Register</button>
        </form>
        {message && <p className="register-message">{message}</p>}
        <p className="account-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;