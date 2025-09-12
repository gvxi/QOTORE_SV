// Email Notification Adapter for Qotore
class EmailNotificationAdapter {
    constructor() {
        this.apiEndpoint = '/api/send-order-notification';
        this.resendApiKey = null;
        this.adminEmail = 'orders@qotore.uk'; // Default admin email
    }

    async sendOrderNotifications(orderData, userLanguage = 'en') {
        try {
            const notifications = {
                admin: await this.sendAdminNotification(orderData),
                customer: await this.sendCustomerNotification(orderData, userLanguage)
            };

            return {
                success: true,
                notifications,
                message: 'Email notifications sent successfully'
            };
        } catch (error) {
            console.error('Email notification error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send email notifications'
            };
        }
    }

    async sendAdminNotification(orderData) {
        const emailData = {
            type: 'admin_new_order',
            to: this.adminEmail,
            from: 'noreply@qotore.uk',
            subject: `(!) New Order #${orderData.order_number} - ${this.formatPrice(orderData.total_amount)} OMR`,
            data: {
                order: orderData,
                timestamp: new Date().toISOString(),
                timezone: 'Asia/Muscat'
            }
        };

        return await this.sendEmail(emailData);
    }

    async sendCustomerNotification(orderData, language = 'en') {
        const emailData = {
            type: 'customer_order_confirmation',
            to: orderData.customer_email,
            from: 'orders@qotore.uk',
            subject: this.getCustomerSubject(orderData.order_number, language),
            language: language,
            data: {
                order: orderData,
                timestamp: new Date().toISOString(),
                timezone: 'Asia/Muscat'
            }
        };

        return await this.sendEmail(emailData);
    }

