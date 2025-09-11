// Improved Profile Page Script with Edit Functionality
let supabase = null;
let currentLanguage = 'en';
let translations = {};
let currentUser = null;
let currentProfile = null;
let isProcessing = false;
let isEditMode = false;
let originalData = {};

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
        console.log('User authenticated:', currentUser.email);
    } catch (error) {
        console.error('Authentication check error:', error);
        redirectToLogin();
    }
}

// Redirect to login
function redirectToLogin() {
    showToast('Please login to access your profile', 'error');
    setTimeout(() => {
        window.location.href = '/users/v1/login.html';
    }, 2000);
}

// Load user profile
async function loadUserProfile() {
    if (!supabase || !currentUser) return;

    try {
        // Update header immediately with user info
        updateProfileHeader();

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

        currentProfile = profile;
        
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

// Update profile header immediately
function updateProfileHeader() {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');

    // Set email immediately
    if (currentUser) {
        profileEmail.textContent = currentUser.email;
        
        // Set a default name from email until profile loads
        const defaultName = currentUser.email.split('@')[0];
        profileName.textContent = defaultName;
        
        // Set default avatar if Google picture is available
        if (currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture) {
            profileAvatar.src = currentUser.user_metadata.avatar_url || currentUser.user_metadata.picture;
            profileAvatar.alt = defaultName;
        }
    }
}

// Display user profile
function displayUserProfile(profile) {
    // Update profile header with actual data
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    if (fullName) {
        profileName.textContent = fullName;
    }
    
    if (profile.google_picture) {
        profileAvatar.src = profile.google_picture;
        profileAvatar.alt = fullName || 'Profile';
    }

    // Populate form fields
    document.getElementById('firstName').value = profile.first_name || '';
    document.getElementById('lastName').value = profile.last_name || '';
    document.getElementById('email').value = currentUser.email;
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('gender').value = profile.gender || '';
    document.getElementById('age').value = profile.age || '';
    document.getElementById('dateOfBirth').value = profile.date_of_birth || '';
    document.getElementById('wilayat').value = profile.wilayat || '';
    document.getElementById('city').value = profile.city || '';
    document.getElementById('language').value = profile.language_preference || 'en';
    document.getElementById('fullAddress').value = profile.full_address || '';

    // Store original data for cancel functionality
    originalData = {
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        gender: profile.gender || '',
        age: profile.age || '',
        date_of_birth: profile.date_of_birth || '',
        wilayat: profile.wilayat || '',
        city: profile.city || '',
        language_preference: profile.language_preference || 'en',
        full_address: profile.full_address || ''
    };

    updateTranslations();
}

// Show empty profile
function showEmptyProfile() {
    // Set email in form
    document.getElementById('email').value = currentUser.email;
    
    // Initialize with default language
    document.getElementById('language').value = 'en';
    
    // Store empty original data
    originalData = {
        first_name: '',
        last_name: '',
        phone: '',
        gender: '',
        age: '',
        date_of_birth: '',
        wilayat: '',
        city: '',
        language_preference: 'en',
        full_address: ''
    };

    updateTranslations();
}

// Setup event listeners
function setupEventListeners() {
    // Edit toggle button
    const editToggle = document.getElementById('editToggle');
    if (editToggle) {
        editToggle.addEventListener('click', toggleEditMode);
    }

    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProfile);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }

    // Delete account button
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', showDeleteConfirmation);
    }

    // Language change listener
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
        languageSelect.addEventListener('change', handleLanguageChange);
    }

    // Form submit prevention
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (isEditMode) {
                saveProfile();
            }
        });
    }
}

