// User Registration Script using Supabase Auth
let currentLanguage = 'en';
let translations = {};
let currentStep = 1;
let isProcessing = false;
let supabase = null;
let googleUserData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DEBUG: DOM Content Loaded');
    console.log('🔍 DEBUG: Current timestamp:', new Date().toISOString());
    console.log('🔍 DEBUG: User agent:', navigator.userAgent);
    console.log('🔍 DEBUG: Page location:', window.location.href);
    initializeApp();
});

// Add window error handler to catch any unhandled errors
window.addEventListener('error', function(event) {
    console.error('🚨 DEBUG: Unhandled error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 DEBUG: Unhandled promise rejection:', event.reason);
});

async function initializeApp() {
    try {
        showLoadingSplash();
        await loadConfiguration();
        await loadTranslations();
        loadLanguagePreference();
        checkForGoogleSignup();
        checkForOAuthCallback();
        prefillFromLocalStorage();
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

// Check for OAuth callback
async function checkForOAuthCallback() {
    if (!supabase) return;
    
    try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            return;
        }
        
        if (data.session) {
            // User just signed up with OAuth, check if profile needs completion
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('profile_completed')
                .eq('id', data.session.user.id)
                .single();
            
            if (!profile || !profile.profile_completed) {
                // Pre-fill form with OAuth data
                prefillOAuthData(data.session.user);
                showAlert('Please complete your profile to finish registration.', 'info');
            } else {
                // Profile already complete, redirect to main page
                showAlert('Welcome back!', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }
    } catch (error) {
        console.error('OAuth callback check failed:', error);
    }
}

// Pre-fill form with OAuth data
function prefillOAuthData(user) {
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
        emailEl.readOnly = true; // Make email readonly for OAuth users
        
        // Add visual indicator that field is readonly
        emailEl.style.backgroundColor = '#f8f9fa';
        emailEl.style.cursor = 'not-allowed';
        emailEl.style.opacity = '0.7';
    }
    
    // Store OAuth data for later use
    googleUserData = {
        picture: metadata.avatar_url || metadata.picture
    };
    
    // Update page title to indicate profile completion
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = currentLanguage === 'ar' ? 'إكمال الملف الشخصي' : 'Complete Profile';
    }
    
    // Show success message
    showAlert('Account connected successfully! Please complete your profile below.', 'success');
}

// Initialize Google Sign-In
async function initializeGoogleSignIn(clientId) {
    try {
        const googleSignInButton = document.getElementById('google-signin-button');
        if (googleSignInButton) {
            googleSignInButton.addEventListener('click', async () => {
                try {
                    showProcessing('google-signin-button', true);
                    
                    // Use Supabase OAuth for Google signup
                    const { data, error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: window.location.href, // Come back to registration page
                            queryParams: {
                                access_type: 'offline',
                                prompt: 'consent'
                            }
                        }
                    });

                    if (error) {
                        throw error;
                    }
                    
                    // OAuth redirect will handle the rest
                } catch (error) {
                    console.error('Google OAuth error:', error);
                    showAlert('Failed to sign up with Google. Please try again.', 'error');
                    showProcessing('google-signin-button', false);
                }
            });
        }
    } catch (error) {
        console.error('Google Sign-In initialization error:', error);
        hideGoogleSignIn();
    }
}

// Hide Google Sign-In if not configured
function hideGoogleSignIn() {
    const googleSection = document.getElementById('googleSection');
    const authDivider = document.getElementById('authDivider');
    
    if (googleSection) googleSection.style.display = 'none';
    if (authDivider) authDivider.style.display = 'none';
}

// Check for Google signup redirect
function checkForGoogleSignup() {
    const urlParams = new URLSearchParams(window.location.search);
    const isGoogleSignup = urlParams.get('google');
    
    if (isGoogleSignup) {
        // This is handled by checkForOAuthCallback instead
        const tempGoogleData = localStorage.getItem('google_user_temp');
        if (tempGoogleData) {
            localStorage.removeItem('google_user_temp');
        }
    }
}

// Prefill from localStorage (for users coming from login page)
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

// Multi-step form navigation
function goToStep(stepNumber) {
    if (stepNumber < currentStep) {
        // Going back is always allowed
        showStep(stepNumber);
        return;
    }
    
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
        return;
    }
    
    showStep(stepNumber);
}

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        currentStep = stepNumber;
    }
}

