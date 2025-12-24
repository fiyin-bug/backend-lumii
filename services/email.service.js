import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter;

// Initialize transporter only if email config is valid
if (config.emailConfig.host && config.emailConfig.auth.user && config.emailConfig.auth.pass) {
  transporter = nodemailer.createTransport({
    host: config.emailConfig.host,
    port: config.emailConfig.port,
    secure: config.emailConfig.secure,
    auth: config.emailConfig.auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('Nodemailer configuration error:', error);
      transporter = null;
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
  if (!transporter || !config.emailConfig.businessNotificationEmail) {
    console.warn('Business email notifications are skipped due to missing configuration or transporter error.');
    return;
  }

  // Safely Extract Data
  const reference = orderDetails?.reference || 'N/A';
  const customerName = orderDetails?.metadata?.customer_name || 'N/A';
  const customerEmail = orderDetails?.customer?.email || orderDetails?.metadata?.customer_email || 'N/A';
  const customerPhone = orderDetails?.metadata?.customer_phone || 'N/A';
  const totalAmount = orderDetails?.amount || 0;
  const paystackId = orderDetails?.name || 'N/A';
  const paymentChannel = orderDetails?.channel || 'N/A';
  const paidAt = orderDetails?.paid_at || orderDetails?.created_at;
  const paymentTime = paidAt ? new Date(paidAt).toLocaleString() : 'N/A';

  // Format items
  let itemsListText = 'Item details not available in metadata.';
  let itemsListHtml = '<li>Item details not available in metadata.</li>';
  if (orderDetails?.metadata?.cart_items && Array.isArray(orderDetails.metadata.cart_items)) {
    itemsListText = orderDetails.metadata.cart_items.map(item =>
      `- ${item.name || 'N/A'} (Qty: ${item.quantity || 'N/A'}, Price: NGN ${(item.price / 100).toFixed(2)})`
    ).join('\n');
    itemsListHtml = orderDetails.metadata.cart_items.map(item =>
      `<li>${item.name || 'N/A'} (Qty: ${item.quantity || 'N/A'}, Price: NGN ${(item.price / 100).toFixed(2)})</li>`
    ).join('');
  }

  // Format address
  let addressString = 'Shipping address not available in verification data.';
  let addressHtml = 'Shipping address not available in verification data.';
  if (orderDetails?.metadata?.shipping_address) {
    const addr = orderDetails.metadata.shipping_address;
    addressString = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}, ${addr.country || ''}`.trim();
    addressHtml = `${addr.street || ''}<br>${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}<br>${addr.country || ''}`.trim();
  }

  // Construct Mail Options
  const mailOptions = {
    from: config.emailConfig.from,
    to: config.emailConfig.businessNotificationEmail,
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

Order Items:
${itemsListText}

Payment Details:
  Total Amount Paid: NGN ${(totalAmount / 100).toFixed(2)}
  Payment Channel: ${paymentChannel}
  Paystack Transaction ID: ${paystackId}
  Payment Time: ${paymentTime}
========================================
`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: #f4b8da; color: #fff; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; }
          .content h2 { color: #f4b8da; font-size: 20px; margin-top: 0; }
          .content p { margin: 10px 0; }
          .content ul { padding-left: 20px; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #777; }
          .footer a { color: #f4b8da; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Order Received - Ref: ${reference}</h1>
          </div>
          <div class="content">
            <h2>Customer Details</h2>
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
            <h2>Shipping Address</h2>
            <p>${addressHtml}</p>
            <h2>Order Items</h2>
            <ul>${itemsListHtml}</ul>
            <h2>Payment Details</h2>
            <p><strong>Total Amount Paid:</strong> NGN ${(totalAmount / 100).toFixed(2)}</p>
            <p><strong>Payment Channel:</strong> ${paymentChannel}</p>
            <p><strong>Paystack Transaction ID:</strong> ${paystackId}</p>
            <p><strong>Payment Time:</strong> ${paymentTime}</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing Lumis Pretty Collection 💎</p>
            <p><a href="http://localhost:5174">Visit our website</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    console.log(`Attempting to send notification email to ${config.emailConfig.businessNotificationEmail} for ref ${reference}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Business notification email sent successfully for ref ${reference}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending business notification email for ref ${reference}:`, error);
  }
};

/**
 * Sends an invoice email to the buyer.
 * @param {object} orderDetails Data retrieved from Paystack verification, including metadata.
 */
const sendBuyerInvoice = async (orderDetails) => {
  const customerEmail = orderDetails?.customer?.email || orderDetails?.metadata?.customer_email;
  console.log(`Attempting to send buyer invoice. Transporter: ${!!transporter}, Email: ${customerEmail}`);
  if (!transporter || !customerEmail) {
    console.warn(`Buyer invoice email skipped. Transporter: ${!!transporter}, Email: ${customerEmail}`);
    return;
  }

  const reference = orderDetails?.reference || 'N/A';
  const customerName = orderDetails?.metadata?.customer_name || 'Customer';
  const totalAmount = orderDetails?.amount || 0;
  const paidAt = orderDetails?.paid_at || orderDetails?.created_at;
  const paymentTime = paidAt ? new Date(paidAt).toLocaleString() : 'N/A';

  // Format items
  let itemsListText = 'Item details not available.';
  let itemsListHtml = '<li>Item details not available.</li>';
  if (orderDetails?.metadata?.cart_items && Array.isArray(orderDetails.metadata.cart_items)) {
    itemsListText = orderDetails.metadata.cart_items.map(item =>
      `- ${item.name || 'N/A'} (Qty: ${item.quantity || 'N/A'}, Price: NGN ${(item.price / 100).toFixed(2)})`
    ).join('\n');
    itemsListHtml = orderDetails.metadata.cart_items.map(item =>
      `<li>${item.name || 'N/A'} (Qty: ${item.quantity || 'N/A'}, Price: NGN ${(item.price / 100).toFixed(2)})</li>`
    ).join('');
  }

  // Format address
  let addressString = 'Shipping address not provided.';
  let addressHtml = 'Shipping address not provided.';
  if (orderDetails?.metadata?.shipping_address) {
    const addr = orderDetails.metadata.shipping_address;
    addressString = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}, ${addr.country || ''}`.trim();
    addressHtml = `${addr.street || ''}<br>${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}<br>${addr.country || ''}`.trim();
  }

  // Construct Mail Options
  const mailOptions = {
    from: config.emailConfig.from,
    to: customerEmail,
    subject: `Your Lumis Jewelry Order Invoice - Ref: ${reference}`,
    text: `Dear ${customerName},\n
Thank you for your order with Lumis Pretty Collection!\n
========================================
Order Reference: ${reference}
========================================

Shipping Address:
${addressString}

Order Items:
${itemsListText}

Payment Details:
  Total Amount Paid: NGN ${(totalAmount / 100).toFixed(2)}
  Payment Time: ${paymentTime}
========================================

We’re preparing your order and will notify you when it ships. Thank you for choosing us!\n
Best regards,\nLumis Pretty Collection 💎
`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: #f4b8da; color: #fff; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; }
          .content h2 { color: #f4b8da; font-size: 20px; margin-top: 0; }
          .content p { margin: 10px 0; }
          .content ul { padding-left: 20px; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #777; }
          .footer a { color: #f4b8da; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Order!</h1>
          </div>
          <div class="content">
            <p>Dear ${customerName},</p>
            <p>Thank you for shopping with Lumis Pretty Collection! Below is your order invoice.</p>
            <h2>Order Reference: ${reference}</h2>
            <h2>Shipping Address</h2>
            <p>${addressHtml}</p>
            <h2>Order Items</h2>
            <ul>${itemsListHtml}</ul>
            <h2>Payment Details</h2>
            <p><strong>Total Amount Paid:</strong> NGN ${(totalAmount / 100).toFixed(2)}</p>
            <p><strong>Payment Time:</strong> ${paymentTime}</p>
            <p>We’re preparing your order and will notify you when it ships.</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing Lumis Pretty Collection 💎</p>
            <p><a href="http://localhost:5174">Visit our website</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    console.log(`Attempting to send invoice email to ${customerEmail} for ref ${reference}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Buyer invoice email sent successfully for ref ${reference}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending buyer invoice email for ref ${reference}:`, error);
  }
};

export { sendBusinessNotification, sendBuyerInvoice };
