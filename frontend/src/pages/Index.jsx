import { Link } from "react-router-dom";
import './Index.css';

const Index = () => {
  return (
    <div className="index-container">
      <div className="index-content">
        <h1 className="index-title">Welcome to Your Service App</h1>
        <p className="index-subtitle">Connect service providers with service seekers</p>
        
        <div className="index-buttons">
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
          <Link to="/register" className="btn btn-secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;