// User Authentication Script with Google OAuth, Email Verification, and Supabase Integration
let currentLanguage = 'en';
let translations = {};
let isProcessing = false;

// Configuration will be loaded
let SUPABASE_URL = null;
let SUPABASE_ANON_KEY = null;
let GOOGLE_CLIENT_ID = null;

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
        await initializeGoogleSignIn();
        initializeEventListeners();
        hideLoadingSplash();
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoadingSplash();
        showAlert('Error loading page. Please refresh and try again.', 'error');
    }
}

// Load configuration from Cloudflare environment
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
            SUPABASE_URL = config.SUPABASE_URL;
            SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
            GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
        } else {
            console.error('Failed to load configuration');
            throw new Error('Configuration not available');
        }
    } catch (error) {
        console.error('Configuration load error:', error);
        // Fallback to placeholder values that will cause graceful errors
        SUPABASE_URL = 'NOT_CONFIGURED';
        SUPABASE_ANON_KEY = 'NOT_CONFIGURED';
        GOOGLE_CLIENT_ID = 'NOT_CONFIGURED';
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

// Loading Splash
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

// Google Sign-In Integration
async function initializeGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'NOT_CONFIGURED') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // Render the sign-in button
        const googleSignInButton = document.getElementById('google-signin-button');
        if (googleSignInButton) {
            googleSignInButton.addEventListener('click', () => {
                google.accounts.id.prompt();
            });
        }
    } else {
        console.warn('Google Sign-In not available or not configured');
        // Hide Google sign-in section if not configured
        const googleSection = document.getElementById('google-signin-button');
        if (googleSection) {
            googleSection.style.display = 'none';
        }
    }
}

// Handle Google Sign-In Response
async function handleGoogleSignIn(response) {
    try {
        showProcessing('google-signin-button', true);
        
        // Check if Supabase is configured
        if (!SUPABASE_URL || SUPABASE_URL === 'NOT_CONFIGURED') {
            showAlert('Authentication service not configured. Please contact support.', 'error');
            return;
        }
        
        // Decode the JWT token from Google
        const userInfo = JSON.parse(atob(response.credential.split('.')[1]));
        
        console.log('Google user info:', userInfo);
        
        // Check if user exists in our database
        const existingUser = await checkUserExists(userInfo.email);
        
        if (existingUser) {
            // User exists, log them in
            await loginExistingUser(existingUser, userInfo);
        } else {
            // New user, redirect to registration with Google data
            localStorage.setItem('google_user_temp', JSON.stringify(userInfo));
            window.location.href = '/user/register.html?google=true';
        }
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        showAlert(t('google_signin_error') || 'Failed to sign in with Google. Please try again.', 'error');
    } finally {
        showProcessing('google-signin-button', false);
    }
}

// Check if user exists
async function checkUserExists(email) {
    try {
        if (!SUPABASE_URL || SUPABASE_URL === 'NOT_CONFIGURED') {
            throw new Error('Database not configured');
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${email}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const users = await response.json();
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Error checking user:', error);
        return null;
    }
}

// Login existing user
async function loginExistingUser(user, googleInfo) {
    try {
        // Generate session token
        const sessionToken = generateSessionToken();
        
        // Update user's last login
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                last_login: new Date().toISOString(),
                google_picture: googleInfo.picture
            })
        });
        
        // Store session
        localStorage.setItem('qotore_user_session', sessionToken);
        localStorage.setItem('qotore_user_info', JSON.stringify({
            ...user,
            picture: googleInfo.picture
        }));
        
        showAlert(t('login_success') || 'Welcome back!', 'success');
        
        // Redirect to main page after 2 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert(t('login_error') || 'Failed to log in. Please try again.', 'error');
    }
}

// Email/Phone Login Form
function initializeEventListeners() {
    const emailForm = document.getElementById('emailLoginForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailLogin);
    }
}

