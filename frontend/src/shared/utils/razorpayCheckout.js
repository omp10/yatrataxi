const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/**
 * Opens Razorpay Checkout for a server-created order. Resolves with the payment
 * response (order id, payment id, signature) for server verification, and rejects
 * if the payment fails or the customer closes the sheet.
 */
export const openRazorpayCheckout = async ({ keyId, order, name, description, prefill = {} }) => {
  if (!(await loadRazorpayScript())) {
    throw new Error('Payment could not start. Check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency || 'INR',
      order_id: order.id,
      name,
      description,
      prefill,
      theme: { color: '#0F172A' },
      modal: { ondismiss: () => reject(new Error('Payment was cancelled')) },
      handler: (response) => resolve(response),
    });
    checkout.on('payment.failed', (event) => reject(new Error(event?.error?.description || 'Payment failed')));
    checkout.open();
  });
};
