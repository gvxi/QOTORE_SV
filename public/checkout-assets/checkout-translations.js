// Checkout Translations
const translations = {
    en: {
        // Page basics
        loading: "Loading...",
        qotore: "Qotore",
        home: "Home",
        
        // Page title
        checkout_title: "Complete Your Order",
        checkout_subtitle: "Review your items and delivery information",
        
        // Authentication
        login_required: "Login Required",
        login_required_message: "Please sign in to complete your order",
        sign_in: "Sign In",
        profile_incomplete: "Complete Your Profile",
        profile_incomplete_message: "Please complete your profile to place orders",
        complete_profile: "Complete Profile",
        
        // Cart
        cart_empty: "Your Cart is Empty",
        cart_empty_message: "Add some fragrances to get started",
        browse_fragrances: "Browse Fragrances",
        continue_shopping: "Continue Shopping",
        your_items: "Your Items",
        subtotal: "Subtotal",
        total: "Total",
        omr: "OMR",
        quantity: "Qty",
        remove: "Remove",
        
        // Delivery
        delivery_information: "Delivery Information",
        wilayat: "Wilayat",
        select_wilayat: "Select your Wilayat",
        city: "City/Area",
        city_placeholder: "Enter your city or area",
        delivery_type: "Delivery Type",
        home_delivery: "Home Delivery",
        delivery_service: "Delivery Service",
        notes: "Notes (Optional)",
        notes_placeholder: "Special instructions, landmarks, or additional information...",
        
        // Order actions
        place_order: "Place Order",
        processing_order: "Processing Order...",
        
        // Order status
        order_number: "Order",
        order_date: "Placed on",
        status_pending: "Pending Review",
        status_reviewed: "In Progress", 
        status_completed: "Completed",
        status_cancelled: "Cancelled",
        
        // Order actions
        cancel_order: "Cancel Order",
        view_invoice: "View Invoice",
        print_invoice: "Print Invoice",
        cannot_cancel: "Cannot Cancel",
        cancel_expired: "Cancellation period expired",
        
        // Invoice
        order_invoice: "Order Invoice",
        invoice_title: "ORDER INVOICE",
        invoice_subtitle: "Qotore - Premium Fragrances",
        customer_information: "Customer Information",
        order_information: "Order Information", 
        order_items: "Order Items",
        item: "Item",
        size: "Size",
        unit_price: "Unit Price",
        total_price: "Total",
        grand_total: "Grand Total",
        delivery_method: "Delivery Method",
        order_notes: "Notes",
        contact_whatsapp: "WhatsApp",
        contact_email: "Email",
        
        // Modals
        close: "Close",
        print: "Print",
        order_placed: "Order Placed Successfully!",
        order_confirmation: "We've received your order and will contact you soon with confirmation details.",
        view_orders: "View My Orders",
        
        // Messages
        order_success: "Your order has been placed successfully! You will receive email confirmation shortly.",
        order_error: "Failed to place order. Please try again or contact us directly.",
        cancel_success: "Your order has been cancelled successfully.",
        cancel_error: "Failed to cancel order. Please contact us directly.",
        validation_required: "Please fill in all required fields",
        validation_wilayat: "Please select your Wilayat",
        validation_city: "Please enter your city or area",
        
        // Toasts
        item_removed: "Item removed from cart",
        cart_updated: "Cart updated",
        loading_order: "Loading order details...",
        network_error: "Network error. Please check your connection.",
        session_expired: "Session expired. Please sign in again.",
        
        // Time
        minutes_ago: "minutes ago",
        hours_ago: "hours ago",
        days_ago: "days ago",
        just_now: "Just now",
        
        // Confirmation
        confirm_cancel_order: "Are you sure you want to cancel this order?",
        confirm_remove_item: "Remove this item from your cart?",
        yes: "Yes",
        no: "No",
        cancel: "Cancel",
        confirm: "Confirm"
    },
    
    ar: {
        // Page basics
        loading: "جاري التحميل...",
        qotore: "قطوره",
        home: "الرئيسية",
        
        // Page title
        checkout_title: "إكمال طلبك",
        checkout_subtitle: "راجع العناصر ومعلومات التوصيل",
        
        // Authentication
        login_required: "تسجيل الدخول مطلوب",
        login_required_message: "يرجى تسجيل الدخول لإكمال طلبك",
        sign_in: "تسجيل الدخول",
        profile_incomplete: "أكمل ملفك الشخصي",
        profile_incomplete_message: "يرجى إكمال ملفك الشخصي لتقديم الطلبات",
        complete_profile: "إكمال الملف الشخصي",
        
        // Cart
        cart_empty: "سلة التسوق فارغة",
        cart_empty_message: "أضف بعض العطور للبدء",
        browse_fragrances: "تصفح العطور",
        continue_shopping: "متابعة التسوق",
        your_items: "عناصرك",
        subtotal: "المجموع الفرعي",
        total: "المجموع",
        omr: "ريال عماني",
        quantity: "الكمية",
        remove: "إزالة",
        
        // Delivery
        delivery_information: "معلومات التوصيل",
        wilayat: "الولاية",
        select_wilayat: "اختر ولايتك",
        city: "المدينة/المنطقة",
        city_placeholder: "أدخل مدينتك أو منطقتك",
        delivery_type: "نوع التوصيل",
        home_delivery: "التوصيل للمنزل",
        delivery_service: "خدمة التوصيل",
        notes: "ملاحظات (اختيارية)",
        notes_placeholder: "تعليمات خاصة أو معالم أو معلومات إضافية...",
        
        // Order actions
        place_order: "تقديم الطلب",
        processing_order: "جاري معالجة الطلب...",
        
        // Order status
        order_number: "الطلب",
        order_date: "تم تقديمه في",
        status_pending: "في انتظار المراجعة",
        status_reviewed: "قيد التحضير",
        status_completed: "مكتمل",
        status_cancelled: "ملغي",
        
        // Order actions
        cancel_order: "إلغاء الطلب",
        view_invoice: "عرض الفاتورة",
        print_invoice: "طباعة الفاتورة",
        cannot_cancel: "لا يمكن الإلغاء",
        cancel_expired: "انتهت فترة الإلغاء",
        
        // Invoice
        order_invoice: "فاتورة الطلب",
        invoice_title: "فاتورة الطلب",
        invoice_subtitle: "قطوره - عطور فاخرة",
        customer_information: "معلومات العميل",
        order_information: "معلومات الطلب",
        order_items: "عناصر الطلب",
        item: "العنصر",
        size: "الحجم",
        unit_price: "سعر الوحدة",
        total_price: "المجموع",
        grand_total: "المجموع الإجمالي",
        delivery_method: "طريقة التوصيل",
        order_notes: "ملاحظات",
        contact_whatsapp: "واتساب",
        contact_email: "البريد الإلكتروني",
        
        // Modals
        close: "إغلاق",
        print: "طباعة",
        order_placed: "تم تقديم الطلب بنجاح!",
        order_confirmation: "لقد تلقينا طلبك وسنتواصل معك قريباً بتفاصيل التأكيد.",
        view_orders: "عرض طلباتي",
        
        // Messages
        order_success: "تم تقديم طلبك بنجاح! ستتلقى رسالة تأكيد عبر البريد الإلكتروني قريباً.",
        order_error: "فشل في تقديم الطلب. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.",
        cancel_success: "تم إلغاء طلبك بنجاح.",
        cancel_error: "فشل في إلغاء الطلب. يرجى التواصل معنا مباشرة.",
        validation_required: "يرجى ملء جميع الحقول المطلوبة",
        validation_wilayat: "يرجى اختيار ولايتك",
        validation_city: "يرجى إدخال مدينتك أو منطقتك",
        
        // Toasts
        item_removed: "تم إزالة العنصر من السلة",
        cart_updated: "تم تحديث السلة",
        loading_order: "جاري تحميل تفاصيل الطلب...",
        network_error: "خطأ في الشبكة. يرجى التحقق من اتصالك.",
        session_expired: "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.",
        
        // Time
        minutes_ago: "دقائق مضت",
        hours_ago: "ساعات مضت", 
        days_ago: "أيام مضت",
        just_now: "الآن",
        
        // Confirmation
        confirm_cancel_order: "هل أنت متأكد من إلغاء هذا الطلب؟",
        confirm_remove_item: "إزالة هذا العنصر من سلتك؟",
        yes: "نعم",
        no: "لا",
        cancel: "إلغاء",
        confirm: "تأكيد"
    }
};

// Translation system
let currentLanguage = 'en';

function t(key) {
    return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function setLanguage(lang) {
    currentLanguage = lang;
    updatePageTexts();
}

function updatePageTexts() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const translation = t(key);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (element.hasAttribute('data-translate-placeholder')) {
                element.placeholder = translation;
            } else {
                element.value = translation;
            }
        } else {
            element.textContent = translation;
        }
    });
    
    // Update placeholders specifically
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        element.placeholder = t(key);
    });
    
    // Update document title
    document.title = t('checkout_title') + ' - ' + t('qotore');
    
    // Update RTL/LTR direction
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
}

// Auto-detect language from URL or localStorage
function initializeLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    const savedLang = localStorage.getItem('qotore_language');
    
    if (urlLang && translations[urlLang]) {
        currentLanguage = urlLang;
        localStorage.setItem('qotore_language', urlLang);
    } else if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
    } else {
        // Try to detect from browser language
        const browserLang = navigator.language || navigator.languages[0];
        if (browserLang.startsWith('ar')) {
            currentLanguage = 'ar';
        }
    }
    
    updatePageTexts();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLanguage);
} else {
    initializeLanguage();
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.t = t;
    window.setLanguage = setLanguage;
    window.currentLanguage = () => currentLanguage;
}