async function handleEmailLogin(event) {
    event.preventDefault();
    
    const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
    
    if (!emailOrPhone) {
        showAlert(t('email_phone_required') || 'Please enter your email or phone number.', 'error');
        return;
    }
    
    try {
        showProcessing('emailSubmitBtn', true);
        
        // Check if Supabase is configured
        if (!SUPABASE_URL || SUPABASE_URL === 'NOT_CONFIGURED') {
            showAlert('Authentication service not configured. Please contact support.', 'error');
            return;
        }
        
        // Check if user exists
        const isEmail = emailOrPhone.includes('@');
        const field = isEmail ? 'email' : 'phone';
        
        const user = await checkUserByEmailOrPhone(emailOrPhone, field);
        
        if (user) {
            // Send verification code
            await sendVerificationCode(emailOrPhone, isEmail);
            
            // Redirect to verification page
            localStorage.setItem('verification_target', emailOrPhone);
            localStorage.setItem('verification_type', isEmail ? 'email' : 'phone');
            window.location.href = '/user/verify.html';
        } else {
            // User doesn't exist, redirect to registration
            localStorage.setItem('registration_prefill', emailOrPhone);
            window.location.href = '/user/register.html';
        }
        
    } catch (error) {
        console.error('Email login error:', error);
        showAlert(t('login_error') || 'An error occurred. Please try again.', 'error');
    } finally {
        showProcessing('emailSubmitBtn', false);
    }
}

// Check user by email or phone
async function checkUserByEmailOrPhone(value, field) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?${field}=eq.${value}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const users = await response.json();
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Error checking user:', error);
        return null;
    }
}

// Send verification code
async function sendVerificationCode(target, isEmail) {
    try {
        const code = generateVerificationCode();
        
        // Store verification code temporarily (in production, store in database)
        localStorage.setItem('verification_code', code);
        localStorage.setItem('verification_expiry', (Date.now() + 10 * 60 * 1000).toString()); // 10 minutes
        
        if (isEmail) {
            await sendEmailVerification(target, code);
        } else {
            // For phone verification, you'd integrate with SMS service
            console.log('SMS verification code:', code); // Development only
        }
        
    } catch (error) {
        console.error('Error sending verification code:', error);
        throw error;
    }
}

// Send email verification using Resend/Cloudflare
async function sendEmailVerification(email, code) {
    try {
        const response = await fetch('/api/send-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                code: code,
                language: currentLanguage
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send verification email');
        }
        
    } catch (error) {
        console.error('Email verification error:', error);
        throw error;
    }
}

// Utility Functions
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

function generateSessionToken() {
    return btoa(Date.now() + '-' + Math.random().toString(36).substr(2, 9));
}

function showProcessing(buttonId, show) {
    const button = document.getElementById(buttonId);
    const spinner = button.querySelector('.button-spinner');
    const text = button.querySelector('span');
    
    if (show) {
        button.disabled = true;
        spinner.style.display = 'block';
        text.style.opacity = '0.7';
    } else {
        button.disabled = false;
        spinner.style.display = 'none';
        text.style.opacity = '1';
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

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingSplash();
        await loadTranslations();
        loadLanguagePreference();
        await initializeGoogleSignIn();
        initializeEventListeners();
        hideLoadingSplash();
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoadingSplash();
        showAlert('Error loading page. Please refresh and try again.', 'error');
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

// Loading Splash
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

// Google Sign-In Integration
async function initializeGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // Render the sign-in button
        const googleSignInButton = document.getElementById('google-signin-button');
        if (googleSignInButton) {
            googleSignInButton.addEventListener('click', () => {
                google.accounts.id.prompt();
            });
        }
    }
}

// Handle Google Sign-In Response
async function handleGoogleSignIn(response) {
    try {
        showProcessing('google-signin-button', true);
        
        // Decode the JWT token from Google
        const userInfo = JSON.parse(atob(response.credential.split('.')[1]));
        
        console.log('Google user info:', userInfo);
        
        // Check if user exists in our database
        const existingUser = await checkUserExists(userInfo.email);
        
        if (existingUser) {
            // User exists, log them in
            await loginExistingUser(existingUser, userInfo);
        } else {
            // New user, redirect to registration with Google data
            localStorage.setItem('google_user_temp', JSON.stringify(userInfo));
            window.location.href = '/user/register.html?google=true';
        }
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        showAlert(t('google_signin_error') || 'Failed to sign in with Google. Please try again.', 'error');
    } finally {
        showProcessing('google-signin-button', false);
    }
}

