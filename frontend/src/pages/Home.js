import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    lost: 0,
    found: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/posts/stats/overview');
        setStats(response.data.stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Lost Something? Found Something?
              <span className="gradient-text"> We're Here to Help!</span>
            </h1>
            <p className="hero-description">
              Join our community-driven platform where lost items find their way home. 
              Whether you've lost something precious or found an item that belongs to someone else, 
              we make it easy to reconnect people with their belongings.
            </p>
            <div className="hero-buttons">
              <Link to="/posts?type=lost" className="btn btn-primary">
                Browse Lost Items
              </Link>
              <Link to="/posts?type=found" className="btn btn-secondary">
                Browse Found Items
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="floating-items">
              <div className="item item-1">📱</div>
              <div className="item item-2">🔑</div>
              <div className="item item-3">👜</div>
              <div className="item item-4">💳</div>
              <div className="item item-5">📚</div>
              <div className="item item-6">⌚</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <h2>Community Impact</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Posts</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.resolved}</div>
              <div className="stat-label">Items Reunited</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.active}</div>
              <div className="stat-label">Active Cases</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.lost}</div>
              <div className="stat-label">Lost Items</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-icon">🔍</div>
              <h3>Browse Items</h3>
              <p>Search through lost and found items in your area. No account needed to browse!</p>
            </div>
            <div className="step">
              <div className="step-icon">📝</div>
              <h3>Post an Item</h3>
              <p>Create an account and post details about items you've lost or found with photos and descriptions.</p>
            </div>
            <div className="step">
              <div className="step-icon">💬</div>
              <h3>Connect & Chat</h3>
              <p>Use our secure messaging system to coordinate with others and arrange item returns.</p>
            </div>
            <div className="step">
              <div className="step-icon">⭐</div>
              <h3>Build Trust</h3>
              <p>Rate helpful community members to build a trusted network of people helping others.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Why Choose Our Platform?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>Your personal information is protected. Contact details are only shared when you choose to connect.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Community Driven</h3>
              <p>Built by the community, for the community. Help your neighbors and fellow students.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Friendly</h3>
              <p>Access the platform from any device. Post and browse items on the go.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Fast & Easy</h3>
              <p>Simple interface makes it quick to post items and connect with others.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💯</div>
              <h3>Trust System</h3>
              <p>Rate and review system helps build a trustworthy community.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🆓</div>
              <h3>Completely Free</h3>
              <p>No fees, no subscriptions. Just people helping people.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of community members helping reunite lost items with their owners.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary">
                Join Our Community
              </Link>
              <Link to="/posts" className="btn btn-outline">
                Browse Items Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;