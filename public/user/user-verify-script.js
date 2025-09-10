// User Email Verification Script
let currentLanguage = 'en';
let translations = {};
let verificationData = null;
let codeTimer = null;
let resendTimer = null;
let isProcessing = false;

// Supabase configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingSplash();
        await loadTranslations();
        loadLanguagePreference();
        loadVerificationData();
        initializeEventListeners();
        startTimers();
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

// Load verification data
function loadVerificationData() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    const typeFromUrl = urlParams.get('type');
    
    // Get data from localStorage
    const pendingRegistration = localStorage.getItem('pending_registration');
    const verificationTarget = localStorage.getItem('verification_target');
    const verificationType = localStorage.getItem('verification_type');
    
    if (pendingRegistration) {
        verificationData = JSON.parse(pendingRegistration);
        verificationData.type = 'registration';
    } else if (verificationTarget) {
        verificationData = {
            email: verificationTarget,
            type: verificationType || 'login'
        };
    } else if (emailFromUrl) {
        verificationData = {
            email: emailFromUrl,
            type: typeFromUrl || 'login'
        };
    }
    
    if (!verificationData || !verificationData.email) {
        // No verification data found, redirect to login
        window.location.href = '/user/login.html';
        return;
    }
    
    // Display email
    const emailDisplay = document.getElementById('emailDisplay');
    if (emailDisplay) {
        emailDisplay.textContent = verificationData.email;
    }
}

// Initialize event listeners
function initializeEventListeners() {
    const verificationForm = document.getElementById('verificationForm');
    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
    }
    
    // Auto-focus on code input
    const codeInput = document.getElementById('verificationCode');
    if (codeInput) {
        codeInput.focus();
        
        // Format input as user types (add spaces every 3 digits)
        codeInput.addEventListener('input', formatCodeInput);
    }
}

// Format code input
function formatCodeInput(event) {
    let value = event.target.value.replace(/\s/g, ''); // Remove spaces
    
    // Only allow numbers
    value = value.replace(/[^0-9]/g, '');
    
    // Limit to 6 digits
    if (value.length > 6) {
        value = value.slice(0, 6);
    }
    
    event.target.value = value;
}

