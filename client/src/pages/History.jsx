import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Package, Clock, CheckCircle, XCircle, 
  User, Phone, Calendar, ChevronRight, AlertCircle
} from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('created');
  const [orders, setOrders] = useState({ created: [], delivered: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders/user/history', { 
        withCredentials: true 
      });
      setOrders(response.data);
    } catch (err) {
      setError('Failed to fetch order history');
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="badge bg-blue-100 text-blue-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Accepted
          </span>
        );
      case 'completed':
        return (
          <span className="badge bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'expired':
        return (
          <span className="badge bg-gray-100 text-gray-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Expired
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge bg-orange-100 text-orange-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="badge bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <h1 className="text-xl font-bold text-gray-900">Order History</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('created')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'created'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Orders I Created
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'delivered'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Delivery History
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : orders[activeTab].length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No {activeTab} orders yet
            </h3>
            <p className="text-gray-500">
              {activeTab === 'created' 
                ? "You haven't created any orders yet." 
                : "You haven't delivered any orders yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders[activeTab].map(order => (
              <div key={order._id} className="card p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="badge bg-primary-100 text-primary-800">
                        {order.platform}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>

                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {order.items}
                    </p>

                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    {/* Show failed delivery info for created orders */}
                    {activeTab === 'created' && order.deliveryStatus === 'failed' && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900 mb-1">
                              Delivery Failed
                            </p>
                            <p className="text-sm text-red-800">
                              This delivery was marked as failed by you or the delivery person.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Show delivered info for created orders only if not failed */}
                    {activeTab === 'created' && order.acceptedOffer && order.deliveryStatus !== 'failed' && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Delivered by:
                        </p>
                        <div className="flex items-center gap-2 text-blue-800">
                          <User className="w-4 h-4" />
                          <span className="font-medium">
                            {order.acceptedOffer.userId?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-700 mt-1">
                          <Phone className="w-4 h-4" />
                          <span>{order.acceptedOffer.phone}</span>
                        </div>
                        <p className="text-lg font-bold text-blue-900 mt-2">
                          Paid: ₹{order.acceptedOffer.price}
                        </p>
                      </div>
                    )}

                    {/* Show cancellation reason if order was cancelled */}
                    {order.status === 'cancelled' && order.cancellationReason && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-orange-900 mb-1">
                              Delivery cancelled by {order.cancelledBy?.name || 'delivery person'}
                            </p>
                            <p className="text-sm text-orange-800">
                              {order.cancellationReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}


                    {activeTab === 'delivered' && order.status === 'completed' && (
                      <div className="mt-4 p-4 bg-green-50 rounded-xl">
                        <p className="text-sm font-medium text-green-900 mb-2">
                          Order by:
                        </p>
                        <div className="flex items-center gap-2 text-green-800">
                          <User className="w-4 h-4" />
                          <span className="font-medium">
                            {order.userId?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-green-700 mt-1">
                          <Phone className="w-4 h-4" />
                          <span>{order.userId?.phone}</span>
                        </div>
                        <p className="text-lg font-bold text-green-900 mt-2">
                          Earned: ₹{order.acceptedOffer?.price}
                        </p>
                      </div>
                    )}

                    {/* Show failed delivery info */}
                    {activeTab === 'delivered' && order.deliveryStatus === 'failed' && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900 mb-1">
                              Delivery Failed
                            </p>
                            <p className="text-sm text-red-800">
                              This delivery was marked as failed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show cancellation reason in delivered tab if you cancelled it */}
                    {activeTab === 'delivered' && order.status === 'cancelled' && order.cancellationReason && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-orange-900 mb-1">
                              You cancelled this delivery
                            </p>
                            <p className="text-sm text-orange-800">
                              {order.cancellationReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;