    async sendEmail(emailData) {
        try {
            let emailContent;
            
            // Generate email content based on type
            if (emailData.type === 'admin_new_order') {
                emailContent = this.getAdminEmailTemplate(emailData.data.order, emailData.data.reviewUrl);
            } else if (emailData.type === 'customer_order_confirmation') {
                emailContent = this.getCustomerEmailTemplate(emailData.data.order, emailData.language);
            } else {
                throw new Error(`Unknown email type: ${emailData.type}`);
            }

            const payload = {
                from: emailData.from,
                to: emailData.to,
                subject: emailData.subject,
                html: emailContent.html,
                text: emailContent.text
            };

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Email sending failed');
            }

            return {
                success: true,
                messageId: result.messageId,
                provider: result.provider || 'resend'
            };
        } catch (error) {
            console.error('Email sending error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getCustomerSubject(orderNumber, language) {
        const subjects = {
            en: `Order Confirmation #${orderNumber} - Qotore`,
            ar: `تأكيد الطلب #${orderNumber} - قطوره`
        };
        return subjects[language] || subjects.en;
    }

    formatPrice(cents) {
        return (cents / 1000).toFixed(3);
    }

    // Email Templates
    getAdminEmailTemplate(orderData) {
        const orderDate = new Date(orderData.created_at || Date.now()).toLocaleString('en-GB', {
            timeZone: 'Asia/Muscat',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const itemsList = orderData.items.map((item, index) => 
            `${index + 1}. ${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name}
   Size: ${item.variant_size} | Qty: ${item.quantity} | Total: ${this.formatPrice(item.total_price_cents)} OMR`
        ).join('\n\n');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Order Alert - Qotore Admin</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 2rem; text-align: center; }
                    .header h1 { margin: 0; font-size: 1.8rem; }
                    .content { padding: 2rem; }
                    .order-info { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
                    .customer-info { background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
                    .items-list { background: #fff8e1; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
                    .total { background: #e8f5e8; padding: 1rem; border-radius: 8px; text-align: center; font-size: 1.2rem; font-weight: bold; color: #2e7d32; }
                    .actions { display: flex; gap: 1rem; margin: 2rem 0; justify-content: center; flex-wrap: wrap; }
                    .btn { background: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
                    .btn-whatsapp { background: #25D366; }
                    .footer { background: #f8f9fa; padding: 1rem; text-align: center; color: #666; font-size: 0.9rem; }
                    @media (max-width: 600px) {
                        .container { margin: 1rem; }
                        .content { padding: 1rem; }
                        .actions { flex-direction: column; align-items: center; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🛒 New Order Received!</h1>
                        <p>Order #${orderData.order_number}</p>
                    </div>
                    
                    <div class="content">
                        <div class="order-info">
                            <h3>📋 Order Details</h3>
                            <p><strong>Order Number:</strong> #${orderData.order_number}</p>
                            <p><strong>Date:</strong> ${orderDate} (Oman Time)</p>
                            <p><strong>Status:</strong> Pending Review</p>
                        </div>

                        <div class="customer-info">
                            <h3>👤 Customer Information</h3>
                            <p><strong>Name:</strong> ${orderData.customer_first_name} ${orderData.customer_last_name || ''}</p>
                            <p><strong>Phone:</strong> ${orderData.customer_phone}</p>
                            ${orderData.customer_email ? `<p><strong>Email:</strong> ${orderData.customer_email}</p>` : ''}
                            <p><strong>Delivery:</strong> ${orderData.delivery_address}</p>
                            <p><strong>Location:</strong> ${orderData.delivery_region}, ${orderData.delivery_city}</p>
                            ${orderData.notes ? `<p><strong>Notes:</strong> ${orderData.notes}</p>` : ''}
                        </div>

                        <div class="items-list">
                            <h3>🧴 Order Items</h3>
                            ${orderData.items.map((item, index) => `
                                <div style="border-bottom: 1px solid #eee; padding: 0.5rem 0; ${index === orderData.items.length - 1 ? 'border-bottom: none;' : ''}">
                                    <strong>${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name}</strong><br>
                                    <span style="color: #666;">Size: ${item.variant_size} | Quantity: ${item.quantity} | Total: ${this.formatPrice(item.total_price_cents)} OMR</span>
                                </div>
                            `).join('')}
                        </div>

                        <div class="total">
                            TOTAL: ${this.formatPrice(orderData.total_amount)} OMR
                        </div>

                        <div class="actions">
                            <a href="https://wa.me/${orderData.customer_phone.replace(/[^0-9]/g, '')}" class="btn btn-whatsapp">
                                📱 Contact Customer
                            </a>
                            <a href="${process.env.SITE_URL || 'https://qotore.uk'}/admin/" class="btn">
                                🎛️ Manage Orders
                            </a>
                        </div>
                    </div>

                    <div class="footer">
                        <p>This is an automated notification from Qotore Order Management System</p>
                        <p>Received at ${orderDate} (Oman Time)</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
NEW ORDER ALERT - QOTORE

Order Details:
• Order Number: #${orderData.order_number}
• Date: ${orderDate} (Oman Time)
• Status: Pending Review

Customer Information:
• Name: ${orderData.customer_first_name} ${orderData.customer_last_name || ''}
• Phone: ${orderData.customer_phone}
${orderData.customer_email ? `• Email: ${orderData.customer_email}` : ''}

Delivery Information:
• Method: ${orderData.delivery_address}
• Location: ${orderData.delivery_region}, ${orderData.delivery_city}
${orderData.notes ? `• Notes: ${orderData.notes}` : ''}

Order Items:
${itemsList}

TOTAL: ${this.formatPrice(orderData.total_amount)} OMR

Quick Actions:
• Contact Customer: https://wa.me/${orderData.customer_phone.replace(/[^0-9]/g, '')}
• Manage Orders: ${process.env.SITE_URL || 'https://qotore.uk'}/admin/

---
This is an automated notification from Qotore Admin System
Order received at ${orderDate} (Oman Time)
        `;

        return { html, text };
    }

    getCustomerEmailTemplate(orderData, language = 'en') {
        const translations = {
            en: {
                subject: `Order Confirmation #${orderData.order_number} - Qotore`,
                title: '✅ Order Confirmed!',
                subtitle: 'Thank you for your order',
                orderDetails: 'Order Details',
                orderNumber: 'Order Number',
                orderDate: 'Order Date',
                deliveryInfo: 'Delivery Information',
                method: 'Method',
                location: 'Location',
                notes: 'Notes',
                orderItems: 'Your Items',
                size: 'Size',
                quantity: 'Qty',
                total: 'Total',
                grandTotal: 'TOTAL',
                nextSteps: 'What happens next?',
                nextStep1: '📞 We will contact you within 24 hours to confirm your order',
                nextStep2: '📦 Your fragrances will be prepared with care',
                nextStep3: '🚚 We will arrange delivery to your specified location',
                needHelp: 'Need help? Contact us:',
                whatsapp: 'WhatsApp',
                email: 'Email',
                thankYou: 'Thank you for choosing Qotore!',
                footerText: 'This is an automated confirmation from Qotore Order System'
            },
            ar: {
                subject: `تأكيد الطلب #${orderData.order_number} - قطوره`,
                title: '✅ تم تأكيد طلبك!',
                subtitle: 'شكراً لك على طلبك',
                orderDetails: 'تفاصيل الطلب',
                orderNumber: 'رقم الطلب',
                orderDate: 'تاريخ الطلب',
                deliveryInfo: 'معلومات التوصيل',
                method: 'الطريقة',
                location: 'الموقع',
                notes: 'ملاحظات',
                orderItems: 'عناصر طلبك',
                size: 'الحجم',
                quantity: 'الكمية',
                total: 'المجموع',
                grandTotal: 'المجموع الإجمالي',
                nextSteps: 'ما الذي سيحدث بعد ذلك؟',
                nextStep1: '📞 سنتواصل معك خلال 24 ساعة لتأكيد طلبك',
                nextStep2: '📦 سيتم تحضير عطورك بعناية',
                nextStep3: '🚚 سنقوم بترتيب التوصيل إلى موقعك المحدد',
                needHelp: 'تحتاج مساعدة؟ تواصل معنا:',
                whatsapp: 'واتساب',
                email: 'البريد الإلكتروني',
                thankYou: 'شكراً لك لاختيارك قطوره!',
                footerText: 'هذا تأكيد تلقائي من نظام طلبات قطوره'
            }
        };

        const t = translations[language] || translations.en;
        const isRTL = language === 'ar';

        const orderDate = new Date(orderData.created_at || Date.now()).toLocaleString(language === 'ar' ? 'ar-OM' : 'en-GB', {
            timeZone: 'Asia/Muscat',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const html = `
            <!DOCTYPE html>
            <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${language}">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${t.subject}</title>
                <style>
                    body { font-family: ${isRTL ? 'Tahoma, Arial' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'}, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; direction: ${isRTL ? 'rtl' : 'ltr'}; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 2rem; text-align: center; }
                    .header h1 { margin: 0; font-size: 1.8rem; }
                    .content { padding: 2rem; }
                    .section { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
                    .items-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                    .items-table th, .items-table td { padding: 0.75rem; text-align: ${isRTL ? 'right' : 'left'}; border-bottom: 1px solid #eee; }
                    .items-table th { background: #f8f9fa; font-weight: bold; }
                    .total { background: #e8f5e8; padding: 1rem; border-radius: 8px; text-align: center; font-size: 1.2rem; font-weight: bold; color: #2e7d32; }
                    .next-steps { background: #e3f2fd; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
                    .next-steps ul { ${isRTL ? 'margin-right: 1rem;' : 'margin-left: 1rem;'} }
                    .contact-info { background: #fff8e1; padding: 1.5rem; border-radius: 8px; text-align: center; }
                    .footer { background: #f8f9fa; padding: 1rem; text-align: center; color: #666; font-size: 0.9rem; }
                    @media (max-width: 600px) {
                        .container { margin: 1rem; }
                        .content { padding: 1rem; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${t.title}</h1>
                        <p>${t.subtitle}</p>
                    </div>
                    
                    <div class="content">
                        <div class="section">
                            <h3>${t.orderDetails}</h3>
                            <p><strong>${t.orderNumber}:</strong> #${orderData.order_number}</p>
                            <p><strong>${t.orderDate}:</strong> ${orderDate}</p>
                        </div>

                        <div class="section">
                            <h3>${t.deliveryInfo}</h3>
                            <p><strong>${t.method}:</strong> ${orderData.delivery_address}</p>
                            <p><strong>${t.location}:</strong> ${orderData.delivery_region}, ${orderData.delivery_city}</p>
                            ${orderData.notes ? `<p><strong>${t.notes}:</strong> ${orderData.notes}</p>` : ''}
                        </div>

                        <div class="section">
                            <h3>${t.orderItems}</h3>
                            <table class="items-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>${t.size}</th>
                                        <th>${t.quantity}</th>
                                        <th>${t.total}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${orderData.items.map(item => `
                                        <tr>
                                            <td>${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name}</td>
                                            <td>${item.variant_size}</td>
                                            <td>${item.quantity}</td>
                                            <td>${this.formatPrice(item.total_price_cents)} OMR</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div class="total">
                            ${t.grandTotal}: ${this.formatPrice(orderData.total_amount)} OMR
                        </div>

                        <div class="next-steps">
                            <h3>${t.nextSteps}</h3>
                            <ul>
                                <li>${t.nextStep1}</li>
                                <li>${t.nextStep2}</li>
                                <li>${t.nextStep3}</li>
                            </ul>
                        </div>

                        <div class="contact-info">
                            <p><strong>${t.needHelp}</strong></p>
                            <p><strong>${t.whatsapp}:</strong> +968 9222 5949</p>
                            <p><strong>${t.email}:</strong> orders@qotore.uk</p>
                            <p style="margin-top: 1rem; color: #8B4513;"><strong>${t.thankYou}</strong></p>
                        </div>
                    </div>

                    <div class="footer">
                        <p>${t.footerText}</p>
                        <p>${orderDate} (Oman Time)</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
${t.title}

${t.orderDetails}:
• ${t.orderNumber}: #${orderData.order_number}
• ${t.orderDate}: ${orderDate}

${t.deliveryInfo}:
• ${t.method}: ${orderData.delivery_address}
• ${t.location}: ${orderData.delivery_region}, ${orderData.delivery_city}
${orderData.notes ? `• ${t.notes}: ${orderData.notes}` : ''}

${t.orderItems}:
${orderData.items.map((item, index) => 
    `${index + 1}. ${item.fragrance_brand ? item.fragrance_brand + ' ' : ''}${item.fragrance_name} (${item.variant_size}) x${item.quantity} = ${this.formatPrice(item.total_price_cents)} OMR`
).join('\n')}

${t.grandTotal}: ${this.formatPrice(orderData.total_amount)} OMR

${t.nextSteps}
1. ${t.nextStep1}
2. ${t.nextStep2}  
3. ${t.nextStep3}

${t.needHelp}
${t.whatsapp}: +968 9222 5949
${t.email}: orders@qotore.uk

${t.thankYou}

---
${t.footerText}
${orderDate} (Oman Time)
        `;

        return { html, text };
    }
}

// Usage functions for checkout integration
async function sendOrderEmailNotifications(orderData, userLanguage = 'en') {
    const emailAdapter = new EmailNotificationAdapter();
    return await emailAdapter.sendOrderNotifications(orderData, userLanguage);
}

function getUserLanguagePreference() {
    // Check user profile language
    if (typeof userProfile !== 'undefined' && userProfile?.language) {
        return userProfile.language;
    }
    
    // Check current website language
    if (typeof currentLanguage !== 'undefined') {
        return currentLanguage;
    }
    
    // Check localStorage
    const savedLang = localStorage.getItem('qotore_language');
    if (savedLang) {
        return savedLang;
    }
    
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang) {
        return urlLang;
    }
    
    // Check browser language
    const browserLang = navigator.language || navigator.languages[0];
    if (browserLang.startsWith('ar')) {
        return 'ar';
    }
    
    return 'en'; // Default fallback
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EmailNotificationAdapter = EmailNotificationAdapter;
    window.sendOrderEmailNotifications = sendOrderEmailNotifications;
    window.getUserLanguagePreference = getUserLanguagePreference;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EmailNotificationAdapter,
        sendOrderEmailNotifications,
        getUserLanguagePreference
    };
}