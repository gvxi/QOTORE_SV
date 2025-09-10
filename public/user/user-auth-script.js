// User Authentication Script using Supabase Auth
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
        await loadConfiguration();
        await loadTranslations();
        loadLanguagePreference();
        checkExistingSession();
        initializeEventListeners();
        hideLoadingSplash();
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoadingSplash();
        showAlert('Error loading page. Please refresh and try again.', 'error');
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
        showAlert('Service not configured. Please contact support.', 'error');
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
            showAlert('You are already logged in. Redirecting...', 'success');
            
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
                        showAlert('Failed to sign in with Google. Please try again.', 'error');
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
        showAlert(t('google_signin_error') || 'Failed to sign in with Google. Please try again.', 'error');
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
        showAlert(t('email_phone_required') || 'Please enter your email or phone number.', 'error');
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
            showAlert(
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
        showAlert(
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
        showAlert(t('login_success') || 'Welcome back!', 'success');
        
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

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    alert.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
    `;
    
    const authContent = document.querySelector('.auth-content');
    if (authContent) {
        authContent.insertBefore(alert, authContent.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Global functions
window.toggleLanguage = toggleLanguage;
window.handleGoogleSignIn = handleGoogleSignIn;