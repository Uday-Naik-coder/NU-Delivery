import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  ArrowLeft, Package, Clock, User, Phone,
  AlertCircle, Trash2
} from 'lucide-react';
import Modal from '../components/Modal';

const DeliveryOrders = () => {
  const navigate = useNavigate();
  const { user, clearDeliveryNotification } = useAuth();
  const {
    onOrderUpdated,
    onOrderDeleted,
    onOfferAccepted,
    onOrderDelivered,
    onOrderFailed,
    onDeliveryCancelled
  } = useSocket();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const fetchAcceptedOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders/delivery/accepted', { 
        withCredentials: true 
      });
      setOrders(response.data);
    } catch (err) {
      setError('Failed to fetch your accepted orders');
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear notification when component mounts
  useEffect(() => {
    clearDeliveryNotification();
  }, [clearDeliveryNotification]);


  useEffect(() => {
    fetchAcceptedOrders();
    const interval = setInterval(fetchAcceptedOrders, 30000); // Refresh every 30 seconds

    // Socket listeners for real-time updates
    const unsubUpdated = onOrderUpdated?.(() => fetchAcceptedOrders());
    const unsubDeleted = onOrderDeleted?.(() => fetchAcceptedOrders());
    const unsubAccepted = onOfferAccepted?.(() => fetchAcceptedOrders());
    const unsubDelivered = onOrderDelivered?.(() => fetchAcceptedOrders());
    const unsubFailed = onOrderFailed?.(() => fetchAcceptedOrders());
    const unsubCancelled = onDeliveryCancelled?.(() => fetchAcceptedOrders());

    return () => {
      clearInterval(interval);
      unsubUpdated?.();
      unsubDeleted?.();
      unsubAccepted?.();
      unsubDelivered?.();
      unsubFailed?.();
      unsubCancelled?.();
    };
  }, [fetchAcceptedOrders, onOrderUpdated, onOrderDeleted, onOfferAccepted, onOrderDelivered, onOrderFailed, onDeliveryCancelled]);

  const handleCancelDelivery = async () => {
    if (!selectedOrder) return;
    
    // Validate reason is not empty
    if (!cancellationReason.trim()) {
      setReasonError('Please provide a reason for cancellation');
      return;
    }
    
    setReasonError('');
    setProcessing(true);
    try {
      await axios.put(`/api/orders/${selectedOrder._id}/delivery/cancel`, {
        reason: cancellationReason
      }, {
        withCredentials: true
      });
      
      setOrders(prev => prev.filter(o => o._id !== selectedOrder._id));
      setIsCancelModalOpen(false);
      setCancellationReason('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel delivery');
    } finally {
      setProcessing(false);
    }
  };

  const getRemainingTime = (startedAt) => {
    const now = new Date();
    const started = new Date(startedAt);
    const elapsed = now - started;
    const remaining = 60 * 60 * 1000 - elapsed; // 1 hour = 60 * 60 * 1000 ms
    
    if (remaining <= 0) return { minutes: 0, seconds: 0, isExpired: true };
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return { minutes, seconds, isExpired: false };
  };

  const TimeRemaining = ({ startedAt }) => {
    const [time, setTime] = useState(getRemainingTime(startedAt));

    useEffect(() => {
      const interval = setInterval(() => {
        setTime(getRemainingTime(startedAt));
      }, 1000);

      return () => clearInterval(interval);
    }, [startedAt]);

    if (time.isExpired) {
      return <span className="text-red-600 font-medium">⏱ Time exceeded</span>;
    }

    return (
      <span className={time.minutes < 10 ? 'text-red-600 font-medium' : 'font-medium'}>
        {`${time.minutes}:${time.seconds.toString().padStart(2, '0')}`}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Deliveries</h1>
              <p className="text-sm text-gray-500">{orders.length} active order{orders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No active deliveries</h3>
            <p className="text-gray-500 mb-6">You don't have any orders to deliver right now.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Browse Orders
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order._id} className="card p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="badge bg-primary-100 text-primary-800">
                        {order.platform}
                      </span>
                      <span className={`badge ${
                        order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.deliveryStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.deliveryStatus === 'delivered' ? '✓ Delivered' :
                         order.deliveryStatus === 'failed' ? '✗ Failed' :
                         'In Progress'}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Order from:</span> {order.userId?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Location:</span> {order.note || 'No location provided'}
                      </p>
                      {order.items && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Items:</span> {order.items}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-700 mb-3 bg-gray-50 p-2 rounded-lg">
                      <Clock className="w-4 h-4 text-primary-600" />
                      <span className="text-sm">Time remaining: </span>
                      <TimeRemaining startedAt={order.deliveryStartedAt} />
                    </div>

                    <div className="text-sm bg-blue-50 p-2 rounded-lg border border-blue-200">
                      <p className="text-blue-700">
                        <span className="font-medium">Contact:</span> {order.userId?.phone}
                      </p>
                      <p className="text-blue-700 mt-1">
                        <span className="font-medium">Delivery fee:</span> ₹{order.acceptedOffer?.price}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsCancelModalOpen(true);
                      }}
                      disabled={processing}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancellationReason('');
          setReasonError('');
        }}
        title="Cancel Delivery"
        size="sm"
      >
        <div>
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4 text-center">
            Are you sure you want to cancel this delivery? The order will be made available for other delivery persons.
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for cancellation <span className="text-red-600">*</span>
            </label>
            <textarea
              value={cancellationReason}
              onChange={(e) => {
                setCancellationReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
              placeholder="Tell the customer why you're cancelling (e.g., 'Emergency', 'Vehicle issue', 'Too far to travel', etc.)"
              rows={3}
              className={`input-field ${
                reasonError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }`}
            />
            {reasonError && (
              <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {reasonError}
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsCancelModalOpen(false);
                setCancellationReason('');
                setReasonError('');
              }}
              className="flex-1 btn-secondary"
            >
              Keep Delivery
            </button>
            <button
              onClick={handleCancelDelivery}
              disabled={processing || !cancellationReason.trim()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {processing ? 'Cancelling...' : 'Cancel Delivery'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeliveryOrders;
