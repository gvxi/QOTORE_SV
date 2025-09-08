// Create this file as: /functions/api/review-order.js

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
function initSupabase(env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Generate secure token for order review
function generateReviewToken(orderId, timestamp) {
  const data = `${orderId}-${timestamp}`;
  // In a real implementation, you'd use a proper HMAC with a secret key
  // For now, we'll use a simple encoding that includes validation data
  return btoa(data).replace(/[+=\/]/g, '').substring(0, 32);
}

// Validate review token
function validateReviewToken(token, orderId) {
  try {
    // In a real implementation, you'd verify the HMAC signature
    // For now, we'll decode and check timestamp
    const decoded = atob(token.padEnd(32, 'A'));
    const [tokenOrderId, timestamp] = decoded.split('-');
    
    // Check if token matches order ID
    if (parseInt(tokenOrderId) !== parseInt(orderId)) {
      return { valid: false, reason: 'Invalid token for this order' };
    }
    
    // Check if token is within 24 hours
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (now - tokenTime > twentyFourHours) {
      return { valid: false, reason: 'Token has expired (24 hours)' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid token format' };
  }
}

// CORS headers
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true'
};

// Handle GET request - Mark order as reviewed
export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order');
    const token = url.searchParams.get('token');
    
    if (!orderId || !token) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link - Qotore</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #f8fafc; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Invalid Review Link</h1>
            <p>This link is missing required parameters. Please use the link from the original email.</p>
          </div>
        </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Validate token
    const validation = validateReviewToken(token, orderId);
    if (!validation.valid) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired - Qotore</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #f8fafc; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .error { color: #dc2626; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #8B4513; color: white; text-decoration: none; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Link Expired</h1>
            <p>${validation.reason}</p>
            <p>Please use the admin dashboard to manage orders.</p>
            <a href="/admin/orders-management.html" class="btn">Go to Admin Dashboard</a>
          </div>
        </body>
        </html>
      `, {
        status: 410,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Initialize Supabase and update order
    const supabase = initSupabase(env);
    
    // Check if order exists and is still pending
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, status, customer_first_name')
      .eq('id', orderId)
      .single();
    
    if (fetchError || !order) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order Not Found - Qotore</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #f8fafc; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Order Not Found</h1>
            <p>The order could not be found in the system.</p>
          </div>
        </body>
        </html>
      `, {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Check if order is already reviewed
    if (order.status === 'reviewed' || order.status === 'completed') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order Already Reviewed - Qotore</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #f8fafc; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .success { color: #059669; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #8B4513; color: white; text-decoration: none; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">Order Already Processed</h1>
            <p>Order ${order.order_number} has already been reviewed and processed.</p>
            <a href="/admin/orders-management.html" class="btn">View All Orders</a>
          </div>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Update order status to reviewed
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'reviewed',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Update Failed - Qotore</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #f8fafc; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Update Failed</h1>
            <p>Could not update the order status. Please try again or use the admin dashboard.</p>
          </div>
        </body>
        </html>
      `, {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Success response
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Reviewed - Qotore</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #f8fafc; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .success { color: #059669; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #8B4513; color: white; text-decoration: none; border-radius: 8px; margin-right: 10px; }
          .btn-secondary { background: #6b7280; }
          .checkmark { font-size: 48px; color: #059669; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1 class="success">Order Reviewed Successfully</h1>
          <p>Order ${order.order_number} for ${order.customer_first_name} has been marked as reviewed.</p>
          <p>The order status has been updated in the system.</p>
          <div style="margin-top: 30px;">
            <a href="/admin/orders-management.html" class="btn">View All Orders</a>
            <a href="https://wa.me" class="btn btn-secondary">Contact Customer</a>
          </div>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error in review-order:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

// Export function to generate review URL (for use in email template)
export function generateReviewUrl(baseUrl, orderId) {
  const timestamp = Date.now();
  const token = generateReviewToken(orderId, timestamp);
  return `${baseUrl}/api/review-order?order=${orderId}&token=${token}`;
}