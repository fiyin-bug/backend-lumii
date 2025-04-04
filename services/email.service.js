// services/email.service.js
const nodemailer = require('nodemailer');
const { emailConfig } = require('../config');

let transporter;

// Initialize transporter only if email config is valid
if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      // Adding reasonable timeouts
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    });

    transporter.verify((error, success) => {
      if (error) {
        console.error('Nodemailer configuration error:', error);
        transporter = null; // Invalidate transporter if verification fails
      } else {
        console.log('Nodemailer is configured correctly. Server is ready to take messages.');
      }
    });

} else {
    console.warn("Email service is not fully configured in .env. Email notifications will be skipped.");
}


/**
 * Sends the order confirmation email to the business.
 * @param {object} orderDetails Data retrieved from Paystack verification, including metadata.
 */
const sendBusinessNotification = async (orderDetails) => {
  // Check if transporter is valid and recipient email is set
  if (!transporter || !emailConfig.businessNotificationEmail) {
     console.warn('Email notifications are skipped due to missing configuration or transporter error.');
     return;
  }

  // --- Safely Extract Data ---
  const reference = orderDetails?.reference || 'N/A';
  const customerName = orderDetails?.metadata?.customer_name || 'N/A';
  const customerEmail = orderDetails?.customer?.email || orderDetails?.metadata?.customer_email || 'N/A';
  const customerPhone = orderDetails?.metadata?.customer_phone || 'N/A';
  const totalAmount = orderDetails?.amount || 0; // Amount is in Kobo from Paystack
  const paystackId = orderDetails?.id || 'N/A';
  const paymentChannel = orderDetails?.channel || 'N/A';
  const paidAt = orderDetails?.paid_at || orderDetails?.created_at;
  const paymentTime = paidAt ? new Date(paidAt).toLocaleString() : 'N/A';

  // Format items (Best effort based on metadata)
  let itemsList = 'Item details not available in metadata.';
  if (orderDetails?.metadata?.cart_items && Array.isArray(orderDetails.metadata.cart_items)) {
     itemsList = orderDetails.metadata.cart_items.map(item =>
       `- Qty: ${item.quantity || 'N/A'}, ID: ${item.id || 'N/A'}` // Limited info here
     ).join('\n');
  }

  // Format address (Not usually available in verification, relies on metadata if stored)
  let addressString = 'Shipping address not available in verification data.';
   if (orderDetails?.metadata?.shipping_address) { // Check if you stored it
       const addr = orderDetails.metadata.shipping_address;
       addressString = `
    ${addr.street || ''}
    ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}
    ${addr.country || ''}
    `.trim();
  }

  // --- Construct Mail Options ---
  const mailOptions = {
    from: emailConfig.from,
    to: emailConfig.businessNotificationEmail,
    subject: `[Lumis Jewelry] New Order Paid - Ref: ${reference}`,
    text: `A new order has been successfully paid for.\n
========================================
Order Reference: ${reference}
========================================

Customer Details:
  Name: ${customerName}
  Email: ${customerEmail}
  Phone: ${customerPhone}

Shipping Address:
  ${addressString}

Order Items (From Metadata):
${itemsList}

Payment Details:
  Total Amount Paid: NGN ${(totalAmount / 100).toFixed(2)}
  Payment Channel: ${paymentChannel}
  Paystack Transaction ID: ${paystackId}
  Payment Time: ${paymentTime}
========================================
`,
    // html: `<h1>Order Received</h1><p>Details...</p>` // Optional HTML version
  };

  // --- Send Email ---
  try {
    console.log(`Attempting to send notification email to ${emailConfig.businessNotificationEmail} for ref ${reference}...`);
    let info = await transporter.sendMail(mailOptions);
    console.log(`Business notification email sent successfully for ref ${reference}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending business notification email for ref ${reference}:`, error);
    // Do not throw error here to prevent interruption of user flow, just log it.
  }
};

module.exports = { sendBusinessNotification };