// Handle verification form submission
async function handleVerification(event) {
    event.preventDefault();
    
    if (isProcessing) return;
    
    const codeInput = document.getElementById('verificationCode');
    const code = codeInput.value.replace(/\s/g, '');
    
    if (!code || code.length !== 6) {
        showAlert(t('invalid_code_format') || 'Please enter a valid 6-digit code.', 'error');
        codeInput.focus();
        return;
    }
    
    try {
        isProcessing = true;
        showProcessing('verifyBtn', true);
        
        // Verify code
        const result = await verifyCode(verificationData.email, code, verificationData.type);
        
        if (result.success) {
            // Show success animation
            showSuccessAnimation();
            
            // Store user session if this was registration
            if (verificationData.type === 'registration') {
                await createUserSession(result.userId);
            }
            
            // Clean up localStorage
            localStorage.removeItem('pending_registration');
            localStorage.removeItem('verification_target');
            localStorage.removeItem('verification_type');
            localStorage.removeItem('verification_code');
            localStorage.removeItem('verification_expiry');
            
            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
            
        } else {
            showAlert(result.message || t('verification_error'), 'error');
            codeInput.value = '';
            codeInput.focus();
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        showAlert(t('verification_error') || 'Verification failed. Please try again.', 'error');
    } finally {
        isProcessing = false;
        showProcessing('verifyBtn', false);
    }
}

// Verify code with backend
async function verifyCode(email, code, type) {
    try {
        // First check locally stored code (fallback)
        const storedCode = localStorage.getItem('verification_code');
        const expiry = localStorage.getItem('verification_expiry');
        
        if (storedCode && expiry) {
            if (Date.now() > parseInt(expiry)) {
                return { success: false, message: t('verification_expired') };
            }
            
            if (storedCode === code) {
                // Code matches, now verify with database
                return await verifyWithDatabase(email, code, type);
            }
        }
        
        // If no local code or doesn't match, check with database
        return await verifyWithDatabase(email, code, type);
        
    } catch (error) {
        console.error('Code verification error:', error);
        return { success: false, message: t('verification_error') };
    }
}

// Verify with database
async function verifyWithDatabase(email, code, type) {
    try {
        // Check if Supabase is configured
        if (!SUPABASE_URL || SUPABASE_URL === 'NOT_CONFIGURED') {
            throw new Error('Database not configured');
        }
        
        // Call Supabase function to verify code
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_code`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_email: email,
                p_code: code,
                p_code_type: type === 'registration' ? 'email_verification' : 'login'
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to verify code');
        }
        
        const result = await response.json();
        
        if (result && result.length > 0) {
            const verification = result[0];
            return {
                success: verification.is_valid,
                message: verification.message,
                userId: verification.user_id
            };
        }
        
        return { success: false, message: t('verification_invalid') };
        
    } catch (error) {
        console.error('Database verification error:', error);
        throw error;
    }
}

// Create user session after successful verification
async function createUserSession(userId) {
    try {
        const sessionToken = generateSessionToken();
        
        // Get user info
        const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (userResponse.ok) {
            const users = await userResponse.json();
            if (users.length > 0) {
                const user = users[0];
                
                // Store session
                localStorage.setItem('qotore_user_session', sessionToken);
                localStorage.setItem('qotore_user_info', JSON.stringify(user));
            }
        }
        
    } catch (error) {
        console.error('Session creation error:', error);
    }
}

// Resend verification code
async function resendCode() {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        showProcessing('resendBtn', true);
        
        // Generate new code
        const newCode = generateVerificationCode();
        
        // Send email
        await sendVerificationEmail(verificationData.email, newCode);
        
        // Update stored code
        localStorage.setItem('verification_code', newCode);
        localStorage.setItem('verification_expiry', (Date.now() + 10 * 60 * 1000).toString());
        
        showAlert(t('code_resent') || 'Verification code has been resent to your email.', 'success');
        
        // Restart timers
        startTimers();
        
        // Disable resend button for 1 minute
        startResendTimer();
        
    } catch (error) {
        console.error('Resend error:', error);
        showAlert(t('resend_error') || 'Failed to resend code. Please try again.', 'error');
    } finally {
        isProcessing = false;
        showProcessing('resendBtn', false);
    }
}

// Send verification email
async function sendVerificationEmail(email, code) {
    try {
        const response = await fetch('/api/send-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                code: code,
                type: verificationData.type,
                language: currentLanguage
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send verification email');
        }
        
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
}

// Timer management
function startTimers() {
    startCodeTimer();
    startResendTimer();
}

function startCodeTimer() {
    const expiry = localStorage.getItem('verification_expiry');
    if (!expiry) return;
    
    const expiryTime = parseInt(expiry);
    
    // Clear existing timer
    if (codeTimer) clearInterval(codeTimer);
    
    codeTimer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, expiryTime - now);
        
        if (remaining <= 0) {
            clearInterval(codeTimer);
            showCodeExpired();
            return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function startResendTimer() {
    const resendBtn = document.getElementById('resendBtn');
    const resendTimerDisplay = document.getElementById('resendTimerDisplay');
    const resendTimerDiv = document.getElementById('resendTimer');
    
    if (!resendBtn) return;
    
    resendBtn.disabled = true;
    resendTimerDiv.style.display = 'block';
    
    let remaining = 60; // 1 minute
    
    // Clear existing timer
    if (resendTimer) clearInterval(resendTimer);
    
    resendTimer = setInterval(() => {
        remaining--;
        
        if (remaining <= 0) {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
            resendTimerDiv.style.display = 'none';
            return;
        }
        
        if (resendTimerDisplay) {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            resendTimerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function showCodeExpired() {
    const codeTimer = document.getElementById('codeTimer');
    if (codeTimer) {
        codeTimer.innerHTML = '<span style="color: #dc3545;">Code expired</span>';
    }
    
    showAlert(t('verification_expired') || 'Verification code has expired. Please request a new one.', 'error');
}

// Show success animation
function showSuccessAnimation() {
    const authCard = document.querySelector('.auth-card');
    const successAnimation = document.getElementById('successAnimation');
    
    if (authCard && successAnimation) {
        authCard.style.display = 'none';
        successAnimation.style.display = 'block';
        
        // Start redirect countdown
        let countdown = 3;
        const redirectTimer = document.getElementById('redirectTimer');
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (redirectTimer) {
                redirectTimer.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
}

// Utility functions
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionToken() {
    return btoa(Date.now() + '-' + Math.random().toString(36).substr(2, 9));
}

function goBack() {
    if (verificationData && verificationData.type === 'registration') {
        window.location.href = '/user/register.html';
    } else {
        window.location.href = '/user/login.html';
    }
}

// Loading and UI functions
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
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Global functions
window.toggleLanguage = toggleLanguage;
window.resendCode = resendCode;
window.goBack = goBack;