// Toggle edit mode
function toggleEditMode() {
    if (isProcessing) return;

    isEditMode = !isEditMode;
    const container = document.getElementById('profileContainer');
    const editToggle = document.getElementById('editToggle');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteAccountBtn');

    if (isEditMode) {
        // Enter edit mode
        container.classList.remove('view-mode');
        container.classList.add('edit-mode');
        
        // Enable form fields (except email)
        const inputs = container.querySelectorAll('.form-input:not(.readonly), .form-select');
        inputs.forEach(input => {
            input.disabled = false;
        });

        // Update button states
        editToggle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
            </svg>
        `;
        editToggle.title = 'Cancel Edit';
        
        saveBtn.style.display = 'flex';
        cancelBtn.style.display = 'flex';
        deleteBtn.style.display = 'none';

    } else {
        // Exit edit mode
        exitEditMode();
    }
}

// Exit edit mode
function exitEditMode() {
    isEditMode = false;
    const container = document.getElementById('profileContainer');
    const editToggle = document.getElementById('editToggle');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteAccountBtn');

    container.classList.remove('edit-mode');
    container.classList.add('view-mode');
    
    // Disable form fields
    const inputs = container.querySelectorAll('.form-input:not(.readonly), .form-select');
    inputs.forEach(input => {
        input.disabled = true;
    });

    // Update button states
    editToggle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
        </svg>
    `;
    editToggle.title = 'Edit Profile';
    
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    deleteBtn.style.display = 'flex';
}

// Cancel edit
function cancelEdit() {
    if (isProcessing) return;

    // Restore original data
    document.getElementById('firstName').value = originalData.first_name;
    document.getElementById('lastName').value = originalData.last_name;
    document.getElementById('phone').value = originalData.phone;
    document.getElementById('gender').value = originalData.gender;
    document.getElementById('age').value = originalData.age;
    document.getElementById('dateOfBirth').value = originalData.date_of_birth;
    document.getElementById('wilayat').value = originalData.wilayat;
    document.getElementById('city').value = originalData.city;
    document.getElementById('language').value = originalData.language_preference;
    document.getElementById('fullAddress').value = originalData.full_address;

    exitEditMode();
}

// Save profile
async function saveProfile() {
    if (isProcessing || !supabase || !currentUser) return;

    // Validate required fields - check if elements exist
    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    
    if (!firstNameField) {
        showToast('Form not ready, please try again', 'error');
        return;
    }

    const firstName = firstNameField.value.trim();
    const lastName = lastNameField ? lastNameField.value.trim() : '';
    
    if (!firstName) {
        showToast('First name is required', 'error');
        firstNameField.focus();
        return;
    }

    isProcessing = true;
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
        saveBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
            <span data-translate="saving">Saving...</span>
        `;
    }

    try {
        // Collect form data - safely get values
        const formData = {
            first_name: firstName,
            last_name: lastName || null,
            phone: document.getElementById('phone')?.value.trim() || null,
            gender: document.getElementById('gender')?.value || null,
            age: document.getElementById('age')?.value ? parseInt(document.getElementById('age').value) : null,
            date_of_birth: document.getElementById('dateOfBirth')?.value || null,
            wilayat: document.getElementById('wilayat')?.value.trim() || null,
            city: document.getElementById('city')?.value.trim() || null,
            language_preference: document.getElementById('language')?.value || 'en',
            full_address: document.getElementById('fullAddress')?.value.trim() || null,
            profile_completed: true,
            updated_at: new Date().toISOString()
        };

        // Update profile
        const { data, error } = await supabase
            .from('user_profiles')
            .upsert({
                id: currentUser.id,
                ...formData
            }, {
                onConflict: 'id'
            });

        if (error) {
            throw error;
        }

        // Update stored data
        currentProfile = { ...currentProfile, ...formData };
        originalData = { ...formData };

        // Update profile header
        const fullName = `${formData.first_name} ${formData.last_name || ''}`.trim();
        const profileNameEl = document.getElementById('profileName');
        if (profileNameEl) {
            profileNameEl.textContent = fullName;
        }

        // Handle language change
        if (formData.language_preference !== currentLanguage) {
            currentLanguage = formData.language_preference;
            localStorage.setItem('preferred_language', currentLanguage);
            document.documentElement.lang = currentLanguage;
            document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
            updateTranslations();
        }

        showToast('Profile updated successfully', 'success');
        exitEditMode();

    } catch (error) {
        console.error('Save profile error:', error);
        showToast('Failed to save profile: ' + error.message, 'error');
    } finally {
        isProcessing = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
            saveBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/>
                </svg>
                <span data-translate="save_changes">Save Changes</span>
            `;
            updateTranslations();
        }
    }
}

// Handle language change
function handleLanguageChange(event) {
    if (!isEditMode) return;
    
    const newLanguage = event.target.value;
    if (newLanguage !== currentLanguage) {
        // Show preview of language change
        currentLanguage = newLanguage;
        document.documentElement.lang = currentLanguage;
        document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
        updateTranslations();
        
        showToast('Language will be saved when you save your profile', 'info');
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
    deleteBtn.disabled = true;
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
            window.location.href = '/user/v1/login.html';
        }, 2000);

    } catch (error) {
        console.error('Delete account error:', error);
        showToast('Failed to delete account information', 'error');
    } finally {
        isProcessing = false;
        deleteBtn.disabled = false;
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