// Check if user exists
async function checkUserExists(email) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${email}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const users = await response.json();
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Error checking user:', error);
        return null;
    }
}

// Login existing user
async function loginExistingUser(user, googleInfo) {
    try {
        // Generate session token
        const sessionToken = generateSessionToken();
        
        // Update user's last login
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                last_login: new Date().toISOString(),
                google_picture: googleInfo.picture
            })
        });
        
        // Store session
        localStorage.setItem('qotore_user_session', sessionToken);
        localStorage.setItem('qotore_user_info', JSON.stringify({
            ...user,
            picture: googleInfo.picture
        }));
        
        showAlert(t('login_success') || 'Welcome back!', 'success');
        
        // Redirect to main page after 2 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert(t('login_error') || 'Failed to log in. Please try again.', 'error');
    }
}

// Email/Phone Login Form
function initializeEventListeners() {
    const emailForm = document.getElementById('emailLoginForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailLogin);
    }
}

async function handleEmailLogin(event) {
    event.preventDefault();
    
    const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
    
    if (!emailOrPhone) {
        showAlert(t('email_phone_required') || 'Please enter your email or phone number.', 'error');
        return;
    }
    
    try {
        showProcessing('emailSubmitBtn', true);
        
        // Check if user exists
        const isEmail = emailOrPhone.includes('@');
        const field = isEmail ? 'email' : 'phone';
        
        const user = await checkUserByEmailOrPhone(emailOrPhone, field);
        
        if (user) {
            // Send verification code
            await sendVerificationCode(emailOrPhone, isEmail);
            
            // Redirect to verification page
            localStorage.setItem('verification_target', emailOrPhone);
            localStorage.setItem('verification_type', isEmail ? 'email' : 'phone');
            window.location.href = '/user/verify.html';
        } else {
            // User doesn't exist, redirect to registration
            localStorage.setItem('registration_prefill', emailOrPhone);
            window.location.href = '/user/register.html';
        }
        
    } catch (error) {
        console.error('Email login error:', error);
        showAlert(t('login_error') || 'An error occurred. Please try again.', 'error');
    } finally {
        showProcessing('emailSubmitBtn', false);
    }
}

// Check user by email or phone
async function checkUserByEmailOrPhone(value, field) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?${field}=eq.${value}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const users = await response.json();
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Error checking user:', error);
        return null;
    }
}

// Send verification code
async function sendVerificationCode(target, isEmail) {
    try {
        const code = generateVerificationCode();
        
        // Store verification code temporarily (in production, store in database)
        localStorage.setItem('verification_code', code);
        localStorage.setItem('verification_expiry', (Date.now() + 10 * 60 * 1000).toString()); // 10 minutes
        
        if (isEmail) {
            await sendEmailVerification(target, code);
        } else {
            // For phone verification, you'd integrate with SMS service
            console.log('SMS verification code:', code); // Development only
        }
        
    } catch (error) {
        console.error('Error sending verification code:', error);
        throw error;
    }
}

// Send email verification using Resend/Cloudflare
async function sendEmailVerification(email, code) {
    try {
        const response = await fetch('/api/send-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                code: code,
                language: currentLanguage
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send verification email');
        }
        
    } catch (error) {
        console.error('Email verification error:', error);
        throw error;
    }
}

// Utility Functions
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

function generateSessionToken() {
    return btoa(Date.now() + '-' + Math.random().toString(36).substr(2, 9));
}

function showProcessing(buttonId, show) {
    const button = document.getElementById(buttonId);
    const spinner = button.querySelector('.button-spinner');
    const text = button.querySelector('span');
    
    if (show) {
        button.disabled = true;
        spinner.style.display = 'block';
        text.style.opacity = '0.7';
    } else {
        button.disabled = false;
        spinner.style.display = 'none';
        text.style.opacity = '1';
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