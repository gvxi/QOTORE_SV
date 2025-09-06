// HOTFIX: Direct implementation without relying on other files
(function() {
    'use strict';
    console.log('🔥 HOTFIX v3.0 Loading...');

    // Force toast at bottom center
    window.showToastFixed = function(message, type = 'success') {
        console.log('🔔 HOTFIX Toast:', message);
        
        // Remove existing toasts
        document.querySelectorAll('.toast, .toast-fixed').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = 'toast-fixed';
        toast.textContent = message;
        
        // Force styles directly
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            color: '#333',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            zIndex: '99999',
            borderLeft: `4px solid ${type === 'error' ? '#dc3545' : '#28a745'}`,
            maxWidth: '350px',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '14px',
            animation: 'none',
            transition: 'all 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
        
        console.log('✅ HOTFIX Toast displayed');
    };

    // Force layout changes
    window.applyHotfixes = function() {
        console.log('🔧 Applying layout hotfixes...');
        
        // Check if we have an active order
        const hasActiveOrder = window.activeOrder && window.activeOrder.id;
        console.log('Has active order:', hasActiveOrder);
        
        const mainContent = document.querySelector('.main-content');
        const cartSection = document.querySelector('.cart-section');
        const sidebarContent = document.getElementById('sidebarContent');
        
        if (hasActiveOrder && cartSection && mainContent) {
            // Hide cart and make sidebar full width
            cartSection.style.display = 'none';
            mainContent.style.gridTemplateColumns = '1fr';
            if (sidebarContent) {
                sidebarContent.style.maxWidth = '800px';
                sidebarContent.style.margin = '0 auto';
            }
            console.log('✅ Applied order mode layout');
            
            // Add invoice button if not exists
            addInvoiceButton();
        } else if (cartSection && mainContent) {
            // Show cart and restore 50/50
            cartSection.style.display = 'block';
            if (window.innerWidth >= 768) {
                mainContent.style.gridTemplateColumns = '1fr 1fr';
            }
            if (sidebarContent) {
                sidebarContent.style.maxWidth = 'none';
                sidebarContent.style.margin = '0';
            }
            console.log('✅ Applied cart mode layout');
        }
    };

    // Add invoice button
    function addInvoiceButton() {
        const existingBtn = document.getElementById('invoiceBtn');
        if (existingBtn) return;
        
        const orderStatusSection = document.querySelector('.order-status-section');
        if (!orderStatusSection) return;
        
        const detailsCard = orderStatusSection.querySelector('.order-details-card');
        if (!detailsCard) return;
        
        const invoiceBtn = document.createElement('button');
        invoiceBtn.id = 'invoiceBtn';
        invoiceBtn.className = 'btn btn-primary btn-full';
        invoiceBtn.innerHTML = '📄 View Order Invoice';
        invoiceBtn.style.marginBottom = '1rem';
        invoiceBtn.onclick = function() {
            showInvoiceModalHotfix();
        };
        
        detailsCard.insertAdjacentElement('afterend', invoiceBtn);
        console.log('✅ Added invoice button');
    }

    // Invoice modal
    window.showInvoiceModalHotfix = function() {
        if (!window.activeOrder) {
            showToastFixed('No active order to display', 'error');
            return;
        }
        
        console.log('📄 Showing invoice modal...');
        
        const modal = document.createElement('div');
        modal.id = 'invoiceModalHotfix';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        `;
        
        const order = window.activeOrder;
        const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let itemsHTML = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                itemsHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 1rem; border-bottom: 1px solid #f0f0f0;">
                            <div style="font-weight: 600;">${item.fragrance_name}</div>
                            ${item.fragrance_brand ? `<div style="font-size: 0.875rem; color: #666;">${item.fragrance_brand}</div>` : ''}
                        </td>
                        <td style="padding: 1rem; border-bottom: 1px solid #f0f0f0;">${item.variant_size}</td>
                        <td style="padding: 1rem; text-align: center; border-bottom: 1px solid #f0f0f0; font-weight: 600;">${item.quantity}</td>
                        <td style="padding: 1rem; text-align: right; border-bottom: 1px solid #f0f0f0;">${(item.unit_price || 0).toFixed(3)} OMR</td>
                        <td style="padding: 1rem; text-align: right; border-bottom: 1px solid #f0f0f0; font-weight: 600;">${(item.total || 0).toFixed(3)} OMR</td>
                    </tr>
                `;
            });
        }
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 2rem; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 1.5rem;">📄 Order Invoice</h2>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="window.print()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">🖨️ Print</button>
                        <button onclick="document.getElementById('invoiceModalHotfix').remove(); document.body.style.overflow = 'auto';" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 0.5rem; border-radius: 8px; cursor: pointer; width: 40px; height: 40px;">×</button>
                    </div>
                </div>
                
                <div style="padding: 2rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 2px solid #f8f9fa;">
                        <div>
                            <h3 style="font-size: 1.1rem; margin-bottom: 1rem; color: #2d3748;">Order Information</h3>
                            <div style="margin-bottom: 0.5rem;"><strong>Order Number:</strong> <span style="color: #8B4513; font-weight: 700;">${order.order_number}</span></div>
                            <div style="margin-bottom: 0.5rem;"><strong>Date:</strong> ${orderDate}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Status:</strong> <span style="background: #fff3cd; color: #856404; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.75rem;">${order.status_display}</span></div>
                        </div>
                        <div>
                            <h3 style="font-size: 1.1rem; margin-bottom: 1rem; color: #2d3748;">Company Information</h3>
                            <div style="margin-bottom: 0.5rem;"><strong>Company:</strong> Qotore</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Business:</strong> Premium Fragrances</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Location:</strong> Muscat, Oman</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <h3 style="font-size: 1.2rem; margin-bottom: 1rem; color: #2d3748;">Order Items</h3>
                        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                            <thead>
                                <tr style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
                                    <th style="padding: 1rem; text-align: left; font-weight: 700; color: #495057;">Item</th>
                                    <th style="padding: 1rem; text-align: left; font-weight: 700; color: #495057;">Size</th>
                                    <th style="padding: 1rem; text-align: center; font-weight: 700; color: #495057;">Qty</th>
                                    <th style="padding: 1rem; text-align: right; font-weight: 700; color: #495057;">Unit Price</th>
                                    <th style="padding: 1rem; text-align: right; font-weight: 700; color: #495057;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHTML}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); padding: 1.5rem; border-radius: 12px; border: 2px solid #c3e6cb;">
                        <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 700; color: #155724;">
                            <span>Total Amount:</span>
                            <span>${((order.total_amount || 0) / 1000).toFixed(3)} OMR</span>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e9ecef; color: #6c757d;">
                        <p>Thank you for choosing Qotore!</p>
                        <p>For support, contact us via WhatsApp</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Close on background click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    };

    // Auto-apply fixes when page loads
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔥 HOTFIX: DOM loaded, applying fixes...');
        
        // Test toast immediately
        setTimeout(() => {
            showToastFixed('🔥 HOTFIX v3.0 - Toast should be at bottom center!', 'success');
        }, 1000);
        
        // Apply layout fixes
        setTimeout(() => {
            applyHotfixes();
        }, 2000);
        
        // Re-apply fixes when window resizes
        window.addEventListener('resize', applyHotfixes);
        
        // Monitor for order changes
        let lastOrderCheck = null;
        setInterval(() => {
            const currentOrder = window.activeOrder;
            if (JSON.stringify(currentOrder) !== JSON.stringify(lastOrderCheck)) {
                console.log('🔄 Order state changed, re-applying fixes...');
                lastOrderCheck = currentOrder;
                setTimeout(applyHotfixes, 100);
            }
        }, 1000);
    });

    // Also apply when window loads
    window.addEventListener('load', function() {
        console.log('🔥 HOTFIX: Window loaded, final fixes...');
        setTimeout(() => {
            applyHotfixes();
            showToastFixed('🔥 HOTFIX Applied - Layout should now work correctly!', 'success');
        }, 500);
    });

    console.log('✅ HOTFIX loaded successfully');
})();