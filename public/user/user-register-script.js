// Updated user-register-script.js with Toast System - No Alerts

let supabase;
let currentLanguage = 'en';
let translations = {};
let isProcessing = false;
let currentStep = 1;
let googleUserData = null;

// Toast notification system
let toastContainer;

// Initialize toast container
function initializeToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
            max-width: 90vw;
            width: auto;
        `;
        document.body.appendChild(toastContainer);
    }
}

// Show toast notification
function showToast(message, type = 'info', duration = 5000) {
    initializeToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Toast styles
    const baseStyles = `
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border-left: 4px solid;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 500px;
        font-size: 14px;
        line-height: 1.4;
        font-weight: 500;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        cursor: pointer;
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
    `;
    
    let iconColor, borderColor, textColor, bgColor;
    let icon;
    
    switch (type) {
        case 'success':
            iconColor = '#10B981';
            borderColor = '#10B981';
            textColor = '#064E3B';
            bgColor = '#F0FDF4';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>`;
            break;
        case 'error':
            iconColor = '#EF4444';
            borderColor = '#EF4444';
            textColor = '#7F1D1D';
            bgColor = '#FEF2F2';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
            break;
        case 'warning':
            iconColor = '#F59E0B';
            borderColor = '#F59E0B';
            textColor = '#92400E';
            bgColor = '#FFFBEB';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`;
            break;
        default: // info
            iconColor = '#3B82F6';
            borderColor = '#3B82F6';
            textColor = '#1E3A8A';
            bgColor = '#F0F9FF';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`;
    }
    
    toast.style.cssText = `
        ${baseStyles}
        border-left-color: ${borderColor};
        background: ${bgColor};
        color: ${textColor};
    `;
    
    // Progress bar for auto-dismiss
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: ${borderColor};
        width: 100%;
        transform-origin: left;
        transform: scaleX(1);
        transition: transform ${duration}ms linear;
    `;
    
    toast.innerHTML = `
        <div style="flex-shrink: 0;">
            ${icon}
        </div>
        <div style="flex: 1; min-width: 0;">
            ${message}
        </div>
        <button onclick="removeToast(this.parentElement)" style="
            background: none;
            border: none;
            color: ${textColor};
            opacity: 0.5;
            cursor: pointer;
            padding: 4px;
            margin: -4px;
            border-radius: 4px;
            transition: opacity 0.2s;
            flex-shrink: 0;
        " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='0.5'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    toast.appendChild(progressBar);
    
    // Click to dismiss
    toast.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            removeToast(toast);
        }
    });
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
        
        // Start progress bar animation
        requestAnimationFrame(() => {
            progressBar.style.transform = 'scaleX(0)';
        });
    });
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    return toast;
}

// Remove toast
function removeToast(toast) {
    if (!toast || !toast.parentElement) return;
    
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
        
        // Clean up container if empty
        if (toastContainer && toastContainer.children.length === 0) {
            toastContainer.remove();
            toastContainer = null;
        }
    }, 300);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');
    
    try {
        await loadTranslations();
        await loadConfiguration();
        
        // Wait a bit for Supabase to be ready, then check for OAuth
        setTimeout(async () => {
            if (supabase) {
                await checkForOAuthCallback();
            }
            
            // Hide loading screen using correct ID from HTML
            hideLoadingScreen();
        }, 1000);
        
        setupFormHandlers();
        updateLanguageDisplay();
        prefillFromLocalStorage();
        
    } catch (error) {
        console.error('Initialization error:', error);
        // Always hide loading even on error
        hideLoadingScreen();
    }
});

// Correct function matching actual HTML IDs
function hideLoadingScreen() {
    console.log('Hiding loading screen...');
    
    // Using correct IDs from your HTML
    const loadingSplash = document.getElementById('loadingSplash');
    const registrationContainer = document.querySelector('.registration-container');
    
    if (loadingSplash) {
        console.log('Found loadingSplash element, hiding...');
        loadingSplash.style.opacity = '0';
        setTimeout(() => {
            loadingSplash.style.display = 'none';
        }, 500);
    } else {
        console.log('loadingSplash element not found');
    }
    
    if (registrationContainer) {
        console.log('Found registration container, showing...');
        registrationContainer.style.opacity = '1';
        registrationContainer.style.visibility = 'visible';
    } else {
        console.log('Registration container not found');
    }
    
    console.log('Loading screen hidden');
}

// Setup form event handlers
function setupFormHandlers() {
    // Using correct form ID from HTML
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('Form handlers set up');
    } else {
        console.log('Registration form not found');
    }
    
    // Add input validation
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
    });
}

