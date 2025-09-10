// Fixed user-register-script.js - Loading Screen and Cancel Button Issues

let supabase;
let currentLanguage = 'en';
let translations = {};
let isProcessing = false;
let currentStep = 1;
let googleUserData = null;

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
            
            // FIXED: Always hide loading screen after initialization
            hideLoadingScreen();
        }, 1000); // Increased timeout to ensure everything loads
        
        setupFormHandlers();
        updateLanguageDisplay();
        prefillFromLocalStorage();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Failed to initialize. Please refresh the page.', 'error');
        // FIXED: Hide loading even on error
        hideLoadingScreen();
    }
});

// FIXED: Dedicated function to hide loading screen
function hideLoadingScreen() {
    console.log('Hiding loading screen...');
    
    const loadingSpinner = document.getElementById('loadingSpinner');
    const authContainer = document.getElementById('authContainer');
    
    if (loadingSpinner) {
        loadingSpinner.style.opacity = '0';
        setTimeout(() => {
            loadingSpinner.style.display = 'none';
        }, 300);
    }
    
    if (authContainer) {
        authContainer.style.display = 'block';
        // Fade in effect
        setTimeout(() => {
            authContainer.style.opacity = '1';
        }, 100);
    }
    
    console.log('Loading screen hidden');
}

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
            
            // Check if this is an OAuth user (came from Google)
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
                    showAlert('Please complete your profile to finish registration.', 'info');
                    
                    // FIXED: Add cancel button specifically for OAuth users
                    if (isOAuthUser) {
                        addCancelButtonToRegistrationForm();
                    }
                } else {
                    // Profile already complete, redirect to main page
                    showAlert('Welcome back!', 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }
            } catch (profileErr) {
                console.error('Profile check failed:', profileErr);
                prefillOAuthData(data.session.user);
                showAlert('Please complete your profile to finish registration.', 'info');
                
                // Add cancel button for OAuth users even on profile check error
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
}

