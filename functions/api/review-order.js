// functions/api/review-order.js
// Order Review API - Sets order status to reviewed with 12-hour expiration

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
};

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const { order_id, review_token } = await request.json();
        
        if (!order_id || !review_token) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing order_id or review_token'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // Initialize Supabase
        const SUPABASE_URL = env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase configuration missing');
        }

        // Get order details
        const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}&select=*`, {
            headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!orderResponse.ok) {
            throw new Error('Failed to fetch order');
        }

        const orders = await orderResponse.json();
        
        if (!orders || orders.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Order not found'
            }), {
                status: 404,
                headers: corsHeaders
            });
        }

        const order = orders[0];

        // Validate review token (should be generated from order_id + created_at + secret)
        const expectedToken = await generateReviewToken(order.id, order.created_at, env.REVIEW_SECRET || 'qotore_review_secret');
        
        if (review_token !== expectedToken) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid review token'
            }), {
                status: 403,
                headers: corsHeaders
            });
        }

        // Check if order is still within 12-hour review window
        const orderTime = new Date(order.created_at);
        const now = new Date();
        const hoursElapsed = (now - orderTime) / (1000 * 60 * 60);
        
        if (hoursElapsed > 12) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Review period expired (12 hours limit)',
                expired: true,
                hours_elapsed: Math.round(hoursElapsed * 10) / 10
            }), {
                status: 410, // Gone
                headers: corsHeaders
            });
        }

        // Check if order is already reviewed
        if (order.status === 'reviewed' || order.reviewed === true) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Order already reviewed',
                order: order,
                already_reviewed: true
            }), {
                status: 200,
                headers: corsHeaders
            });
        }

        // Check if order can be reviewed (must be pending)
        if (order.status !== 'pending') {
            return new Response(JSON.stringify({
                success: false,
                error: `Cannot review order with status: ${order.status}`,
                current_status: order.status
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // Update order status to reviewed
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                status: 'reviewed',
                reviewed: true,
                updated_at: new Date().toISOString()
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.text();
            throw new Error(`Failed to update order: ${error}`);
        }

        const updatedOrders = await updateResponse.json();
        const updatedOrder = updatedOrders[0];

        // Log the review action
        console.log(`Order #${order.order_number} marked as reviewed at ${new Date().toISOString()}`);

        // Send notification to customer about status change (optional)
        try {
            await sendCustomerStatusUpdateEmail(updatedOrder, env);
        } catch (emailError) {
            console.error('Failed to send customer notification:', emailError);
            // Don't fail the review process if email fails
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Order marked as reviewed successfully',
            order: updatedOrder,
            reviewed_at: new Date().toISOString(),
            time_remaining: `${Math.round((12 - hoursElapsed) * 10) / 10} hours remaining`
        }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Order review error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

// Generate secure review token
async function generateReviewToken(orderId, createdAt, secret) {
    const data = `${orderId}-${createdAt}-${secret}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 32); // Return first 32 characters
}

// Send status update email to customer
async function sendCustomerStatusUpdateEmail(order, env) {
    const RESEND_API_KEY = env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
        console.warn('Resend API key not configured');
        return;
    }

    const emailData = {
        from: 'orders@qotore.uk',
        to: order.customer_email,
        subject: `Order Update #${order.order_number} - Now Being Prepared`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 2rem; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1>📦 Order Update</h1>
                    <p>Your order is now being prepared!</p>
                </div>
                
                <div style="padding: 2rem; background: white; border: 1px solid #eee; border-radius: 0 0 12px 12px;">
                    <h2>Order #${order.order_number}</h2>
                    <p>Great news! Your order has been reviewed and is now being prepared for delivery.</p>
                    
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p><strong>Status:</strong> Being Prepared</p>
                        <p><strong>Next Step:</strong> We'll prepare your fragrances with care and arrange delivery</p>
                    </div>
                    
                    <p>We'll contact you soon with delivery details.</p>
                    
                    <div style="text-align: center; margin: 2rem 0;">
                        <p><strong>Need help? Contact us:</strong></p>
                        <p>📱 WhatsApp: +968 9222 5949</p>
                        <p>✉️ Email: orders@qotore.uk</p>
                    </div>
                    
                    <p style="text-align: center; color: #8B4513;"><strong>Thank you for choosing Qotore!</strong></p>
                </div>
            </div>
        `,
        text: `
Order Update #${order.order_number}

Your order is now being prepared!

Status: Being Prepared
Next Step: We'll prepare your fragrances with care and arrange delivery

We'll contact you soon with delivery details.

Need help? Contact us:
WhatsApp: +968 9222 5949
Email: orders@qotore.uk

Thank you for choosing Qotore!
        `
    };

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Email sending failed: ${error}`);
    }

    console.log(`Status update email sent to ${order.customer_email}`);
}

// Handle CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        }
    });
}

// Test endpoint
export async function onRequestGet(context) {
    return new Response(JSON.stringify({
        message: 'Order Review API is working!',
        endpoints: {
            post: 'POST /api/review-order - Mark order as reviewed',
            parameters: {
                order_id: 'Order ID (integer)',
                review_token: 'Security token for verification'
            }
        },
        features: [
            '12-hour review window from order creation',
            'Secure token validation',
            'Status change from pending to reviewed',
            'Automatic customer notification email',
            'Prevents duplicate reviews'
        ],
        security: [
            'Token generated from order_id + created_at + secret',
            'Time-based expiration (12 hours)',
            'Status validation (only pending orders)',
            'Unique token per order'
        ]
    }), {
        headers: corsHeaders
    });
}