// Fixed OAuth callback check
async function checkForOAuthCallback() {
    if (!supabase) {
        console.log('Supabase not ready yet');
        return;
    }
    
    try {
        console.log('Checking for OAuth callback...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            return;
        }
        
        if (data?.session?.user) {
            console.log('User session found:', data.session.user.email);
            
            // Check if this is an OAuth user
            const isOAuthUser = data.session.user.app_metadata?.provider === 'google';
            console.log('Is OAuth user:', isOAuthUser);
            
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('profile_completed')
                    .eq('id', data.session.user.id)
                    .maybeSingle();
                
                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Profile query error:', profileError);
                }
                
                if (!profile || !profile.profile_completed) {
                    // Pre-fill form with OAuth data
                    prefillOAuthData(data.session.user);
                    
                    // Add cancel button for OAuth users
                    if (isOAuthUser) {
                        addCancelButtonToRegistrationForm();
                    }
                } else {
                    // Profile already complete, redirect to main page
                    showToast('Welcome back!', 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }
            } catch (profileErr) {
                console.error('Profile check failed:', profileErr);
                prefillOAuthData(data.session.user);
                
                if (isOAuthUser) {
                    addCancelButtonToRegistrationForm();
                }
            }
        } else {
            console.log('No active session found');
        }
    } catch (error) {
        console.error('OAuth callback check failed:', error);
    }
}

// Updated to match actual HTML structure
function addCancelButtonToRegistrationForm() {
    console.log('Adding cancel button for OAuth user...');
    
    // Remove existing cancel button if any
    const existingBtn = document.getElementById('cancelRegistrationBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Find the logo section to add the cancel button
    const logoSection = document.querySelector('.logo-section');
    
    if (logoSection) {
        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelRegistrationBtn';
        cancelBtn.type = 'button';
        cancelBtn.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            padding: 8px 12px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 500;
            z-index: 10;
            backdrop-filter: blur(10px);
        `;
        
        cancelBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
            <span>Cancel</span>
        `;
        
        // Add hover effect
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            cancelBtn.style.transform = 'translateY(-1px)';
        });
        
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            cancelBtn.style.transform = 'translateY(0)';
        });
        
        // Add click handler
        cancelBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Cancel button clicked');
            cancelRegistration();
        };
        
        // Add to logo section
        logoSection.style.position = 'relative';
        logoSection.appendChild(cancelBtn);
        
        console.log('Cancel button added successfully to logo section');
        
        // Also add cancel link at the bottom for better UX
        addCancelLinkToForm();
    } else {
        console.error('Could not find logo-section to add cancel button');
        
        // Fallback: try to add to form content
        const formContent = document.querySelector('.form-content');
        if (formContent) {
            addCancelLinkToForm();
        }
    }
}

// Add cancel link at the bottom of the form
function addCancelLinkToForm() {
    const step3 = document.getElementById('step3');
    
    if (step3 && !document.getElementById('cancelRegistrationLink')) {
        const cancelLink = document.createElement('div');
        cancelLink.id = 'cancelRegistrationLink';
        cancelLink.style.cssText = `
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        `;
        cancelLink.innerHTML = `
            <p style="color: #666; margin-bottom: 5px; font-size: 14px;">
                Don't want to complete registration?
            </p>
            <button type="button" onclick="cancelRegistration()" style="
                background: none;
                border: none;
                color: #dc3545;
                text-decoration: underline;
                cursor: pointer;
                font-size: 14px;
                padding: 5px;
            " onmouseover="this.style.color='#c82333'" onmouseout="this.style.color='#dc3545'">
                Cancel and delete account
            </button>
        `;
        
        step3.appendChild(cancelLink);
        console.log('Cancel link added to form');
    }
}

