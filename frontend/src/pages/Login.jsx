import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiService, handleApiError } from "../config/api.js";
import "./Login.css";

const Login = () => {
  const [form, setForm] = useState({
    contact: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const response = await apiService.user.login(form);
      
      // Save token to localStorage
      const token = response.data.data?.token || response.data.token;
      localStorage.setItem("token", token);
      
      // Redirect based on user role
      const userRole = response.data.data?.role || response.data.role;
      if (userRole === "provider") {
        navigate("/provider-dashboard");
      } else {
        navigate("/home");
      }
      
      setMessage("Login successful!");
    } catch (err) {
      setMessage(handleApiError(err));
    }
  };

  return (
    <div className="login-outer">
      <div className="login-container">
        <h2>Login</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <input name="contact" placeholder="Email or Phone" value={form.contact} onChange={handleChange} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          <button type="submit">Login</button>
        </form>
        {message && <p className="login-message">{message}</p>}
        <p className="account-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login; 