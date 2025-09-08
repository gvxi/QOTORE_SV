// Email Notification Adapter for Order Notifications
// This module handles sending admin email notifications when orders are placed

class EmailNotificationAdapter {
    constructor() {
        this.apiEndpoint = '/api/send-admin-notification';
        this.isEnabled = true;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Send order notification email to admin
     * @param {Object} orderData - Complete order information
     * @param {Object} customerInfo - Customer information
     * @returns {Promise<Object>} - Result of email sending attempt
     */
    async sendOrderNotification(orderData, customerInfo) {
        if (!this.isEnabled) {
            console.log('Email notifications are disabled');
            return { success: false, reason: 'disabled' };
        }

        try {
            console.log('📧 Sending order notification email for order:', orderData.order_number);
            
            const emailPayload = this.buildEmailPayload(orderData, customerInfo);
            const result = await this.sendWithRetry(emailPayload);
            
            if (result.success) {
                console.log('✅ Order notification email sent successfully');
            } else {
                console.error('❌ Failed to send order notification email:', result.error);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Email notification error:', error);
            return { 
                success: false, 
                error: error.message,
                reason: 'exception'
            };
        }
    }

    /**
     * Build email payload with order and customer information
     * @param {Object} orderData - Order information
     * @param {Object} customerInfo - Customer information
     * @returns {Object} - Formatted email payload
     */
    buildEmailPayload(orderData, customerInfo) {
        const orderDate = new Date().toLocaleString('en-GB', {
            timeZone: 'Asia/Muscat',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const totalAmount = orderData.total_amount ? (orderData.total_amount / 1000).toFixed(3) : '0.000';
        const itemsCount = orderData.items ? orderData.items.length : 0;
        const totalItems = orderData.items ? 
            orderData.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;

        // Build items list for email
        let itemsList = '';
        if (orderData.items && orderData.items.length > 0) {
            itemsList = orderData.items.map(item => {
                const itemPrice = item.variant_price_cents ? 
                    (item.variant_price_cents / 1000).toFixed(3) : 'Contact';
                const itemTotal = item.total_price_cents ? 
                    (item.total_price_cents / 1000).toFixed(3) : 'Contact';
                
                return `• ${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name}
  Size: ${item.variant_size}
  Quantity: ${item.quantity}
  Price: ${itemPrice} OMR each
  Total: ${itemTotal} OMR`;
            }).join('\n\n');
        } else {
            itemsList = 'No items found';
        }

        // Build customer info section
        const customerName = orderData.customer_first_name + 
            (orderData.customer_last_name ? ' ' + orderData.customer_last_name : '');
        
        const deliveryInfo = orderData.delivery_address || 'Not provided';
        const location = `${orderData.delivery_city || 'Unknown'}, ${orderData.delivery_region || 'Unknown'}`;

        return {
            orderNumber: orderData.order_number,
            customerName: customerName,
            customerPhone: orderData.customer_phone,
            customerEmail: orderData.customer_email || 'Not provided',
            deliveryAddress: deliveryInfo,
            location: location,
            notes: orderData.notes || 'No special notes',
            totalAmount: totalAmount,
            itemsCount: itemsCount,
            totalItems: totalItems,
            itemsList: itemsList,
            orderDate: orderDate,
            customerIP: orderData.customer_ip || 'Unknown'
        };
    }

    /**
     * Send email with retry logic
     * @param {Object} emailPayload - Email data to send
     * @returns {Promise<Object>} - Result of sending attempt
     */
    async sendWithRetry(emailPayload) {
        let lastError = null;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`📨 Email attempt ${attempt}/${this.retryAttempts}`);
                
                const response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(emailPayload)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    return { 
                        success: true, 
                        attempt: attempt,
                        messageId: result.messageId 
                    };
                } else {
                    lastError = result.error || `HTTP ${response.status}`;
                    console.warn(`📨 Email attempt ${attempt} failed:`, lastError);
                }

            } catch (error) {
                lastError = error.message;
                console.warn(`📨 Email attempt ${attempt} error:`, error.message);
            }

            // Wait before retry (except on last attempt)
            if (attempt < this.retryAttempts) {
                await this.delay(this.retryDelay * attempt); // Progressive delay
            }
        }

        return { 
            success: false, 
            error: lastError || 'Unknown error',
            attempts: this.retryAttempts 
        };
    }

    /**
     * Test email configuration
     * @returns {Promise<Object>} - Test result
     */
    async testConfiguration() {
        try {
            console.log('🧪 Testing email configuration...');
            
            const response = await fetch('/api/test-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                console.log('✅ Email configuration test successful');
                return { success: true, message: result.message };
            } else {
                console.error('❌ Email configuration test failed:', result.error);
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error('❌ Email test error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enable email notifications
     */
    enable() {
        this.isEnabled = true;
        console.log('📧 EMA ON');
    }

    /**
     * Disable email notifications
     */
    disable() {
        this.isEnabled = false;
        console.log('📧 EMA OFF');
    }

    /**
     * Check if email notifications are enabled
     * @returns {boolean}
     */
    isEmailEnabled() {
        return this.isEnabled;
    }

    /**
     * Utility function for delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format order summary for quick reference
     * @param {Object} emailPayload - Email payload data
     * @returns {string} - Formatted summary
     */
    formatOrderSummary(emailPayload) {
        return `Order ${emailPayload.orderNumber} - ${emailPayload.customerName} - ${emailPayload.totalAmount} OMR`;
    }
}

// Create global instance
window.EmailNotificationAdapter = EmailNotificationAdapter;

// Create and export instance for immediate use
const emailNotifier = new EmailNotificationAdapter();

/**
 * Helper function to send order notification (simplified interface)
 * @param {Object} orderData - Order data
 * @param {Object} customerInfo - Customer information
 * @returns {Promise<Object>} - Notification result
 */
async function sendOrderNotification(orderData, customerInfo) {
    return await emailNotifier.sendOrderNotification(orderData, customerInfo);
}

/**
 * Helper function to test email configuration
 * @returns {Promise<Object>} - Test result
 */
async function testEmailConfiguration() {
    return await emailNotifier.testConfiguration();
}

// Export for use in other modules
window.sendOrderNotification = sendOrderNotification;
window.testEmailConfiguration = testEmailConfiguration;
window.emailNotifier = emailNotifier;

console.log('📧 EMA');