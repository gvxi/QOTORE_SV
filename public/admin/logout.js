// Logout functionality with enhanced error handling and session management
class LogoutManager {
    constructor() {
        this.isLoggingOut = false;
        this.logoutTimeout = 10000; // 10 seconds timeout
        this.init();
    }

    init() {
        // Bind logout function to global scope for onclick handlers
        window.logout = this.logout.bind(this);
        
        // Listen for storage events (logout from other tabs)
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // Listen for beforeunload to cleanup if needed
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Check session validity on page load
        this.checkSessionValidity();
    }

    // Main logout function
    async logout(skipConfirmation = false) {
        // Prevent multiple logout attempts
        if (this.isLoggingOut) {
            return;
        }

        // Show confirmation dialog unless skipped
        if (!skipConfirmation && !confirm('Are you sure you want to logout?')) {
            return;
        }

        this.isLoggingOut = true;
        
        try {
            // Update UI to show logout in progress
            this.showLoggingOutState();
            
            // Clear local session data immediately
            this.clearLocalSession();
            
            // Attempt server logout with timeout
            await this.performServerLogout();
            
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always redirect regardless of server response
            this.redirectToLogin();
        }
    }

    // Force logout without confirmation (for session expiry, etc.)
    forceLogout(reason = 'Session expired') {
        console.log('Force logout:', reason);
        this.logout(true); // Skip confirmation
    }

    // Show logging out state in UI
    showLoggingOutState() {
        const logoutBtns = document.querySelectorAll('.logout-btn, [onclick*="logout"]');
        
        logoutBtns.forEach(btn => {
            if (btn.disabled) return;
            
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.cursor = 'not-allowed';
            
            // Update text if it has a span
            const textSpan = btn.querySelector('span');
            if (textSpan) {
                textSpan.setAttribute('data-original-text', textSpan.textContent);
                textSpan.textContent = 'Logging out...';
            }
            
            // Add loading animation if there's an image
            const img = btn.querySelector('img');
            if (img) {
                img.style.animation = 'spin 1s linear infinite';
            }
        });

        // Show logout overlay if it exists
        this.showLogoutOverlay();
    }

    // Show logout overlay for better UX
    showLogoutOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'logout-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(4px);
        `;
        
        const message = document.createElement('div');
        message.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            max-width: 300px;
        `;
        
        message.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <div style="width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top: 3px solid #1a237e; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            </div>
            <h3 style="margin: 0 0 0.5rem 0; color: #1a237e;">Logging out...</h3>
            <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Please wait while we sign you out</p>
        `;
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Clear all local session data
    clearLocalSession() {
        try {
            // Clear localStorage
            const keysToRemove = [
                'admin_session',
                'admin_token',
                'qotor_admin_session',
                'user_preferences',
                'admin_cache'
            ];
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Clear any admin-related cookies by setting them to expire
            this.clearCookies();
            
            // Broadcast logout to other tabs
            localStorage.setItem('logout_event', Date.now().toString());
            localStorage.removeItem('logout_event');
            
        } catch (error) {
            console.error('Error clearing local session:', error);
        }
    }

    // Clear relevant cookies
    clearCookies() {
        const cookiesToClear = [
            'admin_session',
            'admin_token',
            'session_id',
            'auth_token'
        ];
        
        cookiesToClear.forEach(cookieName => {
            // Clear for current domain
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            
            // Clear for admin subdomain if applicable
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        });
    }

    // Perform server-side logout
    async performServerLogout() {
        return new Promise(async (resolve, reject) => {
            // Set timeout for logout request
            const timeoutId = setTimeout(() => {
                reject(new Error('Logout request timeout'));
            }, this.logoutTimeout);

            try {
                const response = await fetch('/api/admin/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    // Add timestamp to prevent caching
                    body: JSON.stringify({ 
                        timestamp: Date.now(),
                        force: true 
                    })
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    console.log('Server logout successful');
                    resolve();
                } else {
                    console.warn('Server logout failed, but continuing with local logout');
                    resolve(); // Don't reject, as local logout is sufficient
                }

            } catch (error) {
                clearTimeout(timeoutId);
                console.warn('Server logout error:', error);
                resolve(); // Don't reject, continue with local logout
            }
        });
    }

    // Redirect to login page
    redirectToLogin() {
        try {
            // Multiple redirect methods for reliability
            const loginUrl = '/admin/login.html';
            
            // Method 1: Standard redirect
            window.location.href = loginUrl;
            
            // Method 2: Force redirect after short delay
            setTimeout(() => {
                window.location.replace(loginUrl);
            }, 1000);
            
            // Method 3: Fallback redirect
            setTimeout(() => {
                if (window.location.pathname !== '/admin/login.html') {
                    window.location.assign(loginUrl);
                }
            }, 2000);
            
        } catch (error) {
            console.error('Redirect error:', error);
            // Last resort: reload page which should redirect to login
            window.location.reload();
        }
    }

    // Handle storage changes (logout from other tabs)
    handleStorageChange(e) {
        if (e.key === 'logout_event') {
            console.log('Logout detected from another tab');
            this.forceLogout('Logged out from another tab');
        }
    }

    // Handle page unload
    handleBeforeUnload(e) {
        if (this.isLoggingOut) {
            // Don't show confirmation if logout is in progress
            return;
        }
    }

    // Check if session is still valid
    async checkSessionValidity() {
        try {
            const response = await fetch('/api/admin/auth/verify', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                console.log('Session invalid, redirecting to login');
                this.forceLogout('Invalid session');
            }

        } catch (error) {
            console.error('Session check error:', error);
            // Don't force logout on network errors
        }
    }

    // Utility method to check if user is logged in
    isLoggedIn() {
        return !this.isLoggingOut && (
            localStorage.getItem('admin_session') ||
            document.cookie.includes('admin_session=')
        );
    }

    // Manual session cleanup (can be called from other scripts)
    cleanup() {
        this.clearLocalSession();
    }
}

// Initialize logout manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.logoutManager = new LogoutManager();
});

// Fallback: Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.logoutManager) {
            window.logoutManager = new LogoutManager();
        }
    });
} else {
    // DOM is already loaded
    if (!window.logoutManager) {
        window.logoutManager = new LogoutManager();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogoutManager;
}