// User Authentication Script using Supabase Auth - Updated with Toast System
let currentLanguage = 'en';
let translations = {};
let supabase = null;
let isProcessing = false;

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

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingSplash();
        await loadConfiguration();
        await loadTranslations();
        loadLanguagePreference();
        checkExistingSession();
        initializeEventListeners();
        hideLoadingSplash();
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoadingSplash();
        showToast('Error loading page. Please refresh and try again.', 'error');
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
            
            // Check if Supabase library is loaded
            if (typeof window.supabase === 'undefined') {
                console.error('Supabase library not loaded');
                throw new Error('Supabase library not available');
            }
            
            // Initialize Supabase client
            const { createClient } = window.supabase;
            supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
            
            console.log('Supabase client initialized');
            
            // Initialize Google Sign-In if configured
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

// Check for existing session
async function checkExistingSession() {
    if (!supabase) return;
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            return;
        }
        
        if (session) {
            // User is already logged in, redirect to main page
            console.log('User already logged in:', session.user);
            showToast('You are already logged in. Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        }
    } catch (error) {
        console.error('Session check failed:', error);
    }
}

// Initialize Google Sign-In
async function initializeGoogleSignIn(clientId) {
    try {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleSignIn,
                auto_select: false,
                cancel_on_tap_outside: true
            });

            const googleSignInButton = document.getElementById('google-signin-button');
            if (googleSignInButton) {
                googleSignInButton.addEventListener('click', async () => {
                    try {
                        showProcessing('google-signin-button', true);
                        
                        // FIXED: Redirect to register.html instead of profile-completion.html
                        const { data, error } = await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: window.location.origin + '/user/register.html'
                            }
                        });

                        if (error) {
                            throw error;
                        }
                        
                        // OAuth redirect will handle the rest
                    } catch (error) {
                        console.error('Google OAuth error:', error);
                        showToast('Failed to sign in with Google. Please try again.', 'error');
                        showProcessing('google-signin-button', false);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Google Sign-In initialization error:', error);
        hideGoogleSignIn();
    }
}

// Handle Google Sign-In callback (fallback for direct Google API)
async function handleGoogleSignIn(response) {
    try {
        showProcessing('google-signin-button', true);
        
        // This is a fallback - normally OAuth redirect handles this
        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential
        });
        
        if (error) {
            throw error;
        }
        
        console.log('Google sign-in successful:', data);
        handleSuccessfulAuth(data);
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        showToast(t('google_signin_error') || 'Failed to sign in with Google. Please try again.', 'error');
    } finally {
        showProcessing('google-signin-button', false);
    }
}

// Hide Google Sign-In if not configured
function hideGoogleSignIn() {
    const googleSection = document.querySelector('.google-signin-section');
    const authDivider = document.querySelector('.auth-divider');
    
    if (googleSection) googleSection.style.display = 'none';
    if (authDivider) authDivider.style.display = 'none';
}

// Initialize event listeners
function initializeEventListeners() {
    const emailForm = document.getElementById('emailLoginForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailLogin);
    }
}

