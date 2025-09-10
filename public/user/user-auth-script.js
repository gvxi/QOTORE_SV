// User Authentication Script using Supabase Auth - WITH TOAST NOTIFICATIONS
let currentLanguage = 'en';
let translations = {};
let supabase = null;
let isProcessing = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingSplash();
        createToastContainer(); // Initialize toast system
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

// Toast Notification System
function createToastContainer() {
    if (document.getElementById('toastContainer')) return;
    
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: 400px;
        width: 90%;
    `;
    document.body.appendChild(container);
}

function showToast(message, type = 'info', duration = 4000) {
    createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const baseStyles = `
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border-left: 4px solid;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        backdrop-filter: blur(10px);
        max-width: 100%;
        word-wrap: break-word;
    `;
    
    let borderColor, textColor, backgroundColor, icon;
    
    switch (type) {
        case 'success':
            borderColor = '#10b981';
            textColor = '#065f46';
            backgroundColor = '#f0fdf4';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>`;
            break;
        case 'error':
            borderColor = '#ef4444';
            textColor = '#991b1b';
            backgroundColor = '#fef2f2';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"/>
            </svg>`;
            break;
        case 'warning':
            borderColor = '#f59e0b';
            textColor = '#92400e';
            backgroundColor = '#fffbeb';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
            </svg>`;
            break;
        default:
            borderColor = '#3b82f6';
            textColor = '#1e40af';
            backgroundColor = '#eff6ff';
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
            </svg>`;
    }
    
    toast.style.cssText = baseStyles + `
        border-left-color: ${borderColor};
        color: ${textColor};
        background: ${backgroundColor};
    `;
    
    toast.innerHTML = `
        <div class="toast-icon" style="color: ${borderColor}; flex-shrink: 0;">
            ${icon}
        </div>
        <div class="toast-message" style="flex: 1; line-height: 1.5;">
            ${message}
        </div>
        <button class="toast-close" style="
            background: none;
            border: none;
            color: ${textColor};
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            opacity: 0.6;
            transition: opacity 0.2s;
            flex-shrink: 0;
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
        </button>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    const autoRemove = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeToast(toast);
    });
    
    toast.addEventListener('click', (e) => {
        if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
            clearTimeout(autoRemove);
            removeToast(toast);
        }
    });
    
    return toast;
}

function removeToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px) scale(0.95)';
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Replace showAlert with showToast
function showAlert(message, type = 'info') {
    showToast(message, type);
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
                        
                        const { data, error } = await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: window.location.origin + '/user/register.html'
                            }
                        });

                        if (error) {
                            throw error;
                        }
                        
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

async function handleGoogleSignIn(response) {
    try {
        showProcessing('google-signin-button', true);
        
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

function hideGoogleSignIn() {
    const googleSection = document.querySelector('.google-signin-section');
    const authDivider = document.querySelector('.auth-divider');
    
    if (googleSection) googleSection.style.display = 'none';
    if (authDivider) authDivider.style.display = 'none';
}

function initializeEventListeners() {
    const emailForm = document.getElementById('emailLoginForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailLogin);
    }
}

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
            const { data, error } = await supabase.auth.signInWithOtp({
                email: emailOrPhone,
                options: {
                    emailRedirectTo: 'https://qotore.uk'
                }
            });
            
            if (error) {
                if (error.message.includes('User not found')) {
                    localStorage.setItem('registration_prefill', emailOrPhone);
                    window.location.href = '/user/register.html';
                    return;
                }
                throw error;
            }
            
            showToast(
                t('magic_link_sent') || `A magic link has been sent to ${emailOrPhone}. Check your email to sign in.`,
                'success',
                6000
            );
            
            const submitBtn = document.getElementById('emailSubmitBtn');
            if (submitBtn) {
                const span = submitBtn.querySelector('span');
                if (span) {
                    span.textContent = t('email_sent') || 'Email Sent!';
                }
                submitBtn.disabled = true;
            }
            
        } else {
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

function handleSuccessfulAuth(authData) {
    if (authData.user) {
        showToast(t('login_success') || 'Welcome back!', 'success');
        
        logUserActivity('user_login');
        
        setTimeout(async () => {
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('profile_completed')
                .eq('id', authData.user.id)
                .maybeSingle();
            
            if (profileError && profileError.code !== 'PGRST116') {
                console.warn('Profile check error:', profileError);
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