// Enhanced cancel registration function with toast instead of confirm
async function cancelRegistration() {
    console.log('cancelRegistration called');
    
    // Show confirmation toast with action buttons
    showConfirmationToast(
        'Are you sure you want to cancel registration and delete your account? This cannot be undone.',
        'warning',
        async () => {
            try {
                // Show loading toast
                const loadingToast = showToast('Deleting account...', 'info', 0);
                
                // Show loading state on button
                const cancelBtn = document.getElementById('cancelRegistrationBtn');
                if (cancelBtn) {
                    cancelBtn.innerHTML = `
                        <div style="display: inline-block; width: 14px; height: 14px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        Canceling...
                    `;
                    cancelBtn.disabled = true;
                }
                
                // Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                if (userError || !user) {
                    throw new Error('No user found to delete');
                }
                
                console.log('Deleting user profile and signing out...');
                
                // Delete user profile from database (if exists)
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .delete()
                    .eq('id', user.id);
                
                if (profileError) {
                    console.warn('Profile deletion error:', profileError);
                    // Continue anyway
                }
                
                // Sign out
                const { error: signOutError } = await supabase.auth.signOut();
                
                if (signOutError) {
                    console.warn('Sign out error:', signOutError);
                }
                
                console.log('Account deletion completed');
                
                // Remove loading toast
                removeToast(loadingToast);
                
                // Show success toast
                showToast('Account successfully deleted. Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
                
            } catch (error) {
                console.error('Account deletion error:', error);
                showToast('Failed to delete account. Please try again.', 'error');
                
                // Reset button
                const cancelBtn = document.getElementById('cancelRegistrationBtn');
                if (cancelBtn) {
                    cancelBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                        </svg>
                        <span>Cancel</span>
                    `;
                    cancelBtn.disabled = false;
                }
            }
        }
    );
}

// Show confirmation toast with action buttons
function showConfirmationToast(message, type = 'warning', onConfirm, onCancel = null) {
    initializeToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconColor = '#F59E0B';
    const borderColor = '#F59E0B';
    const textColor = '#92400E';
    const bgColor = '#FFFBEB';
    
    toast.style.cssText = `
        background: ${bgColor};
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border-left: 4px solid ${borderColor};
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 350px;
        max-width: 500px;
        font-size: 14px;
        line-height: 1.4;
        font-weight: 500;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        backdrop-filter: blur(10px);
        color: ${textColor};
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </div>
            <div style="flex: 1;">
                ${message}
            </div>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button onclick="removeToast(this.closest('.toast'))" style="
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                color: #6c757d;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                Cancel
            </button>
            <button onclick="confirmAction(this)" style="
                background: #dc3545;
                border: 1px solid #dc3545;
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                Delete Account
            </button>
        </div>
    `;
    
    // Store confirm callback on the toast element
    toast._onConfirm = onConfirm;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });
    
    return toast;
}

// Global function for confirmation action
window.confirmAction = function(button) {
    const toast = button.closest('.toast');
    if (toast && toast._onConfirm) {
        removeToast(toast);
        toast._onConfirm();
    }
};

// Pre-fill form with OAuth data
function prefillOAuthData(user) {
    console.log('Pre-filling OAuth data for user:', user.email);
    
    // Hide Google signup section since user came from OAuth
    hideGoogleSignIn();
    
    // Pre-fill form fields from OAuth data
    const metadata = user.user_metadata || {};
    
    console.log('OAuth user metadata:', metadata);
    
    // Handle name fields
    if (metadata.full_name) {
        const nameParts = metadata.full_name.split(' ');
        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        
        if (firstNameEl) firstNameEl.value = nameParts[0] || '';
        if (lastNameEl) lastNameEl.value = nameParts.slice(1).join(' ') || '';
    } else {
        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        
        if (firstNameEl) firstNameEl.value = metadata.first_name || metadata.name || '';
        if (lastNameEl) lastNameEl.value = metadata.last_name || '';
    }
    
    // Handle email
    const emailEl = document.getElementById('email');
    if (emailEl) {
        emailEl.value = user.email || '';
        emailEl.readOnly = true;
        emailEl.style.backgroundColor = '#f8f9fa';
        emailEl.style.cursor = 'not-allowed';
        emailEl.style.opacity = '0.7';
    }
    
    // Store OAuth data for later use
    googleUserData = {
        picture: metadata.avatar_url || metadata.picture
    };
    
    // Update page title
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = currentLanguage === 'ar' ? 'إكمال الملف الشخصي' : 'Complete Profile';
    }
    
    // Show success toast
    showToast('Account connected successfully! Please complete your profile below.', 'success');
}

// Initialize Google Sign-In
async function initializeGoogleSignIn(clientId) {
    try {
        const googleSignInButton = document.getElementById('google-signin-button');
        if (googleSignInButton) {
            googleSignInButton.addEventListener('click', async () => {
                try {
                    showProcessing('google-signin-button', true);
                    
                    const { data, error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: window.location.href,
                            queryParams: {
                                access_type: 'offline',
                                prompt: 'consent'
                            }
                        }
                    });

                    if (error) {
                        throw error;
                    }
                } catch (error) {
                    console.error('Google OAuth error:', error);
                    showToast('Failed to sign up with Google. Please try again.', 'error');
                    showProcessing('google-signin-button', false);
                }
            });
        }
    } catch (error) {
        console.error('Google Sign-In initialization error:', error);
        hideGoogleSignIn();
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (isProcessing) return;
    
    try {
        if (!validateAllFields()) {
            showToast('Please correct the errors and try again.', 'error');
            return;
        }
        
        isProcessing = true;
        showProcessing('registerBtn', true);
        
        const formData = collectFormData();
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session check error:', sessionError);
        }
        
        if (session?.user) {
            await completeProfile(formData, session.user);
            showToast('Profile completed successfully! Welcome to QOTORE.', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            await registerNewUser(formData);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showToast(
            error.message || 'Registration failed. Please try again.',
            'error'
        );
    } finally {
        isProcessing = false;
        showProcessing('registerBtn', false);
    }
}

// Load configuration and initialize Supabase
async function loadConfiguration() {
    try {
        const response = await fetch('/api/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const config = await response.json();
            
            if (typeof window.supabase === 'undefined') {
                console.error('Supabase library not loaded');
                throw new Error('Supabase library not available');
            }
            
            const { createClient } = window.supabase;
            supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
            
            console.log('Supabase client initialized');
            
            if (config.GOOGLE_CLIENT_ID) {
                await initializeGoogleSignIn(config.GOOGLE_CLIENT_ID);
            } else {
                hideGoogleSignIn();
            }
        } else {
            console.error('Failed to load configuration');
            throw new Error('Configuration not available');
        }
    } catch (error) {
        console.error('Configuration load error:', error);
        showToast('Service not configured. Please contact support.', 'error');
        throw error;
    }
}

// Helper functions
function hideGoogleSignIn() {
    const googleSection = document.getElementById('googleSection');
    const authDivider = document.getElementById('authDivider');
    
    if (googleSection) googleSection.style.display = 'none';
    if (authDivider) authDivider.style.display = 'none';
}

function prefillFromLocalStorage() {
    const prefillData = localStorage.getItem('registration_prefill');
    if (prefillData) {
        const emailInput = document.getElementById('email');
        if (emailInput && prefillData.includes('@')) {
            emailInput.value = prefillData;
        }
        localStorage.removeItem('registration_prefill');
    }
}

function collectFormData() {
    return {
        firstName: document.getElementById('firstName')?.value.trim() || '',
        lastName: document.getElementById('lastName')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim().toLowerCase() || '',
        phone: document.getElementById('phone')?.value.trim() || '',
        gender: document.getElementById('gender')?.value || '',
        age: parseInt(document.getElementById('age')?.value) || 18,
        wilayat: document.getElementById('wilayat')?.value || '',
        city: document.getElementById('city')?.value.trim() || '',
        agreeTerms: document.getElementById('agreeTerms')?.checked || false,
        agreeMarketing: document.getElementById('agreeMarketing')?.checked || false
    };
}

function validateAllFields() {
    const formData = collectFormData();
    return formData.firstName && formData.lastName && formData.email && formData.phone && formData.agreeTerms;
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    field.classList.remove('error');
    
    if (field.required && !value) {
        field.classList.add('error');
    }
}

function showProcessing(buttonId, show) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const spinner = button.querySelector('.button-spinner');
    const text = button.querySelector('span');
    
    if (show) {
        button.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        if (text) text.style.opacity = '0.7';
    } else {
        button.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (text) text.style.opacity = '1';
    }
}

function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.getElementById(`step${step}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    currentStep = step;
    console.log(`Moved to step ${step}`);
}

function updateLanguageDisplay() {
    console.log('Updating language display');
}

async function loadTranslations() {
    try {
        const response = await fetch('/user/user-translations.json');
        translations = await response.json();
    } catch (error) {
        console.error('Failed to load translations:', error);
        translations = { en: {}, ar: {} };
    }
}

// Register new user with email/password
async function registerNewUser(formData) {
    const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: generateTemporaryPassword(),
        options: {
            data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
                language: currentLanguage
            },
            emailRedirectTo: 'https://qotore.uk'
        }
    });
    
    if (error) {
        if (error.message.includes('already registered')) {
            showToast('An account with this email already exists. Please sign in instead.', 'error');
            setTimeout(() => {
                window.location.href = '/user/login.html';
            }, 2000);
            return;
        }
        throw error;
    }
    
    if (data.user) {
        await completeProfile(formData, data.user);
        
        showToast('Account created successfully! Please check your email to verify your account.', 'success');
        
        setTimeout(() => {
            window.location.href = '/user/verify-email.html';
        }, 3000);
    }
}

// Complete user profile
async function completeProfile(formData, user) {
    try {
        const { data, error } = await supabase.rpc('complete_user_profile', {
            p_first_name: formData.firstName,
            p_last_name: formData.lastName,
            p_phone: formData.phone,
            p_gender: formData.gender,
            p_age: formData.age,
            p_wilayat: formData.wilayat,
            p_city: formData.city,
            p_agree_terms: formData.agreeTerms,
            p_agree_marketing: formData.agreeMarketing
        });
        
        if (error) {
            throw error;
        }
        
        if (googleUserData && googleUserData.picture) {
            await supabase
                .from('user_profiles')
                .update({ google_picture: googleUserData.picture })
                .eq('id', user.id);
        }
        
        console.log('Profile completed successfully');
        
    } catch (error) {
        console.error('Profile completion error:', error);
        throw error;
    }
}

function generateTemporaryPassword() {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
}

// Add CSS animation for spin
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Make global functions available
window.removeToast = removeToast;
window.confirmAction = confirmAction;