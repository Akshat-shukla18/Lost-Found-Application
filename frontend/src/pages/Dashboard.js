import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

// Utility function to format date as relative time
const timeSince = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";

  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "") + " ago";

  return "Just now";
};

const Dashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user || !user._id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        // Fetch posts with user info populated
        const response = await axios.get(`/posts/user/${user._id}?populateUser=true`);
        setPosts(response.data.posts || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [user]);

  if (loading) {
    return <div className="page-container"><p>Loading posts...</p></div>;
  }

  if (error) {
    return <div className="page-container error-message">{error}</div>;
  }

  return (
    <div className="page-container">
      <h1>Dashboard</h1>
      {posts.length === 0 ? (
        <p>No posts found. Create a new post to get started.</p>
      ) : (
        <ul className="posts-list">
          {posts.map(post => (
            <li key={post._id} className={`post-item ${post.type}`}>
              <h3>
                {post.title} <span className={`post-type ${post.type}`}>[{post.type.toUpperCase()}]</span>
              </h3>
              <p>{post.description}</p>
              <p>
                Posted by: <strong>{post.user?.name || 'Unknown'}</strong> &nbsp;|&nbsp; Posted {timeSince(post.createdAt)}
              </p>
              {post.user?._id && (
                <Link to={`/chats/${post.user._id}`} className="message-btn">
                  Message
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
