import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { 
  Plus, Filter, Package, Clock, MapPin, 
  User, Phone, AlertCircle, ChevronRight,
  Search, RefreshCw
} from 'lucide-react';
import CountdownTimer from '../components/CountdownTimer';
import Modal from '../components/Modal';

const PLATFORMS = [
  { value: 'all', label: 'All Platforms', color: 'bg-gray-100 text-gray-800' },
  { value: 'Zomato', label: 'Zomato', color: 'bg-red-100 text-red-800' },
  { value: 'Swiggy', label: 'Swiggy', color: 'bg-orange-100 text-orange-800' },
  { value: 'Blinkit', label: 'Blinkit', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Silver Spoon', label: 'Silver Spoon', color: 'bg-blue-100 text-blue-800' },
  { value: 'Apna Gaon', label: 'Apna Gaon', color: 'bg-green-100 text-green-800' },
  { value: 'Tuck Shop', label: 'Tuck Shop', color: 'bg-purple-100 text-purple-800' },
  { value: 'Tuck Shop', label: 'Tuck Shop', color: 'bg-pink-100 text-pink-800' },
  { value: 'Other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];

const Dashboard = () => {
  const { user, hasNewOrderOffers, hasNewDeliveries, setDeliveryNotification, setOrderOfferNotification } = useAuth();
  const { onNewOrder, onOrderUpdated, onOrderDeleted, onNewOffer, onOfferAccepted } = useSocket();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerPhone, setOfferPhone] = useState(user?.phone || '');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedPlatform !== 'all') params.platform = selectedPlatform;
      if (showUrgentOnly) params.urgent = true;
      
      const response = await axios.get('/api/orders', { 
        params,
        withCredentials: true 
      });
      setOrders(response.data);
    } catch (err) {
      setError('Failed to fetch orders');
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform, showUrgentOnly]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Socket event listeners
  useEffect(() => {
    const unsubscribeNewOrder = onNewOrder((newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
    });

    const unsubscribeUpdated = onOrderUpdated((updatedOrder) => {
      setOrders(prev => prev.map(order => 
        order._id === updatedOrder._id ? updatedOrder : order
      ));
    });

    const unsubscribeDeleted = onOrderDeleted(({ orderId }) => {
      setOrders(prev => prev.filter(order => order._id !== orderId));
    });

    const unsubscribeNewOffer = onNewOffer(({ orderId, offer }) => {
      // Only notify if the order belongs to the current user
      setOrders(prev => prev.map(order => {
        if (order._id === orderId) {
          // If the order belongs to the logged-in user, set notification
          // Compare all possible id fields for robustness
          const orderUserId = order.userId?._id || order.userId?.id || order.userId;
          const currentUserId = user?._id || user?.id;
          if (orderUserId && currentUserId && orderUserId === currentUserId) {
            setOrderOfferNotification();
          }
          return {
            ...order,
            offers: [...(order.offers || []), offer]
          };
        }
        return order;
      }));
    });

    const unsubscribeOfferAccepted = onOfferAccepted(({ orderId, acceptedBy }) => {
      // Set notification for delivery person whose offer was accepted
      setDeliveryNotification();
      
      setOrders(prev => prev.map(order => {
        if (order._id === orderId) {
          return {
            ...order,
            status: 'accepted'
          };
        }
        return order;
      }));
    });

    return () => {
      unsubscribeNewOrder?.();
      unsubscribeUpdated?.();
      unsubscribeDeleted?.();
      unsubscribeNewOffer?.();
      unsubscribeOfferAccepted?.();
    };
  }, [onNewOrder, onOrderUpdated, onOrderDeleted, onNewOffer, onOfferAccepted, setDeliveryNotification]);

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmittingOffer(true);
    try {
      await axios.post(`/api/orders/${selectedOrder._id}/offers`, {
        price: Number(offerPrice),
        phone: offerPhone
      }, { withCredentials: true });

      setIsOfferModalOpen(false);
      setOfferPrice('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const openOfferModal = (order) => {
    setSelectedOrder(order);
    setOfferPhone(user?.phone || '');
    setIsOfferModalOpen(true);
  };

  const getPlatformStyle = (platform) => {
    return PLATFORMS.find(p => p.value === platform)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NU Delivery</h1>
                <p className="text-sm text-gray-500">Campus Food Delivery</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/my-orders')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                My Orders
                {hasNewOrderOffers && (
                  <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => navigate('/delivery-orders')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                My Deliveries
                {hasNewDeliveries && (
                  <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => navigate('/history')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                History
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                  alt={user?.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => navigate('/create-order')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-200"
          >
            <Plus className="w-5 h-5" />
            List Your Order
          </button>

          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-transparent border-none outline-none text-gray-700 min-w-[150px]"
              >
                {PLATFORMS.map(platform => (
                  <option key={platform.value} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowUrgentOnly(!showUrgentOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                showUrgentOnly 
                  ? 'bg-urgent-50 border-urgent-200 text-urgent-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              Urgent Only
            </button>

            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Orders Grid */}
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {showUrgentOnly 
                ? 'No urgent orders at the moment.' 
                : 'Be the first to list an order!'}
            </p>
            <button
              onClick={() => navigate('/create-order')}
              className="btn-primary"
            >
              List Your Order
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => (
              <div 
                key={order._id} 
                className={`card hover:shadow-lg transition-shadow ${
                  order.isUrgent ? 'ring-2 ring-urgent-200' : ''
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`badge ${getPlatformStyle(order.platform)}`}>
                      {order.platform}
                    </span>
                    {order.isUrgent && (
                      <span className="badge-urgent flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Urgent
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  <p className="text-gray-900 font-medium mb-2 line-clamp-2">
                    {order.items}
                  </p>

                  {/* Timer */}
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <CountdownTimer 
                      targetTime={order.expectedTime}
                      className="text-lg"
                    />
                  </div>

                  {/* Note */}
                  {order.note && (
                    <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg">
                      {order.note}
                    </p>
                  )}

                  {/* Image */}
                  {order.image && (
                    <img 
                      src={order.image} 
                      alt="Order"
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {order.userId?.name?.split(' ')[0]}
                      </span>
                    </div>
                    
                    {order.userId?._id !== user?.id && (
                      <button
                        onClick={() => openOfferModal(order)}
                        disabled={order.offers?.some(o => o.userId?._id === user?.id)}
                        className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {order.offers?.some(o => o.userId?._id === user?.id) ? (
                          'Offer Sent'
                        ) : (
                          <>
                            Offer Delivery
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Offers count */}
                  {order.offers?.length > 0 && (
                    <div className="mt-3 text-sm text-gray-500">
                      {order.offers.length} delivery offer{order.offers.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Offer Modal */}
      <Modal
        isOpen={isOfferModalOpen}
        onClose={() => {
          setIsOfferModalOpen(false);
          setSelectedOrder(null);
          setOfferPrice('');
          setError('');
        }}
        title="Offer Delivery"
      >
        <form onSubmit={handleOfferSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Price (₹)
            </label>
            <input
              type="number"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="e.g., 30"
              min="1"
              required
              className="input-field"
            />
            <p className="mt-1 text-sm text-gray-500">
              Suggest a fair price for delivering this order
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              value={offerPhone}
              onChange={(e) => setOfferPhone(e.target.value)}
              placeholder="Your phone number"
              required
              className="input-field"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsOfferModalOpen(false)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingOffer || !offerPrice}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {submittingOffer ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;


/*
const unsubscribeNewOffer = onNewOffer(({ orderId, offer }) => {
      // Set notification when a new offer comes in
      setOfferNotification();
      
      setOrders(prev => prev.map(order => {
        if (order._id === orderId) {
          return {
            ...order,
            offers: [...(order.offers || []), offer]
          };
        }
        return order;
      }));
    });
*/