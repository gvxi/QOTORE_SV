// Updated user-register-script.js - WITH TOAST NOTIFICATIONS

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
        createToastContainer(); // Initialize toast system
        await loadTranslations();
        await loadConfiguration();
        
        // Wait a bit for Supabase to be ready, then check for OAuth
        setTimeout(async () => {
            if (supabase) {
                await checkForOAuthCallback();
            }
            
            hideLoadingScreen();
        }, 1000);
        
        setupFormHandlers();
        updateLanguageDisplay();
        prefillFromLocalStorage();
        
    } catch (error) {
        console.error('Initialization error:', error);
        hideLoadingScreen();
    }
});

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

// Replace alert/confirm with toast
function showAlert(message, type = 'info') {
    showToast(message, type);
}

function hideLoadingScreen() {
    console.log('Hiding loading screen...');
    
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

function setupFormHandlers() {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('Form handlers set up');
    } else {
        console.log('Registration form not found');
    }
    
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
    });
}

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
                    prefillOAuthData(data.session.user);
                    
                    if (isOAuthUser) {
                        addCancelButtonToRegistrationForm();
                    }
                } else {
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

function addCancelButtonToRegistrationForm() {
    console.log('Adding cancel button for OAuth user...');
    
    const existingBtn = document.getElementById('cancelRegistrationBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    const logoSection = document.querySelector('.logo-section');
    
    if (logoSection) {
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
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            cancelBtn.style.transform = 'translateY(-1px)';
        });
        
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            cancelBtn.style.transform = 'translateY(0)';
        });
        
        cancelBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Cancel button clicked');
            cancelRegistration();
        };
        
        logoSection.style.position = 'relative';
        logoSection.appendChild(cancelBtn);
        
        console.log('Cancel button added successfully to logo section');
        
        addCancelLinkToForm();
    } else {
        console.error('Could not find logo-section to add cancel button');
        
        const formContent = document.querySelector('.form-content');
        if (formContent) {
            addCancelLinkToForm();
        }
    }
}

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

async function cancelRegistration() {
    console.log('cancelRegistration called');
    
    // Use toast for confirmation instead of confirm dialog
    showToast('Are you sure you want to cancel registration and delete your account?', 'warning', 5000);
    
    // Create a custom confirmation toast
    const confirmToast = document.createElement('div');
    confirmToast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border-left: 4px solid #ef4444;
        z-index: 10001;
        max-width: 400px;
        width: 90%;
    `;
    
    confirmToast.innerHTML = `
        <div style="margin-bottom: 15px; color: #991b1b; font-weight: 600;">
            Confirm Account Deletion
        </div>
        <div style="margin-bottom: 20px; color: #666; line-height: 1.5;">
            This will permanently delete your account. You cannot undo this action.
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelDelete" style="
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                color: #6c757d;
            ">Keep Account</button>
            <button id="confirmDelete" style="
                background: #dc3545;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                color: white;
            ">Delete Account</button>
        </div>
    `;
    
    document.body.appendChild(confirmToast);
    
    document.getElementById('cancelDelete').onclick = () => {
        confirmToast.remove();
    };
    
    document.getElementById('confirmDelete').onclick = async () => {
        confirmToast.remove();
        await performAccountDeletion();
    };
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (confirmToast.parentNode) {
            confirmToast.remove();
        }
    }, 10000);
}

async function performAccountDeletion() {
    try {
        const cancelBtn = document.getElementById('cancelRegistrationBtn');
        if (cancelBtn) {
            cancelBtn.innerHTML = `
                <div style="display: inline-block; width: 14px; height: 14px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                Canceling...
            `;
            cancelBtn.disabled = true;
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('No user found to delete');
        }
        
        console.log('Deleting user profile and signing out...');
        
        const { error: profileError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('id', user.id);
        
        if (profileError) {
            console.warn('Profile deletion error:', profileError);
        }
        
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError) {
            console.warn('Sign out error:', signOutError);
        }
        
        console.log('Account deletion completed');
        showToast('Account successfully deleted', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('Account deletion error:', error);
        showToast('Failed to delete account. Please try again.', 'error');
        
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

function prefillOAuthData(user) {
    console.log('Pre-filling OAuth data for user:', user.email);
    
    hideGoogleSignIn();
    
    const metadata = user.user_metadata || {};
    
    console.log('OAuth user metadata:', metadata);
    
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
    
    const emailEl = document.getElementById('email');
    if (emailEl) {
        emailEl.value = user.email || '';
        emailEl.readOnly = true;
        emailEl.style.backgroundColor = '#f8f9fa';
        emailEl.style.cursor = 'not-allowed';
        emailEl.style.opacity = '0.7';
    }
    
    googleUserData = {
        picture: metadata.avatar_url || metadata.picture
    };
    
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = currentLanguage === 'ar' ? 'إكمال الملف الشخصي' : 'Complete Profile';
    }
    
    showToast('Account connected successfully! Please complete your profile below.', 'success');
}

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

async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (isProcessing) return;
    
    try {
        if (!validateAllFields()) {
            showToast('Please fill in all required fields and agree to the terms.', 'error');
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
    document.querySelectorAll('.form-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
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