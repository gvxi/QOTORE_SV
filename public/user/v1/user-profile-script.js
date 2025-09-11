// Profile Page Script
let supabase = null;
let currentLanguage = 'en';
let translations = {};
let currentUser = null;
let isProcessing = false;

// Initialize everything
document.addEventListener('DOMContentLoaded', initializePage);

async function initializePage() {
    try {
        await loadConfiguration();
        await loadTranslations();
        loadLanguagePreference();
        await checkAuthentication();
        await loadUserProfile();
        setupEventListeners();
        hideLoadingSplash();
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showToast('Failed to load profile', 'error');
        hideLoadingSplash();
    }
}

// Load configuration and initialize Supabase
async function loadConfiguration() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            if (typeof window.supabase !== 'undefined') {
                const { createClient } = window.supabase;
                supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
                console.log('Supabase client initialized');
            }
        }
    } catch (error) {
        console.error('Configuration load error:', error);
    }
}

// Load translations
async function loadTranslations() {
    try {
        const response = await fetch('/user/v1/user-translations.json');
        translations = await response.json();
    } catch (error) {
        console.error('Failed to load translations:', error);
        translations = { en: {}, ar: {} };
    }
}

// Translation function
function t(key) {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
}

// Load language preference
function loadLanguagePreference() {
    currentLanguage = localStorage.getItem('preferred_language') || 'en';
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    updateTranslations();
}

// Update all translations
function updateTranslations() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = t(key);
    });
}

// Check authentication
async function checkAuthentication() {
    if (!supabase) {
        redirectToLogin();
        return;
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
            redirectToLogin();
            return;
        }

        currentUser = session.user;
    } catch (error) {
        console.error('Authentication check error:', error);
        redirectToLogin();
    }
}

// Redirect to login
function redirectToLogin() {
    showToast('Please login to access your profile', 'error');
    setTimeout(() => {
        window.location.href = '/user/login.html';
    }, 2000);
}

// Load user profile
async function loadUserProfile() {
    if (!supabase || !currentUser) return;

    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.error('Profile load error:', error);
            showToast('Failed to load profile information', 'error');
            return;
        }

        if (profile) {
            displayUserProfile(profile);
        } else {
            showEmptyProfile();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile information', 'error');
    }
}

// Display user profile
function displayUserProfile(profile) {
    // Update profile header
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    profileName.textContent = fullName || currentUser.email.split('@')[0];
    profileEmail.textContent = currentUser.email;
    
    if (profile.google_picture) {
        profileAvatar.src = profile.google_picture;
        profileAvatar.alt = fullName || 'Profile';
    }

    // Format date of birth
    let dobFormatted = '-';
    if (profile.date_of_birth) {
        try {
            const date = new Date(profile.date_of_birth);
            dobFormatted = date.toLocaleDateString(currentLanguage === 'ar' ? 'ar-OM' : 'en-OM');
        } catch (e) {
            dobFormatted = profile.date_of_birth;
        }
    }

    // Format gender
    let genderDisplay = '-';
    if (profile.gender) {
        switch (profile.gender) {
            case 'male':
                genderDisplay = t('male') || 'Male';
                break;
            case 'female':
                genderDisplay = t('female') || 'Female';
                break;
            case 'prefer_not_to_say':
                genderDisplay = t('prefer_not_to_say') || 'Prefer not to say';
                break;
            default:
                genderDisplay = profile.gender;
        }
    }

    // Update profile information
    const profileInfo = document.getElementById('profileInfo');
    profileInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label" data-translate="first_name">First Name</span>
            <span class="info-value">${profile.first_name || '-'}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="last_name">Last Name</span>
            <span class="info-value">${profile.last_name || '-'}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="email">Email</span>
            <span class="info-value">${currentUser.email}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="phone">Phone</span>
            <span class="info-value">${profile.phone || '-'}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="gender">Gender</span>
            <span class="info-value">${genderDisplay}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="age">Age</span>
            <span class="info-value">${profile.age || '-'}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="date_of_birth">Date of Birth</span>
            <span class="info-value">${dobFormatted}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="wilayat">Wilayat</span>
            <span class="info-value">${profile.wilayat || '-'}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="city">City</span>
            <span class="info-value">${profile.city || '-'}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="full_address">Full Address</span>
            <span class="info-value">${profile.full_address || '-'}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="language_preference">Language</span>
            <span class="info-value">${profile.language_preference === 'ar' ? (t('arabic') || 'Arabic') : (t('english') || 'English')}</span>
        </div>
        <div class="info-item">
            <span class="info-label" data-translate="currency">Currency</span>
            <span class="info-value">${profile.currency || 'OMR'}</span>
        </div>
    `;

    updateTranslations();
}

// Show empty profile
function showEmptyProfile() {
    const profileInfo = document.getElementById('profileInfo');
    profileInfo.innerHTML = `
        <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
            </svg>
            <h3 data-translate="no_profile_info">No Profile Information</h3>
            <p data-translate="profile_incomplete">Please complete your profile to see your information here.</p>
        </div>
    `;
    updateTranslations();
}

// Setup event listeners
function setupEventListeners() {
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', showDeleteConfirmation);
    }
}

// Show delete confirmation
function showDeleteConfirmation() {
    if (isProcessing) return;

    const confirmed = confirm(t('delete_account_confirm') || 'Are you sure you want to delete your account? This will clear your profile information and you will need to complete registration again if you want to use your account.');
    
    if (confirmed) {
        deleteAccount();
    }
}

// Delete account (clear profile data)
async function deleteAccount() {
    if (isProcessing || !supabase || !currentUser) return;

    isProcessing = true;
    const deleteBtn = document.getElementById('deleteAccountBtn');
    deleteBtn.classList.add('loading');
    deleteBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
        </svg>
        <span data-translate="deleting">Deleting...</span>
    `;

    try {
        // Clear profile data but keep auth record
        const { error } = await supabase
            .from('user_profiles')
            .update({
                profile_completed: false,
                onboarding_completed: false,
                first_name: null,
                last_name: null,
                phone: null,
                gender: null,
                age: null,
                date_of_birth: null,
                wilayat: null,
                city: null,
                full_address: null,
                google_picture: null,
                agree_terms: false,
                agree_marketing: false,
                language_preference: 'en',
                email_notifications: true,
                sms_notifications: false,
                marketing_emails: false,
                order_updates: true,
                currency: 'OMR',
                timezone: 'Asia/Muscat'
            })
            .eq('id', currentUser.id);

        if (error) {
            throw error;
        }

        showToast('Account information deleted successfully', 'success');
        
        // Sign out and redirect
        setTimeout(async () => {
            await supabase.auth.signOut();
            window.location.href = '/user/login.html';
        }, 2000);

    } catch (error) {
        console.error('Delete account error:', error);
        showToast('Failed to delete account information', 'error');
    } finally {
        isProcessing = false;
        deleteBtn.classList.remove('loading');
        deleteBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
            </svg>
            <span data-translate="delete_account">Delete Account</span>
        `;
        updateTranslations();
    }
}

// Hide loading splash
function hideLoadingSplash() {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
        splash.classList.add('hidden');
    }
}

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon;
    switch (type) {
        case 'success':
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>`;
            break;
        case 'error':
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
            break;
        default:
            icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m9 12 2 2 4-4"></path>
            </svg>`;
    }
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}