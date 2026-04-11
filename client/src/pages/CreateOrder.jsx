import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  ArrowLeft, Upload, Clock, Package, 
  MapPin, AlertCircle, CheckCircle 
} from 'lucide-react';

const PLATFORMS = [
  'Zomato', 'Swiggy', 'Blinkit', 'Silver Spoon', 
  'Apna Gaon', 'Tuck Shop', 'TMP', 'Other'
];

const CreateOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    platform: 'Zomato',
    items: '',
    expectedTime: '',
    note: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('platform', formData.platform);
      submitData.append('items', formData.items);
      submitData.append('expectedTime', new Date(formData.expectedTime).toISOString());
      submitData.append('note', formData.note);
      if (image) {
        submitData.append('image', image);
      }

      await axios.post('/api/orders', submitData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Listed!</h2>
          <p className="text-gray-600 mb-6">
            Your order has been posted. You'll be notified when someone offers to deliver it.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary w-full"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">List Your Order</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selection */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Package className="w-4 h-4 inline mr-2" />
              Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLATFORMS.filter(p => p !== 'Other').map(platform => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, platform });
                    setIsOtherSelected(false);
                  }}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.platform === platform && !isOtherSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {platform}
                </button>
              ))}
              <button
                key="Other"
                type="button"
                onClick={() => {
                  setIsOtherSelected(true);
                  setFormData({ ...formData, platform: '' });
                }}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  isOtherSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Other
              </button>
            </div>
            {isOtherSelected && (
              <input
                type="text"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                placeholder="Enter platform name"
                className="input-field mt-3"
              />
            )}
          </div>

          {/* Expected Time */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Expected Arrival Time
            </label>
            <input
              type="datetime-local"
              value={formData.expectedTime}
              onChange={(e) => setFormData({ ...formData, expectedTime: e.target.value })}
              required
              min={new Date().toISOString().slice(0, 16)}
              className="input-field"
            />
            <p className="mt-2 text-sm text-gray-500">
              When do you expect the delivery to arrive?
            </p>
          </div>

          {/* Items */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items (Optional)
            </label>
            <textarea
              value={formData.items}
              onChange={(e) => setFormData({ ...formData, items: e.target.value })}
              placeholder="Describe what you ordered (e.g., 2x Chicken Biryani, 1x Butter Naan)"
              rows={3}
              className="input-field"
            />
          </div>

          {/* Image Upload */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Upload className="w-4 h-4 inline mr-2" />
              Screenshot (Optional)
            </label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload screenshot</p>
                    <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Note (Optional)
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Any special instructions? (e.g., Hostel name, Room number)"
              rows={2}
              className="input-field"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.expectedTime}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                'Post Order'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateOrder;