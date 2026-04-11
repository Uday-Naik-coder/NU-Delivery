import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { 
  ArrowLeft, Package, Clock, User, Phone, Check, X, 
  Edit2, Trash2, AlertCircle, CheckCircle 
} from 'lucide-react';
import CountdownTimer from '../components/CountdownTimer';
import Modal from '../components/Modal';

const MyOrders = () => {
  const navigate = useNavigate();
  const { user, clearOrderOfferNotification, setOrderOfferNotification } = useAuth();
  const { onNewOffer, onOfferAccepted, onDeliveryCancelled } = useSocket();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [processing, setProcessing] = useState(false);
  const [cancellationNotification, setCancellationNotification] = useState(null);

  // Clear notification when component mounts
  useEffect(() => {
    clearOrderOfferNotification();
  }, [clearOrderOfferNotification]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders/user/history', { 
        withCredentials: true 
      });
      // Show both active and accepted orders (until they are completed)
      const myOrders = response.data.created.filter(
        order => order.status === 'active' || order.status === 'accepted'
      );
      setOrders(myOrders);
    } catch (err) {
      setError('Failed to fetch your orders');
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Listen for new offers
  useEffect(() => {
    const unsubscribe = onNewOffer(({ orderId, offer }) => {
      setOrders(prev => {
        // Check if this offer is for one of our orders
        const hasOurOrder = prev.some(order => order._id === orderId);
        if (hasOurOrder) {
          setOrderOfferNotification();
        }
        
        return prev.map(order => {
          if (order._id === orderId) {
            return {
              ...order,
              offers: [...(order.offers || []), offer]
            };
          }
          return order;
        });
      });
    });

    return () => unsubscribe?.();
  }, [onNewOffer, setOrderOfferNotification]);

  // Listen for delivery cancellation
  useEffect(() => {
    const unsubscribe = onDeliveryCancelled(({ orderId, cancelledBy }) => {
      // Check if this order is ours
      setOrders(prev => {
        const isOurOrder = prev.some(order => order._id === orderId);
        if (isOurOrder) {
          setCancellationNotification({
            orderId,
            deliveryPersonName: cancelledBy.name,
            reason: cancelledBy.reason
          });
          // Auto dismiss after 5 seconds
          setTimeout(() => setCancellationNotification(null), 5000);
        }
        return prev.map(order => {
          if (order._id === orderId) {
            return {
              ...order,
              status: 'active',
              acceptedOffer: {},
              deliveryStatus: 'cancelled'
            };
          }
          return order;
        });
      });
    });

    return () => unsubscribe?.();
  }, [onDeliveryCancelled]);

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setEditForm({
      items: order.items,
      expectedTime: new Date(order.expectedTime).toISOString().slice(0, 16),
      note: order.note || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await axios.put(`/api/orders/${selectedOrder._id}`, editForm, {
        withCredentials: true
      });
      setIsEditModalOpen(false);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      await axios.delete(`/api/orders/${selectedOrder._id}`, {
        withCredentials: true
      });
      setIsDeleteModalOpen(false);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptOffer = async (offerUserId) => {
    setProcessing(true);
    try {
      await axios.post(`/api/orders/${selectedOrder._id}/accept-offer`, {
        offerUserId
      }, { withCredentials: true });
      
      setIsOffersModalOpen(false);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept offer');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkDelivered = async (order) => {
    setProcessing(true);
    try {
      await axios.put(`/api/orders/${order._id}/delivery/mark-delivered`, {}, {
        withCredentials: true
      });
      
      fetchOrders();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark order as delivered');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkFailed = async (order) => {
    setProcessing(true);
    try {
      await axios.put(`/api/orders/${order._id}/delivery/mark-failed`, {}, {
        withCredentials: true
      });
      
      fetchOrders();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark order as failed');
    } finally {
      setProcessing(false);
    }
  };

  const viewOffers = (order) => {
    setSelectedOrder(order);
    setIsOffersModalOpen(true);
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
            <h1 className="text-xl font-bold text-gray-900">My Active Orders</h1>
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

        {cancellationNotification && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-900 font-medium">
                Delivery cancelled by {cancellationNotification.deliveryPersonName}
              </p>
              <p className="text-orange-700 text-sm mt-1">
                {cancellationNotification.reason}
              </p>
            </div>
            <button 
              onClick={() => setCancellationNotification(null)}
              className="ml-auto text-orange-600 hover:text-orange-800 flex-shrink-0"
            >
              ✕
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
            <h3 className="text-xl font-medium text-gray-900 mb-2">No active orders</h3>
            <p className="text-gray-500 mb-6">You don't have any active orders right now.</p>
            <button
              onClick={() => navigate('/create-order')}
              className="btn-primary"
            >
              Create New Order
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
                        order.status === 'accepted' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.status === 'accepted' ? 'Accepted' : 'Active'}
                      </span>
                      {order.status === 'accepted' && (
                        <span className={`badge ${
                          order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.deliveryStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.deliveryStatus === 'delivered' ? '✓ Delivered' :
                           order.deliveryStatus === 'failed' ? '✗ Failed' :
                           'In Progress'}
                        </span>
                      )}
                    </div>

                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {order.items}
                    </p>

                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <Clock className="w-4 h-4" />
                      <CountdownTimer 
                        targetTime={order.expectedTime}
                        className="text-base"
                      />
                    </div>

                    {order.note && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg mb-3">
                        {order.note}
                      </p>
                    )}

                    {order.offers?.length > 0 && (
                      <button
                        onClick={() => viewOffers(order)}
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <User className="w-4 h-4" />
                        {order.offers.length} delivery offer{order.offers.length !== 1 ? 's' : ''} - 
                        <span className="underline">View & Accept</span>
                      </button>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2">
                    {order.status === 'active' ? (
                      <>
                        <button
                          onClick={() => handleEdit(order)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDeleteModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    ) : (
                      <div>
                        <div className="text-sm text-gray-600 mb-3">
                          <p className="font-medium">Delivery by:</p>
                          <p>{order.acceptedOffer?.userId?.name}</p>
                          <p className="text-gray-500">₹{order.acceptedOffer?.price}</p>
                        </div>
                        {order.deliveryStatus === 'pending' && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleMarkDelivered(order)}
                              disabled={processing}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              Delivered
                            </button>
                            <button
                              onClick={() => handleMarkFailed(order)}
                              disabled={processing}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              Failed
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Order"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items
            </label>
            <textarea
              value={editForm.items}
              onChange={(e) => setEditForm({ ...editForm, items: e.target.value })}
              required
              rows={3}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Arrival Time
            </label>
            <input
              type="datetime-local"
              value={editForm.expectedTime}
              onChange={(e) => setEditForm({ ...editForm, expectedTime: e.target.value })}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              value={editForm.note}
              onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
              rows={2}
              className="input-field"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {processing ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Order"
        size="sm"
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this order? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {processing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Offers Modal */}
      <Modal
        isOpen={isOffersModalOpen}
        onClose={() => setIsOffersModalOpen(false)}
        title="Delivery Offers"
        size="lg"
      >
        <div className="space-y-4">
          {selectedOrder?.offers?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No offers yet. Check back later!
            </p>
          ) : (
            selectedOrder?.offers?.map((offer, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {offer.userId?.name}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {offer.phone}
                  </p>
                  <p className="text-lg font-bold text-primary-600 mt-1">
                    ₹{offer.price}
                  </p>
                </div>
                <button
                  onClick={() => handleAcceptOffer(offer.userId?._id)}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MyOrders;