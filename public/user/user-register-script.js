// Fixed user-register-script.js

let supabase;
let currentLanguage = 'en';
let translations = {};
let isProcessing = false;
let currentStep = 1;
let googleUserData = null;

// Remove the problematic immediate execution and replace with proper initialization
// window.addEventListener('error', function(e) {
//     console.log('🚨 DEBUG: Unhandled error:', e);
// });

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
        }, 500);
        
        setupFormHandlers();
        updateLanguageDisplay();
        prefillFromLocalStorage();
        
        // Hide loading spinner and show content
        const loadingSpinner = document.getElementById('loadingSpinner');
        const authContainer = document.getElementById('authContainer');
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (authContainer) authContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Failed to initialize. Please refresh the page.', 'error');
    }
});

// Setup form event handlers
function setupFormHandlers() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
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
            
            // Fixed: Use proper query with single() instead of maybeSingle() for better error handling
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('profile_completed')
                    .eq('id', data.session.user.id)
                    .maybeSingle(); // Use maybeSingle() to handle no rows gracefully
                
                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Profile query error:', profileError);
                    // Continue anyway, assume profile needs completion
                }
                
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
            } catch (profileErr) {
                console.error('Profile check failed:', profileErr);
                // Assume profile needs completion and continue
                prefillOAuthData(data.session.user);
                showAlert('Please complete your profile to finish registration.', 'info');
            }
        } else {
            console.log('No active session found');
        }
    } catch (error) {
        console.error('OAuth callback check failed:', error);
    }
}

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
    const pageTitle = document.querySelector('.page-title h2');
    if (pageTitle) {
        pageTitle.textContent = currentLanguage === 'ar' ? 'إكمال الملف الشخصي' : 'Complete Profile';
    }
    
    // Show success message
    showAlert('Account connected successfully! Please complete your profile below.', 'success');
    
    // Add cancel button for OAuth users
    addCancelButtonToRegistrationForm();
}

// Initialize Google Sign-In
async function initializeGoogleSignIn(clientId) {
    try {
        const googleSignInButton = document.getElementById('google-signin-button');
        if (googleSignInButton) {
            googleSignInButton.addEventListener('click', async () => {
                try {
                    showProcessing('google-signin-button', true);
                    
                    // Fixed: Redirect to register.html instead of profile-completion.html
                    const { data, error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: window.location.href, // Stay on current registration page
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

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (isProcessing) return;
    
    try {
        // Validate all fields
        if (!validateAllFields()) {
            showAlert('Please correct the errors and try again.', 'error');
            return;
        }
        
        isProcessing = true;
        showProcessing('registerBtn', true);
        
        const formData = collectFormData();
        
        // Check if user is already authenticated (OAuth flow)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session check error:', sessionError);
        }
        
        if (session?.user) {
            // User is already authenticated, just complete the profile
            await completeProfile(formData, session.user);
            
            showAlert('Profile completed successfully! Welcome to QOTORE.', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            // New user registration
            await registerNewUser(formData);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showAlert(
            error.message || 'Registration failed. Please try again.',
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
        
    } catch (error) {
        console.error('Profile completion error:', error);
        throw error;
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

// Add the remaining helper functions...
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

function generateTemporaryPassword() {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
}

function validateAllFields() {
    const formData = collectFormData();
    let isValid = true;
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        isValid = false;
    }
    
    if (!formData.agreeTerms) {
        isValid = false;
    }
    
    return isValid;
}

function validateField(e) {
    // Add field-specific validation here
    const field = e.target;
    const value = field.value.trim();
    
    // Remove existing error styling
    field.classList.remove('error');
    
    // Add validation based on field type
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
        if (spinner) spinner.style.display = 'block';
        if (text) text.style.opacity = '0.7';
    } else {
        button.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (text) text.style.opacity = '1';
    }
}

function showAlert(message, type) {
    // Implement your alert system here
    console.log(`${type.toUpperCase()}: ${message}`);
}

function goToStep(step) {
    // Implement multi-step navigation
    console.log(`Going to step ${step}`);
}

function updateLanguageDisplay() {
    // Implement language switching
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

function addCancelButtonToRegistrationForm() {
    // Add cancel button for OAuth users who want to cancel registration
    const authHeader = document.querySelector('.auth-header');
    if (authHeader && !document.getElementById('cancelRegistrationBtn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelRegistrationBtn';
        cancelBtn.className = 'cancel-registration-btn';
        cancelBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
            <span>Cancel</span>
        `;
        cancelBtn.onclick = () => {
            if (confirm('Are you sure you want to cancel registration? Your account will be deleted.')) {
                // Implement cancel logic
                supabase.auth.signOut().then(() => {
                    window.location.href = '/';
                });
            }
        };
        
        authHeader.appendChild(cancelBtn);
    }
}