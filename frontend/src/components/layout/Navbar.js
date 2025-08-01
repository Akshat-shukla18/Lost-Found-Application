import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <span className="logo-icon">🔍</span>
          Lost & Found
        </Link>

        {/* Hamburger Menu */}
        <div 
          className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        {/* Navigation Menu */}
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          {/* Public Links */}
          <div className="nav-links">
            <Link to="/" className="nav-link" onClick={closeMenu}>
              Home
            </Link>
            <Link to="/posts?type=lost" className="nav-link" onClick={closeMenu}>
              Lost Items
            </Link>
            <Link to="/posts?type=found" className="nav-link" onClick={closeMenu}>
              Found Items
            </Link>
          </div>

          {/* Authentication Links */}
          <div className="nav-auth">
            {isAuthenticated ? (
              <>
                {/* Authenticated User Menu */}
                <Link to="/create-post" className="nav-link create-post-btn" onClick={closeMenu}>
                  + Post Item
                </Link>
                <Link to="/dashboard" className="nav-link" onClick={closeMenu}>
                  Dashboard
                </Link>
                <Link to="/chats" className="nav-link" onClick={closeMenu}>
                  Messages
                </Link>
                
                {/* User Profile Dropdown */}
                <div className="user-menu">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                      ) : (
                        <span>{user?.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="user-name">{user?.name}</span>
                    {user?.trustScore > 0 && (
                      <div className="trust-score">
                        <span className="star">⭐</span>
                        <span>{user.trustScore.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="dropdown-menu">
                    <Link to={`/profile/${user?._id}`} className="dropdown-link" onClick={closeMenu}>
                      My Profile
                    </Link>
                    <Link to="/dashboard" className="dropdown-link" onClick={closeMenu}>
                      My Posts
                    </Link>
                    <Link to="/chats" className="dropdown-link" onClick={closeMenu}>
                      Messages
                    </Link>
                    <hr className="dropdown-divider" />
                    <button className="dropdown-link logout-btn" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Guest User Links */}
                <Link to="/login" className="nav-link login-btn" onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/register" className="nav-link register-btn" onClick={closeMenu}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;