// FIXED: Improved cancel button creation with better styling and positioning
function addCancelButtonToRegistrationForm() {
    console.log('Adding cancel button for OAuth user...');
    
    // Remove existing cancel button if any
    const existingBtn = document.getElementById('cancelRegistrationBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Find the best place to add the button
    const authHeader = document.querySelector('.auth-header');
    const backBtn = document.querySelector('.back-btn');
    
    if (authHeader) {
        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelRegistrationBtn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'cancel-registration-btn';
        cancelBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
            <span>Cancel Registration</span>
        `;
        
        // Add click handler
        cancelBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Cancel button clicked');
            cancelRegistration();
        };
        
        // Position the button
        authHeader.style.position = 'relative';
        authHeader.appendChild(cancelBtn);
        
        console.log('Cancel button added successfully');
        
        // Also add it as a link in the form if user scrolls down
        addCancelLinkToForm();
    } else {
        console.error('Could not find auth-header to add cancel button');
    }
}

// FIXED: Add cancel link at the bottom of the form for better visibility
function addCancelLinkToForm() {
    const formActions = document.querySelector('.form-actions');
    const step3 = document.getElementById('step3');
    
    if (step3 && !document.getElementById('cancelRegistrationLink')) {
        const cancelLink = document.createElement('div');
        cancelLink.id = 'cancelRegistrationLink';
        cancelLink.className = 'cancel-link';
        cancelLink.innerHTML = `
            <p style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                <span style="color: #666;">Don't want to complete registration?</span>
                <button type="button" onclick="cancelRegistration()" style="background: none; border: none; color: #dc3545; text-decoration: underline; cursor: pointer; font-size: inherit;">
                    Cancel and delete account
                </button>
            </p>
        `;
        
        step3.appendChild(cancelLink);
    }
}

// FIXED: Enhanced cancel registration function with proper modal
async function cancelRegistration() {
    console.log('cancelRegistration called');
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'cancelModal';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <div class="modal-icon danger">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
                    </svg>
                </div>
                <h3 class="modal-title">Cancel Registration</h3>
                <p class="modal-subtitle">This will permanently delete your account</p>
            </div>
            <div class="modal-content">
                <p class="modal-message">
                    Are you sure you want to cancel your registration? This action cannot be undone.
                </p>
                <div class="modal-warning danger">
                    <strong>Warning:</strong>
                    Your account will be permanently deleted from our system. You will need to start the registration process again if you change your mind.
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="hideCancelModal()">
                    Keep Account
                </button>
                <button class="modal-btn modal-btn-danger" onclick="confirmCancelRegistration()" id="confirmCancelBtn">
                    Delete Account
                </button>
            </div>
        </div>
    `;
    
    // Add modal styles if not already present
    if (!document.getElementById('modalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'modalStyles';
        styles.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .modal-overlay.show {
                opacity: 1;
            }
            .modal-container {
                background: white;
                border-radius: 16px;
                max-width: 450px;
                width: 90%;
                padding: 0;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            .modal-overlay.show .modal-container {
                transform: scale(1);
            }
            .modal-header {
                padding: 2rem 2rem 1rem 2rem;
                text-align: center;
                border-bottom: 1px solid #f0f0f0;
            }
            .modal-icon {
                width: 60px;
                height: 60px;
                background: #f8d7da;
                color: #721c24;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem auto;
                font-size: 24px;
            }
            .modal-title {
                font-size: 1.5rem;
                font-weight: 600;
                color: #333;
                margin: 0 0 0.5rem 0;
            }
            .modal-subtitle {
                color: #666;
                font-size: 0.95rem;
                margin: 0;
            }
            .modal-content {
                padding: 1.5rem 2rem;
            }
            .modal-message {
                color: #555;
                line-height: 1.6;
                margin-bottom: 1.5rem;
                text-align: center;
            }
            .modal-warning {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1.5rem;
                color: #721c24;
                font-size: 0.9rem;
                line-height: 1.5;
            }
            .modal-actions {
                display: flex;
                gap: 0.75rem;
                justify-content: center;
                padding: 0 2rem 2rem 2rem;
            }
            .modal-btn {
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 120px;
            }
            .modal-btn-secondary {
                background: #f8f9fa;
                color: #6c757d;
                border: 1px solid #dee2e6;
            }
            .modal-btn-secondary:hover {
                background: #e9ecef;
            }
            .modal-btn-danger {
                background: #dc3545;
                color: white;
            }
            .modal-btn-danger:hover {
                background: #c82333;
            }
            .modal-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .cancel-registration-btn {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 0.5rem 0.75rem;
                color: #6c757d;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 500;
                z-index: 100;
            }
            .cancel-registration-btn:hover {
                background: #e9ecef;
                color: #495057;
                border-color: #adb5bd;
            }
            @media (max-width: 768px) {
                .cancel-registration-btn span {
                    display: none;
                }
                .modal-actions {
                    flex-direction: column;
                }
                .modal-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add modal to page
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideCancelModal();
        }
    });
}

// Hide cancel modal
function hideCancelModal() {
    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Confirm account cancellation
async function confirmCancelRegistration() {
    const confirmBtn = document.getElementById('confirmCancelBtn');
    
    try {
        // Show loading
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `
            <div style="display: inline-block; width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            Deleting...
        `;
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('No user found to delete');
        }
        
        // Delete user profile from database (if exists)
        const { error: profileError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('id', user.id);
        
        if (profileError) {
            console.warn('Profile deletion error:', profileError);
        }
        
        // Sign out
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError) {
            console.warn('Sign out error:', signOutError);
        }
        
        // Show success message
        showAlert('Account successfully deleted', 'success');
        
        // Hide modal
        hideCancelModal();
        
        // Redirect to main page
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        
    } catch (error) {
        console.error('Account deletion error:', error);
        showAlert('Failed to delete account. Please try again.', 'error');
        
        // Reset button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Delete Account';
    }
}

// Rest of the functions remain the same...
// [Include all the other functions from the previous script]

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
        if (!validateAllFields()) {
            showAlert('Please correct the errors and try again.', 'error');
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
            
            showAlert('Profile completed successfully! Welcome to QOTORE.', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
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
        showAlert('Service not configured. Please contact support.', 'error');
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
        if (spinner) spinner.style.display = 'block';
        if (text) text.style.opacity = '0.7';
    } else {
        button.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (text) text.style.opacity = '1';
    }
}

function showAlert(message, type) {
    console.log(`${type.toUpperCase()}: ${message}`);
    // You can implement a proper alert system here
}

function goToStep(step) {
    currentStep = step;
    console.log(`Going to step ${step}`);
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
            showAlert('An account with this email already exists. Please sign in instead.', 'error');
            setTimeout(() => {
                window.location.href = '/user/login.html';
            }, 2000);
            return;
        }
        throw error;
    }
    
    if (data.user) {
        await completeProfile(formData, data.user);
        
        showAlert('Account created successfully! Please check your email to verify your account.', 'success');
        
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