// Handle email/phone login
async function handleEmailLogin(event) {
    event.preventDefault();
    
    if (isProcessing || !supabase) return;
    
    const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
    
    if (!emailOrPhone) {
        showToast(t('email_phone_required') || 'Please enter your email or phone number.', 'error');
        return;
    }
    
    try {
        isProcessing = true;
        showProcessing('emailSubmitBtn', true);
        
        const isEmail = emailOrPhone.includes('@');
        
        if (isEmail) {
            // Use Supabase magic link for email login
            const { data, error } = await supabase.auth.signInWithOtp({
                email: emailOrPhone,
                options: {
                    emailRedirectTo: 'https://qotore.uk'
                }
            });
            
            if (error) {
                if (error.message.includes('User not found')) {
                    // User doesn't exist, redirect to registration
                    localStorage.setItem('registration_prefill', emailOrPhone);
                    window.location.href = '/user/register.html';
                    return;
                }
                throw error;
            }
            
            // Show success message
            showToast(
                t('magic_link_sent') || `A magic link has been sent to ${emailOrPhone}. Check your email to sign in.`,
                'success'
            );
            
            // Change button to indicate email was sent
            const submitBtn = document.getElementById('emailSubmitBtn');
            if (submitBtn) {
                const span = submitBtn.querySelector('span');
                if (span) {
                    span.textContent = t('email_sent') || 'Email Sent!';
                }
                submitBtn.disabled = true;
            }
            
        } else {
            // Handle phone login (SMS OTP) - needs to be enabled in Supabase
            const { data, error } = await supabase.auth.signInWithOtp({
                phone: emailOrPhone
            });
            
            if (error) {
                if (error.message.includes('User not found')) {
                    localStorage.setItem('registration_prefill', emailOrPhone);
                    window.location.href = '/user/register.html';
                    return;
                }
                throw error;
            }
            
            // Redirect to phone verification
            localStorage.setItem('phone_verification', emailOrPhone);
            window.location.href = '/user/verify-phone.html';
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(
            error.message || t('login_error') || 'Login failed. Please try again.',
            'error'
        );
    } finally {
        isProcessing = false;
        showProcessing('emailSubmitBtn', false);
    }
}

// Handle successful authentication
function handleSuccessfulAuth(authData) {
    if (authData.user) {
        showToast(t('login_success') || 'Welcome back!', 'success');
        
        // Log user activity
        logUserActivity('user_login');
        
        // Check if profile is complete, redirect accordingly
        setTimeout(async () => {
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('profile_completed')
                .eq('id', authData.user.id)
                .maybeSingle(); // Use maybeSingle() instead of single()
            
            // Handle profile error or no profile found
            if (profileError && profileError.code !== 'PGRST116') {
                console.warn('Profile check error:', profileError);
                // Continue to main page even if profile check fails
                window.location.href = '/';
                return;
            }
            
            if (!profile || !profile.profile_completed) {
                window.location.href = '/user/register.html?complete=true';
            } else {
                window.location.href = '/';
            }
        }, 2000);
    }
}

// Log user activity
async function logUserActivity(action, details = null) {
    if (!supabase) return;
    
    try {
        const { error } = await supabase.rpc('log_user_activity', {
            p_action: action,
            p_details: details
        });
        
        if (error) {
            console.warn('Failed to log activity:', error);
        }
    } catch (error) {
        console.warn('Activity logging error:', error);
    }
}

// Translation Management
async function loadTranslations() {
    try {
        const response = await fetch('/user/user-translations.json');
        translations = await response.json();
    } catch (error) {
        console.error('Failed to load translations:', error);
        translations = { en: {}, ar: {} };
    }
}

function t(key) {
    return translations[currentLanguage]?.[key] || key;
}

function updateTranslations() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const translation = t(key);
        if (translation !== key) {
            element.textContent = translation;
        }
    });
    
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        const translation = t(key);
        if (translation !== key) {
            element.placeholder = translation;
        }
    });

    const titleElement = document.querySelector('title');
    if (titleElement) {
        const titleKey = titleElement.getAttribute('data-translate');
        if (titleKey) {
            const translation = t(titleKey);
            if (translation !== titleKey) {
                titleElement.textContent = translation;
            }
        }
    }
}

function loadLanguagePreference() {
    const savedLanguage = localStorage.getItem('qotore_language') || 'en';
    currentLanguage = savedLanguage;
    
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    const langButton = document.getElementById('currentLang');
    if (langButton) {
        langButton.textContent = currentLanguage.toUpperCase();
    }
    
    updateTranslations();
}

function toggleLanguage() {
    showLoadingSplash();
    
    const newLanguage = currentLanguage === 'en' ? 'ar' : 'en';
    currentLanguage = newLanguage;
    
    localStorage.setItem('qotore_language', currentLanguage);
    
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    const langButton = document.getElementById('currentLang');
    if (langButton) {
        langButton.textContent = currentLanguage.toUpperCase();
    }
    
    setTimeout(() => {
        updateTranslations();
        hideLoadingSplash();
    }, 500);
}

// UI Helper Functions
function showLoadingSplash() {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
        splash.classList.remove('hidden');
    }
}

function hideLoadingSplash() {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
        splash.classList.add('hidden');
    }
}

function showProcessing(buttonId, show) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const spinner = button.querySelector('.button-spinner');
    const text = button.querySelector('span');
    
    if (show) {
        button.disabled = true;
        if (spinner) spinner.style.display = 'block';
        if (text) text.style.opacity = '0.7';
    } else {
        button.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (text) text.style.opacity = '1';
    }
}

// Global functions
window.toggleLanguage = toggleLanguage;
window.handleGoogleSignIn = handleGoogleSignIn;
window.removeToast = removeToast;