function validateStep(stepNumber) {
    let isValid = true;
    let firstInvalidField = null;
    
    if (stepNumber === 1) {
        const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
        
        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                showFieldError(field, t('field_required') || 'This field is required');
                isValid = false;
                if (!firstInvalidField) firstInvalidField = field;
            } else {
                clearFieldError(field);
            }
        }
        
        // Validate email format
        const email = document.getElementById('email');
        if (email.value && !isValidEmail(email.value)) {
            showFieldError(email, t('invalid_email') || 'Please enter a valid email address');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = email;
        }
        
        // Validate phone format
        const phone = document.getElementById('phone');
        if (phone.value && !isValidPhone(phone.value)) {
            showFieldError(phone, t('invalid_phone') || 'Please enter a valid phone number');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = phone;
        }
        
    } else if (stepNumber === 2) {
        const requiredFields = ['gender', 'age', 'wilayat', 'city'];
        
        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                showFieldError(field, t('field_required') || 'This field is required');
                isValid = false;
                if (!firstInvalidField) firstInvalidField = field;
            } else {
                clearFieldError(field);
            }
        }
        
        // Validate age
        const age = document.getElementById('age');
        if (age.value && (age.value < 13 || age.value > 120)) {
            showFieldError(age, t('invalid_age') || 'Please enter a valid age (13-120)');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = age;
        }
        
    } else if (stepNumber === 3) {
        const agreeTerms = document.getElementById('agreeTerms');
        if (!agreeTerms.checked) {
            showAlert(t('must_agree_terms') || 'You must agree to the terms and conditions to continue.', 'error');
            isValid = false;
        }
    }
    
    if (!isValid && firstInvalidField) {
        firstInvalidField.focus();
    }
    
    return isValid;
}

// Form validation helpers
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Basic validation for Oman phone numbers
    const phoneRegex = /^(\+968|968)?[2-9]\d{7}$/;
    const cleanPhone = phone.replace(/\s|-/g, '');
    return phoneRegex.test(cleanPhone);
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Event Listeners
function initializeEventListeners() {
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }
    
    // Real-time validation
    const fields = ['firstName', 'lastName', 'email', 'phone', 'age'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => clearFieldError(field));
            field.addEventListener('input', () => clearFieldError(field));
        }
    });
}

// Handle Registration
async function handleRegistration(event) {
    event.preventDefault();
    
    if (!validateStep(3) || !supabase) {
        return;
    }
    
    try {
        isProcessing = true;
        showProcessing('registerBtn', true);
        
        // Collect form data
        const formData = collectFormData();
        
        // Check if user came from OAuth or needs to sign up
        const { data: currentSession } = await supabase.auth.getSession();
        
        if (currentSession.session) {
            // User came from OAuth, just complete their profile
            await completeProfile(formData, currentSession.session.user);
        } else {
            // New email/password signup
            await registerNewUser(formData);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showAlert(
            error.message || t('registration_error') || 'Failed to create account. Please try again.',
            'error'
        );
    } finally {
        isProcessing = false;
        showProcessing('registerBtn', false);
    }
}

// Register new user with email/password
async function registerNewUser(formData) {
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: generateTemporaryPassword(), // We'll use magic links primarily
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
            showAlert('An account with this email already exists. Please sign in instead.', 'error');
            setTimeout(() => {
                window.location.href = '/user/login.html';
            }, 2000);
            return;
        }
        throw error;
    }
    
    if (data.user) {
        // Complete profile
        await completeProfile(formData, data.user);
        
        // Show email confirmation message
        showAlert(
            'Account created successfully! Please check your email to verify your account.',
            'success'
        );
        
        setTimeout(() => {
            window.location.href = '/user/verify-email.html';
        }, 3000);
    }
}

// Complete user profile
async function completeProfile(formData, user) {
    try {
        // Use the RPC function to complete profile
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
        
        // Update Google picture if available
        if (googleUserData && googleUserData.picture) {
            await supabase
                .from('user_profiles')
                .update({ google_picture: googleUserData.picture })
                .eq('id', user.id);
        }
        
        console.log('Profile completed successfully');
        
        // If user is already logged in (OAuth flow), redirect to main page
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
            showAlert('Profile completed successfully! Welcome to QOTORE.', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
        
    } catch (error) {
        console.error('Profile completion error:', error);
        throw error;
    }
}

// Collect form data
function collectFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        phone: document.getElementById('phone').value.trim(),
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value),
        wilayat: document.getElementById('wilayat').value,
        city: document.getElementById('city').value.trim(),
        agreeTerms: document.getElementById('agreeTerms').checked,
        agreeMarketing: document.getElementById('agreeMarketing').checked
    };
}

// Generate temporary password for email signup
function generateTemporaryPassword() {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
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

    // Update option elements
    document.querySelectorAll('option[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const translation = t(key);
        if (translation !== key) {
            element.textContent = translation;
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
window.goToStep = goToStep;