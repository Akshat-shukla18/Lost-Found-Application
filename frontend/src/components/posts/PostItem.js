import React, { useState, useContext } from 'react';
import axios from 'axios';
import './PostItem.css';
import { useAuth } from '../../context/AuthContext';

const PostItem = () => {
  const { user } = useAuth();
  const [postType, setPostType] = useState(null); // 'lost' or 'found'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    building: '',
    floor: '',
    room: '',
    area: '',
    category: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Electronics',
    'Documents',
    'Accessories',
    'Books',
    'Clothing',
    'Bags',
    'Keys',
    'Jewelry',
    'Sports Equipment',
    'Other'
  ];

  const handlePostTypeSelect = (type) => {
    setPostType(type);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.building.trim() || !formData.category.trim()) {
      setError('Title, description, building, and category are required.');
      return;
    }

    if (!user || !user._id) {
      setError('User not authenticated.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const postPayload = {
        user: user._id,
        type: postType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: {
          building: formData.building.trim(),
          floor: formData.floor.trim(),
          room: formData.room.trim(),
          area: formData.area.trim()
        },
        dateTime: formData.date ? new Date(formData.date) : new Date()
      };

      // Assuming backend API endpoint for posts is /posts
      const response = await axios.post('/posts', postPayload);

      if (response.status === 201) {
        setSuccess('Post created successfully!');
        setFormData({
          title: '',
          description: '',
          date: '',
          building: '',
          floor: '',
          room: '',
          area: '',
          category: ''
        });
        setPostType(null);
        // Redirect to dashboard after successful post
        window.location.href = '/dashboard';
      } else {
        setError('Failed to create post. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while creating the post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!postType) {
    return (
      <div className="post-type-selection">
        <h2>Create a New Post</h2>
        <p>Please select the type of post:</p>
        <div className="post-type-buttons">
          <button onClick={() => handlePostTypeSelect('lost')} className="lost-btn">Lost Post</button>
          <button onClick={() => handlePostTypeSelect('found')} className="found-btn">Found Post</button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-item-container">
      <h2>{postType === 'lost' ? 'Lost Item Post' : 'Found Item Post'}</h2>
      <form onSubmit={handleSubmit} className="post-item-form" noValidate>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label htmlFor="title">Title <span className="required">*</span></label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter title"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description <span className="required">*</span></label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter description"
            rows="4"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category <span className="required">*</span></label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="building">Building/Location <span className="required">*</span></label>
          <input
            type="text"
            id="building"
            name="building"
            value={formData.building}
            onChange={handleChange}
            placeholder="Enter building or location"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="floor">Floor</label>
          <input
            type="text"
            id="floor"
            name="floor"
            value={formData.floor}
            onChange={handleChange}
            placeholder="Enter floor"
          />
        </div>

        <div className="form-group">
          <label htmlFor="room">Room</label>
          <input
            type="text"
            id="room"
            name="room"
            value={formData.room}
            onChange={handleChange}
            placeholder="Enter room"
          />
        </div>

        <div className="form-group">
          <label htmlFor="area">Area</label>
          <input
            type="text"
            id="area"
            name="area"
            value={formData.area}
            onChange={handleChange}
            placeholder="Enter area"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date <span className="required">*</span></label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
          <button type="button" onClick={() => setPostType(null)} className="cancel-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostItem;
