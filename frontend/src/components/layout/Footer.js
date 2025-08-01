import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Lost & Found Platform</h3>
            <p>Connecting communities to reunite lost items with their owners.</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/posts?type=lost">Lost Items</a></li>
              <li><a href="/posts?type=found">Found Items</a></li>
              <li><a href="/register">Join Community</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>About</h4>
            <ul>
              <li><a href="/about">How It Works</a></li>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 Lost & Found Platform. Built with ❤️ for communities everywhere.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;