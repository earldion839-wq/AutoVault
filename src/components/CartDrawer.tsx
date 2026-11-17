import React, { useState } from 'react';
import { CheckCircle2, MessageSquare, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CompatiblePartResult } from '../data/catalog';

export interface CartItem {
  part: CompatiblePartResult;
  qty: number;
}

interface OrderConfirmation {
  order_id: string;
  total: number;
  status: string;
  distributor_dispatch_message: string;
  distributor_email_subject: string;
  payment_method: string;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  vehicleSummary: string;
  onUpdateQty: (sku: string, delta: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  items,
  vehicleSummary,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('560038');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'WORKSHOP_COD'>('UPI');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.part.price_retail * item.qty, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_summary: vehicleSummary,
          customer_name: customerName,
          phone,
          workshop_name: workshopName,
          delivery_address: address,
          pincode,
          payment_method: paymentMethod,
          items: items.map((i) => ({ sku: i.part.sku, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed.');
      }
      setConfirmation(data);
      onClearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dropship Cart and Checkout"
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-slate-900" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              {confirmation ? 'Order Dispatched' : 'Workshop Order Cart'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => {
              setConfirmation(null);
              onClose();
            }}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {confirmation ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2.5 text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <h3 className="font-display text-base font-bold">
                    Order #{confirmation.order_id} Confirmed — Preparing Shipment
                  </h3>
                </div>
                <p className="mt-2 text-sm text-emerald-800">
                  Total Paid / Authorized:{' '}
                  <span className="font-mono font-bold tabular-nums">
                    ₹{confirmation.total.toLocaleString('en-IN')}
                  </span>{' '}
                  via {confirmation.payment_method}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <MessageSquare className="h-4 w-4 text-emerald-700" />
                  <span>Tier-1 Distributor WhatsApp Dispatch Webhook</span>
                </div>
                <p className="mt-2.5 rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800">
                  {confirmation.distributor_dispatch_message}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Email Subject: {confirmation.distributor_email_subject}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  onClose();
                }}
                className="min-h-12 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Continue Browsing Parts
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-base font-semibold text-slate-900">Your cart is empty</p>
              <p className="mt-1 text-sm text-slate-600">
                Add guaranteed-fit parts from the catalog to route an express dropship order.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Itemized List */}
              <div className="divide-y divide-slate-200 border-b border-slate-200">
                {items.map(({ part, qty }) => (
                  <div key={part.sku} className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {part.brand} · {part.sku}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{part.title}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-800 tabular-nums">
                        ₹{(part.price_retail * qty).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Decrease quantity for ${part.title}`}
                        onClick={() => onUpdateQty(part.sku, -1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center font-mono text-sm font-semibold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity for ${part.title}`}
                        onClick={() => onUpdateQty(part.sku, 1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${part.title}`}
                        onClick={() => onRemoveItem(part.sku)}
                        className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Parts Subtotal</span>
                  <span className="font-mono tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (18%)</span>
                  <span className="font-mono tabular-nums">₹{gst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Hyperlocal Courier</span>
                  <span className="font-semibold text-emerald-700">Free</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>Total Payable</span>
                  <span className="font-mono text-base tabular-nums">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Checkout Form */}
              <form id="dropship-checkout-form" onSubmit={handleCheckout} className="space-y-3.5">
                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-slate-700">
                  Delivery &amp; Payment Details
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="co-name" className="block text-xs font-medium text-slate-700">
                      Customer Name *
                    </label>
                    <input
                      id="co-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Rajesh Kumar"
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="co-phone" className="block text-xs font-medium text-slate-700">
                      Phone Number *
                    </label>
                    <input
                      id="co-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 12345"
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm tabular-nums focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="co-workshop" className="block text-xs font-medium text-slate-700">
                      Workshop Name (Required for COD)
                    </label>
                    <input
                      id="co-workshop"
                      type="text"
                      value={workshopName}
                      onChange={(e) => setWorkshopName(e.target.value)}
                      placeholder="Rajesh Auto Garage"
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="co-pin" className="block text-xs font-medium text-slate-700">
                      PIN Code *
                    </label>
                    <input
                      id="co-pin"
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="co-addr" className="block text-xs font-medium text-slate-700">
                    Delivery Address *
                  </label>
                  <input
                    id="co-addr"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="100 Feet Road, Indiranagar, Bengaluru"
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-700">Payment Gateway</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {[
                      { id: 'UPI' as const, label: 'UPI / GPay' },
                      { id: 'CARD' as const, label: 'Debit / Credit' },
                      { id: 'WORKSHOP_COD' as const, label: 'Workshop COD' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={`min-h-11 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                          paymentMethod === opt.id
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-12 w-full rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
                >
                  {submitting
                    ? 'Routing to Tier-1 Distributor...'
                    : `Place Order · ₹${total.toLocaleString('en-IN')}`}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
