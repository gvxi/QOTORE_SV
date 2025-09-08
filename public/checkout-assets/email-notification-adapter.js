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
     * @returns {Object} - Formatted email payload matching API expectations
     */
    buildEmailPayload(orderData, customerInfo) {
        const totalAmount = orderData.total_amount ? (orderData.total_amount / 1000).toFixed(3) : '0.000';

        // Build items array - ensure all required fields are present
        const items = orderData.items && orderData.items.length > 0 ? orderData.items.map(item => ({
            fragrance_name: item.fragrance_name || 'Unknown Fragrance',
            fragrance_brand: item.fragrance_brand || '',
            variant_size: item.variant_size || 'Unknown Size',
            quantity: item.quantity || 1,
            total_price_cents: item.total_price_cents || 0
        })) : [];

        // Ensure all required fields are present with fallbacks
        const payload = {
            order_number: orderData.order_number || 'UNKNOWN-ORDER',
            total_amount_omr: totalAmount,
            created_at: orderData.created_at || new Date().toISOString(),
            customer: {
                first_name: orderData.customer_first_name || 'Unknown',
                last_name: orderData.customer_last_name || '',
                phone: orderData.customer_phone || 'Not provided',
                email: orderData.customer_email || ''
            },
            delivery: {
                address: orderData.delivery_address || 'Not provided',
                city: orderData.delivery_city || 'Unknown',
                region: orderData.delivery_region || 'Unknown',
                notes: orderData.notes || ''
            },
            items: items
        };

        // Log the payload for debugging
        console.log('Email payload being sent:', JSON.stringify(payload, null, 2));
        
        return payload;
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
     * Enable email notifications (always enabled)
     */
    enable() {
        console.log('Email notifications are always enabled');
    }

    /**
     * Disable email notifications (not allowed - always enabled)
     */
    disable() {
        console.log('Email notifications cannot be disabled - always enabled for admin');
    }

    /**
     * Check if email notifications are enabled (always true)
     * @returns {boolean}
     */
    isEmailEnabled() {
        return true;
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

console.log('📧 ENA');