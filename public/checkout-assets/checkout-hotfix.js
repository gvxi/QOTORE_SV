(function() {
    'use strict';
    
    let activeOrderData = null;
    let customerIP = null;

    window.showToastFixed = function(message, type = 'success') {
        document.querySelectorAll('.toast, .toast-fixed').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = 'toast-fixed';
        toast.textContent = message;
        
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
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    };

    async function getCustomerIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            customerIP = data.ip;
            return customerIP;
        } catch (error) {
            customerIP = 'guest_' + Date.now();
            return customerIP;
        }
    }

    async function checkActiveOrderDirect() {
        if (!customerIP) {
            await getCustomerIP();
        }

        try {
            const response = await fetch(`/api/check-active-order?ip=${customerIP}`);
            const data = await response.json();
            
            if (data.success && data.has_active_order && data.order) {
                activeOrderData = data.order;
                window.activeOrder = activeOrderData;
                return true;
            } else {
                activeOrderData = null;
                window.activeOrder = null;
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    window.applyHotfixes = async function() {
        const hasActiveOrder = await checkActiveOrderDirect();
        
        const mainContent = document.querySelector('.main-content');
        const cartSection = document.querySelector('.cart-section');
        const sidebarContent = document.getElementById('sidebarContent');
        
        if (hasActiveOrder && cartSection && mainContent) {
            cartSection.style.display = 'none';
            mainContent.style.gridTemplateColumns = '1fr';
            if (sidebarContent) {
                sidebarContent.style.maxWidth = '800px';
                sidebarContent.style.margin = '0 auto';
            }
            setTimeout(() => addInvoiceButton(), 500);
        } else if (cartSection && mainContent) {
            cartSection.style.display = 'block';
            if (window.innerWidth >= 768) {
                mainContent.style.gridTemplateColumns = '1fr 1fr';
            }
            if (sidebarContent) {
                sidebarContent.style.maxWidth = 'none';
                sidebarContent.style.margin = '0';
            }
        }
    };

    function addInvoiceButton() {
        const existingBtn = document.getElementById('invoiceBtn');
        if (existingBtn) existingBtn.remove();
        
        const cancelButton = document.querySelector('button[onclick*="cancelOrder"], button[onclick*="cancel"]');
        const orderDetailsCard = document.querySelector('.order-details-card');
        const orderStatusSection = document.querySelector('.order-status-section');
        
        let insertLocation = null;
        
        if (cancelButton) {
            insertLocation = cancelButton;
        } else if (orderDetailsCard) {
            insertLocation = orderDetailsCard;
        } else if (orderStatusSection) {
            insertLocation = orderStatusSection.lastElementChild;
        }
        
        if (!insertLocation) {
            return;
        }
        
        const invoiceBtn = document.createElement('button');
        invoiceBtn.id = 'invoiceBtn';
        invoiceBtn.innerHTML = '📄 View Order Invoice';
        invoiceBtn.style.cssText = `
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            width: 100%;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
        `;
        
        invoiceBtn.onmouseover = function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 25px rgba(139, 69, 19, 0.4)';
        };
        
        invoiceBtn.onmouseout = function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(139, 69, 19, 0.3)';
        };
        
        invoiceBtn.onclick = function() {
            showInvoiceModalHotfix();
        };
        
        if (cancelButton) {
            cancelButton.parentNode.insertBefore(invoiceBtn, cancelButton);
        } else {
            insertLocation.insertAdjacentElement('afterend', invoiceBtn);
        }
    }

    window.showInvoiceModalHotfix = function() {
        if (!activeOrderData) {
            showToastFixed('No active order to display', 'error');
            return;
        }
        
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
        
        const order = activeOrderData;
        const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let itemsHTML = '';
        let totalItems = 0;
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                totalItems += item.quantity || 1;
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
        } else {
            itemsHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #666;">No items found</td></tr>';
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
                            <div style="margin-bottom: 0.5rem;"><strong>Total Items:</strong> ${totalItems}</div>
                        </div>
                        <div>
                            <h3 style="font-size: 1.1rem; margin-bottom: 1rem; color: #2d3748;">Company Information</h3>
                            <div style="margin-bottom: 0.5rem;"><strong>Company:</strong> Qotore</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Business:</strong> Premium Fragrances</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Location:</strong> Muscat, Oman</div>
                            <div style="margin-bottom: 0.5rem;"><strong>Contact:</strong> WhatsApp Support</div>
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
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
        
        // showToastFixed('📄 Invoice opened successfully!', 'success');
    };

    document.addEventListener('DOMContentLoaded', function() {
        getCustomerIP().then(() => {
            setTimeout(() => {
                // showToastFixed('🔥 HOTFIX v3.1 - Enhanced order detection!', 'success');
            }, 1000);
            
            setTimeout(() => {
                applyHotfixes();
            }, 2000);
        });
        
        window.addEventListener('resize', applyHotfixes);
        
        setInterval(async () => {
            await checkActiveOrderDirect();
            applyHotfixes();
        }, 5000);
    });

    window.addEventListener('load', function() {
        setTimeout(async () => {
            await applyHotfixes();
            // showToastFixed('🔥 HOTFIX v3.1 Applied - Enhanced order detection!', 'success');
        }, 1000);
    });
})();