import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1bnXrYuwJQ-prQN1hsPYwr_oR2WwghjU",
    authDomain: "stallcart-2baa5.firebaseapp.com",
    projectId: "stallcart-2baa5",
    appId: "1:795612911191:web:c5ca9a3f1cf8872d0cf512"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// UI Elements
const modal = document.getElementById("authModal");
const toast = document.getElementById("toast");
const homePage = document.getElementById("homePage");
const productPage = document.getElementById("productPage");
const profilePage = document.getElementById("profilePage");
const searchInput = document.getElementById('mainSearchInput');
const suggestionsBox = document.getElementById('searchSuggestions');

// Global State
let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('stallcart_cart')) || [];
let activeCat = 'top';
let activeSubcat = '';
let searchQuery = '';

const updateCartCount = () => {
    const countNodes = document.querySelectorAll('.cart-count');
    countNodes.forEach(n => n.textContent = cart.length);
    localStorage.setItem('stallcart_cart', JSON.stringify(cart));
};
document.addEventListener('DOMContentLoaded', updateCartCount);

const fetchData = () => {
    onSnapshot(query(collection(db, "products")), (snap) => {
        products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
    });

    if (searchInput) {
        // 1. Live Input for Suggestions
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (val.length > 0) {
                const matches = products.filter(p => 
                    (p.title || p.name || "").toLowerCase().includes(val) ||
                    (p.desc || "").toLowerCase().includes(val)
                ).slice(0, 8); // Top 8 results
                
                if (matches.length > 0) {
                    suggestionsBox.innerHTML = matches.map(m => `
                        <div class="suggestion-item" onclick="applySearch('${m.title || m.name}')">
                            <i class="fa fa-search"></i>
                            <span>${m.title || m.name}</span>
                        </div>
                    `).join('');
                    suggestionsBox.style.display = 'block';
                } else {
                    suggestionsBox.style.display = 'none';
                }
            } else {
                suggestionsBox.style.display = 'none';
                searchQuery = '';
                renderProducts();
            }
        });

        // 2. Enter Key to Search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                applySearch(searchInput.value);
            }
        });

        // Hide suggestions on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) suggestionsBox.style.display = 'none';
        });
    }

    onSnapshot(query(collection(db, "categories")), (snap) => {
        categories = snap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
        renderMainCategories();
        renderProducts();
    });
};

window.applySearch = (val) => {
    searchQuery = val;
    if (searchInput) searchInput.value = val;
    const hPage = document.getElementById('homePage');
    if (hPage && hPage.style.display === 'none') showSection('home');
    if (suggestionsBox) suggestionsBox.style.display = 'none';
    renderProducts();
};


let checkoutItems = [];

const getDeliveryDate = (days = 12) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
};

window.showSection = (section) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const hPage = document.getElementById('homePage');
    const pPage = document.getElementById('productPage');
    const profPage = document.getElementById('profilePage');
    const cPage = document.getElementById('cartPage');
    const chPage = document.getElementById('checkoutPage');
    const oPage = document.getElementById('ordersPage');
    
    // Header Visibility Toggle
    const searchBar = document.querySelector('.search-container');
    const categoriesNav = document.getElementById('mainCatsNav');
    const authSection = document.getElementById('authSection');
    
    if (section === 'home') {
        if(hPage) hPage.style.display = 'block';
        if(pPage) pPage.style.display = 'none';
        if(profPage) profPage.style.display = 'none';
        if(cPage) cPage.style.display = 'none';
        if(chPage) chPage.style.display = 'none';
        if(oPage) oPage.style.display = 'none';

        if(searchBar) searchBar.style.visibility = 'visible';
        if(categoriesNav) categoriesNav.style.display = 'flex';
        if(authSection) authSection.style.display = 'block';
        renderProducts();
    } else {
        if(hPage) hPage.style.display = 'none';
        if(pPage) pPage.style.display = section === 'product' ? 'block' : 'none';
        if(profPage) profPage.style.display = section === 'profile' ? 'block' : 'none';
        if(cPage) cPage.style.display = section === 'cart' ? 'block' : 'none';
        if(chPage) chPage.style.display = section === 'checkout' ? 'block' : 'none';
        if(oPage) oPage.style.display = section === 'orders' ? 'block' : 'none';
        
        if(searchBar) searchBar.style.visibility = 'hidden';
        if(categoriesNav) categoriesNav.style.display = 'none';
        if(authSection) authSection.style.display = 'none';
    }
    if (section === 'profile') loadProfileData();
    if (section === 'cart') renderCart();
    if (section === 'orders') renderOrders();
};

const renderCart = () => {
    const list = document.getElementById('cartItemsList');
    if(!list) return;
    if(cart.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:80px 20px;">
                <img src="e.png" width="220" style="margin-bottom:30px;">
                <h3 style="font-size:24px; color:#212121; font-weight:800;">Your cart is empty!</h3>
                <p style="color:#878787; margin-top:10px; font-size:16px;">Add items to it now.</p>
                <button class="back-home-btn" style="margin-top:30px;" onclick="showSection('home')">Shop Now</button>
            </div>`;
        return;
    }
    let total = 0;
    list.innerHTML = cart.map((p, index) => {
        total += parseFloat(p.price);
        return `<div class="cart-item-row">
            <img src="${p.imageUrl || p.img}" alt="${p.title}">
            <div style="flex:1;">
                <h4>${p.title || p.name}</h4>
                <div style="font-weight:600; margin-top:5px;">₹${p.price}</div>
                <p style="font-size:12px; margin-top:10px;">Delivery by ${getDeliveryDate()} | <span class="green-text">Free</span></p>
            </div>
            <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#2874f0; cursor:pointer; font-size:12px; font-weight:600;">REMOVE</button>
        </div>`;
    }).join('');
    document.getElementById('cartTotalCount').textContent = cart.length;
    document.getElementById('totalMRP').textContent = `₹${total}`;
    document.getElementById('finalCartAmount').textContent = `₹${total}`;
};

const renderOrders = async () => {
    const user = auth.currentUser; if(!user) return;
    const list = document.getElementById('ordersList');
    if (!list) return;
    list.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner" style="margin:0 auto 15px;"></div><p>Fetching your latest orders...</p></div>';
    try {
        onSnapshot(query(collection(db, "orders")), (snap) => {
            const myOrders = snap.docs.map(doc => ({id: doc.id, ...doc.data()})).filter(o => o.userId === user.uid);
            if(myOrders.length === 0) { 
                list.innerHTML = `
                    <div style="text-align:center; padding:100px 20px;">
                        <img src="https://rukminim1.flixcart.com/www/800/800/promos/16/05/2019/d405a710-1008-46a1-bb58-534574f015d8.png?q=90" width="180">
                        <h3 style="margin-top:20px; color:#212121;">No orders found!</h3>
                        <p style="color:#878787; font-size:14px; margin-top:8px;">You haven't placed any orders yet. Start shopping!</p>
                        <button class="view-all" style="margin-top:20px;" onclick="showSection('home')">Shop Now</button>
                    </div>`; 
                return; 
            }
            list.innerHTML = myOrders.reverse().map(o => {
                const orderDate = new Date(o.orderDate);
                const diffHours = (new Date() - orderDate) / (1000 * 60 * 60);
                const canCancel = diffHours < 24 && (o.status === 'Ordered' || !o.status);
                
                let statusClass = "status-ordered";
                let statusMsg = o.status || 'Ordered';
                let statusDot = "#2874f0";
                
                if(o.status === 'Cancelled') { statusClass = "status-cancelled"; statusDot = "#d32f2f"; }
                if(o.status === 'Cancellation Requested') { statusClass = "status-requested"; statusDot = "#ff9800"; }
                if(o.status === 'Out for Delivery') { statusClass = "status-out"; statusDot = "#f57f17"; }
                if(o.status === 'Delivered') { statusClass = "status-delivered"; statusDot = "#388e3c"; }

                return `
                <div class="order-item-card shopsy-order-premium">
                    <div class="order-card-header">
                        <div class="order-meta">
                            <span class="order-id">ORDER ID: #${o.id.substring(0,10).toUpperCase()}</span>
                            <span class="order-date"><i class="fa fa-calendar-alt"></i> ${new Date(o.orderDate).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})}</span>
                        </div>
                        <div class="order-badge ${statusClass}">
                            <span class="status-dot-large" style="background:${statusDot};"></span>
                            ${statusMsg}
                        </div>
                    </div>
                    <div class="order-card-body">
                        <div class="product-thumb-container">
                            <img src="${o.productImage}" alt="${o.productTitle}" class="order-img">
                        </div>
                        <div class="order-main-info">
                            <h4 class="order-prod-title">${o.productTitle}</h4>
                            <div class="order-price-row">₹${o.productPrice} <span class="payment-mode">COD</span></div>
                            <div class="shipping-to">
                                <span class="label">Delivering to:</span>
                                <span class="value">${o.address?.firstName} ${o.address?.lastName} | ${o.address?.city}</span>
                            </div>
                            <p class="order-delivery-msg"><i class="fa fa-truck-fast"></i> Expected Arrival: <b>${o.deliveryEstimate || getDeliveryDate()}</b></p>
                            
                            ${(o.deliveryOtp && o.status !== 'Delivered' && o.status !== 'Cancelled') ? `
                                <div class="delivery-security-box">
                                    <span class="otp-label"><i class="fa fa-shield-check"></i> CONFIRMATION OTP:</span>
                                    <span class="otp-value">${o.deliveryOtp}</span>
                                    <p class="otp-hint">Share this code with the delivery boy only at the time of delivery.</p>
                                </div>
                            ` : ''}

                            ${o.deliveryBoyName ? `<p style="font-size:11px; margin-top:10px; color:#2874f0;"><b>Delivery Partner:</b> ${o.deliveryBoyName}</p>` : ''}
                            ${o.status === 'Cancelled' ? '<p class="refund-msg"><i class="fa fa-circle-check"></i> Amount will be refunded to original source within 24-48 Hours</p>' : ''}
                        </div>
                        <div class="order-actions">
                            ${canCancel ? `<button class="premium-cancel-btn" onclick="requestCancellation('${o.id}')">Request Cancellation</button>` : ''}
                            ${o.status === 'Cancellation Requested' ? '<span class="status-badge-pending">Processing Cancellation...</span>' : ''}
                            <button class="shopsy-btn-outline" onclick="viewProduct('${o.productId}')">Buy it again</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        });
    } catch(e) { list.innerHTML = '<div style="text-align:center; padding:50px; color:#d10000;">Failed to load orders. Please try again.</div>'; }
};

window.requestCancellation = async (orderId) => {
    if(!confirm('Are you sure you want to request cancellation for this order? This action can be performed only within 24 hours of placement.')) return;
    showLoading("Sending Cancellation Request...");
    try {
        await updateDoc(doc(db, "orders", orderId), { status: 'Cancellation Requested' });
        setTimeout(() => {
            hideLoading();
            showToast("Cancellation Request Sent Successfully! Status will update shortly.");
        }, 1500);
    } catch(e) { 
        hideLoading();
        console.error(e);
        alert('Cancellation failed: ' + e.message); 
    }
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    updateCartCount();
    renderCart();
};

document.getElementById('cartPlaceOrderBtn')?.addEventListener('click', () => {
    if(cart.length > 0) { checkoutItems = [...cart]; startCheckout(); }
});

const startCheckout = async () => {
    const user = auth.currentUser;
    if(!user) { modal.style.display='flex'; return; }
    
    showLoading("Preparing Checkout Bag...");
    try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        const userData = docSnap.data();
        
        if (!isAddressComplete(userData)) {
            hideLoading();
            alert('Your shipping profile is incomplete. Please fulfill your address details to proceed with order placement.');
            document.getElementById('profileSetupModal').style.display = 'flex';
            return;
        }

        showSection('checkout');
        
        // Address Step - Full Details
        const addrDiv = document.getElementById('checkoutAddress');
        if(userData && userData.address) {
            const addr = userData.address;
            addrDiv.innerHTML = `
                <div class="checkout-address-card">
                    <div class="user-main-info">
                        <strong>${addr.firstName} ${addr.lastName}</strong>
                        <span class="addr-label">HOME</span>
                    </div>
                    <p class="full-addr-text">${addr.address}, ${addr.apartment ? addr.apartment + ', ' : ''} ${addr.city}, ${addr.state} - <strong>${addr.postalCode}</strong></p>
                    <p class="contact-info"><strong>Phone:</strong> ${addr.phone}</p>
                    <button class="premium-edit-btn" id="editCheckoutAddr">
                        <i class="fa fa-edit"></i> CHANGE OR EDIT ADDRESS
                    </button>
                    <div class="trust-strip">
                        <i class="fa fa-shield-alt"></i> 100% Genuine and Safe delivery guaranteed
                    </div>
                </div>
            `;
            document.getElementById('editCheckoutAddr').addEventListener('click', () => {
                document.getElementById('modalManageSection').style.display = 'none';
                document.getElementById('profileSetupModal').style.display = 'flex';
            });
        }
        
        // Summary Step
        const summDiv = document.getElementById('checkoutSummary');
        summDiv.innerHTML = `
            <div class="checkout-summary-container">
            ${checkoutItems.map(p => {
                const price = parseFloat(p.price) || 0;
                const oldPrice = parseFloat(p.oldPrice) || (price * 1.5);
                return `
                    <div class="checkout-product-item-v2">
                        <div class="checkout-prod-left">
                            <img src="${p.imageUrl || p.img}" class="checkout-product-img-v2">
                            <div class="qty-badge">1</div>
                        </div>
                        <div class="checkout-info">
                            <h4>${p.title || p.name}</h4>
                            <p class="seller-info">Stallcart Elite Seller</p>
                            <div class="checkout-price-row">
                                <span class="current-price">₹${price}</span>
                                <span class="old-price">₹${oldPrice.toFixed(0)}</span>
                                <span class="discount-tag">NEW DEAL</span>
                            </div>
                            <div class="badge-row">
                                <span class="badge delivery-badge"><i class="fa fa-truck"></i> Free Delivery by ${getDeliveryDate(12)}</span>
                                ${p.isAssured ? '<span class="badge assured-badge">STALLCART ASSURED</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
            </div>
        `;
        
    } catch(e) { 
        console.error(e); 
        alert("Something went wrong while preparing your checkout.");
    }
    hideLoading();
};

document.getElementById('finishOrderBtn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if(!user) return;
    
    showLoading("Finalizing Order...");
    try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        const userData = docSnap.data();
        
        for(let p of checkoutItems) {
            const deliveryOtp = Math.floor(100000 + Math.random() * 900000);
            const orderData = {
                userId: user.uid,
                userName: userData.displayName || user.displayName,
                userEmail: user.email,
                address: userData.address || {},
                productId: p.id,
                productTitle: p.title || p.name,
                productPrice: p.price,
                productImage: p.imageUrl || p.img,
                orderDate: new Date().toISOString(),
                status: 'Ordered',
                deliveryOtp: deliveryOtp,
                deliveryEstimate: getDeliveryDate(12)
            };
            await addDoc(collection(db, "orders"), orderData);
            
            // Remove from cart if it was there
            const cartIdx = cart.findIndex(item => item.id === p.id);
            if(cartIdx > -1) cart.splice(cartIdx, 1);
        }
        
        updateCartCount();
        checkoutItems = [];
        alert('Congratulations! Your order has been placed.');
        showSection('home');
    } catch(e) { alert('Order Error: ' + e.message); }
    hideLoading();
});

// Cartesian click
document.querySelector('.cart-container')?.addEventListener('click', () => showSection('cart'));

function renderProducts() {
    const grid = document.getElementById('dynamicProductGrid');
    const hPage = document.getElementById('homePage');
    if (!grid || (hPage && hPage.style.display === 'none')) return;
    
    let filtered = products;

    // Smart Fuzzy Search Logic
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const keywords = query.split(/\s+/);
        filtered = products.filter(p => {
            const title = (p.title || p.name || "").toLowerCase();
            const desc = (p.desc || "").toLowerCase();
            const cat = (p.category || "").toLowerCase();
            const brand = (p.brand || "").toLowerCase();
            
            // Allow matching if any part of the metadata contains the keywords
            return keywords.every(k => 
                title.includes(k) || 
                desc.includes(k) || 
                cat.includes(k) || 
                brand.includes(k)
            );
        });
    } else {
        // Normal Category Filtering
        if (activeCat === 'top') {
            filtered = products.filter(p => p.category === 'top');
        } else {
            if (activeSubcat) {
                const matchKey = `${activeCat}_${activeSubcat}`;
                filtered = products.filter(p => p.category === matchKey || p.category === activeSubcat);
            } else {
                filtered = products.filter(p => (p.category || "").startsWith(activeCat));
            }
        }
    }
    if (filtered.length === 0) {
        grid.style.display = 'block';
        grid.innerHTML = `<div class="premium-empty-state">
            <div class="empty-icon-wrapper">
                <i class="fa-solid fa-hourglass-start pulsing-icon"></i>
            </div>
            <h2>We are Listing Product...</h2>
            <p>Our team is curating the best collection for you. Stay Tuned!</p>
            <button class="back-home-btn" onclick="window.activeCat='top'; renderMainCategories(); renderProducts();">Explore Other Deals</button>
        </div>`;
        return;
    }
    grid.style.display = 'grid';
    grid.innerHTML = filtered.map(p => {
        const price = parseFloat(p.price) || 0;
        const oldPrice = parseFloat(p.oldPrice) || (price * 1.5);
        const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
        return `<div class="product-card" onclick="viewProduct('${p.id}')">
            <img src="${p.imageUrl || p.img}" alt="${p.title || p.name}" class="product-image">
            <div class="product-info">
                <h3>${p.title || p.name}</h3>
                <div class="price-tag"><b>₹${price}</b> <span class="old-price">₹${oldPrice.toFixed(0)}</span> <span class="discount">${discount}% off</span></div>
                ${p.isAssured ? `<img src="A.png" class="f-assured" alt="Assured">` : ''}
            </div>
        </div>`;
    }).join('');

    const header = document.querySelector('#dynamicSection h2');
    const timer = document.getElementById('timerGroup');
    const subNav = document.getElementById('dynamicSubNav');
    if (activeCat === 'top') {
        if(header) header.innerHTML = `<span class="live-dot-pulse"></span> ✨ TOP STEALS OF THE DAY`;
        if(timer) timer.style.display = 'flex';
        if(subNav) subNav.style.display = 'none';
    } else {
        const cat = categories.find(c => c.id === activeCat);
        if(header) header.textContent = cat ? cat.label : 'Products';
        if(timer) timer.style.display = 'none';
        if (cat && cat.subCategories && cat.subCategories.length > 0) {
            if(subNav) {
                subNav.style.display = 'flex';
                // Add an "ALL" option to the sub-nav as well
                const allTab = `<div class="subcat-item ${!activeSubcat ? 'active' : ''}" onclick="window.activeSubcat=''; renderProducts();">ALL</div>`;
                subNav.innerHTML = allTab + cat.subCategories.map((sub, index) => `<div class="subcat-item ${activeSubcat === sub.id ? 'active' : ''}" onclick="window.activeSubcat='${sub.id}'; renderProducts();">${sub.label}</div>`).join('');
            }
        } else {
            if(subNav) subNav.style.display = 'none';
            activeSubcat = '';
        }
    }
}

window.viewProduct = (id) => {
    if (!auth.currentUser) { modal.style.display = "block"; return; }
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    showSection('product');
    
    const price = parseFloat(p.price) || 0;
    const oldPrice = parseFloat(p.oldPrice) || (price * 1.5);
    const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
    
    const breadcrumbs = `<div class="breadcrumbs">
        <span onclick="showSection('home')">Home</span> > 
        <span>${p.category || 'Deals'}</span> > 
        <span>${p.title}</span>
    </div>`;

    document.getElementById("productDetails").innerHTML = `
        <div class="product-images">
            <div class="image-premium-container">
                <img src="${p.imageUrl || p.img}" alt="${p.title || p.name}" class="main-product-img">
                <div class="zoom-indicator"><i class="fa fa-maximize"></i> Tap to expand</div>
            </div>
        </div>
        <div class="product-details-info">
            ${breadcrumbs}
            <h1 class="product-title-premium">${p.title || p.name}</h1>
            
            <div class="rating-strip">
                <div class="product-rating">4.3 <i class="fa fa-star"></i></div>
                <span class="rating-count">1,248 Ratings & 458 Reviews</span>
                ${p.isAssured ? `<img src="A.png" class="assured-tag-img" alt="Assured">` : ''}
            </div>
            
            <div class="product-price-block">
                <span class="special-price-tag">Exclusive Price</span>
                <div class="price-row-v2">
                    <span class="current-price">₹${price}</span> 
                    <span class="original-price">₹${oldPrice.toFixed(0)}</span> 
                    <span class="percentage-green">${discount}% Off</span>
                </div>
            </div>

            <!-- Authentic Trust Symbols -->
            <div class="trust-icons-horizontal">
                <div class="trust-item"><i class="fa fa-rotate-left"></i> <span>7 Day Return</span></div>
                ${p.isCod ? `<div class="trust-item"><i class="fa fa-money-bill-1"></i> <span>COD Available</span></div>` : ''}
                <div class="trust-item"><i class="fa fa-shield-check"></i> <span>Trusted Quality</span></div>
            </div>

            <!-- Highlights -->
            <div class="highlights-section-v2">
                <h4>Product Highlights</h4>
                <div class="highlight-grid">
                    <div class="highlight-point"><i class="fa fa-circle-check"></i> Premium Grade Material</div>
                    <div class="highlight-point"><i class="fa fa-circle-check"></i> Stallcart Elite Design</div>
                    <div class="highlight-point"><i class="fa fa-circle-check"></i> Comfort & Durability</div>
                    <div class="highlight-point"><i class="fa fa-circle-check"></i> Breathable Fabric</div>
                </div>
            </div>

            <!-- Specifications -->
            <div class="product-specs-premium">
                <h3 class="specs-title">System Specifications</h3>
                <div class="specs-grid">
                    <div class="spec-tile">
                        <span class="label">Model Name</span>
                        <span class="value">${p.modelName || p.title || p.name}</span>
                    </div>
                    <div class="spec-tile">
                        <span class="label">Brand</span>
                        <span class="value">${p.brand || "Stallcart Elite"}</span>
                    </div>
                    <div class="spec-tile">
                        <span class="label">Material</span>
                        <span class="value">${p.material || "Premium Selection"}</span>
                    </div>
                </div>
                
                <div class="description-block">
                    <div class="read-more-wrapper">
                        <p class="description-text desc-content">${p.desc || "Experience the pinnacle of luxury with this premium product, exclusively curated by Stallcart for those who value style and exceptional quality."}</p>
                        <button class="read-more-btn" onclick="toggleReadMore(this)">READ MORE <i class="fa fa-chevron-down"></i></button>
                    </div>
                </div>
            </div>

            <div class="sticky-action-buttons">
                <button class="action-btn buy-now-premium" id="buyNowBtn">
                    <i class="fa fa-bolt"></i> BUY NOW
                </button>
                <button class="action-btn add-to-cart-premium" id="addToCartBtn">
                    <i class="fa-solid fa-cart-shopping"></i> ADD TO CART
                </button>
            </div>
        </div>`;
    
    document.getElementById('buyNowBtn').onclick = () => {
        checkoutItems = [p];
        startCheckout();
    };
    
    document.getElementById('addToCartBtn').onclick = () => {
        cart.push(p);
        updateCartCount();
        showToast("Added to Cart!");
    };

    // Render Similar Products
    const simGrid = document.getElementById('similarProductsGrid');
    if (simGrid) {
        const sim = products.filter(item => item.category === p.category && item.id !== p.id);
        simGrid.innerHTML = sim.length > 0 ? sim.map(item => `
            <div class="product-card" onclick="viewProduct('${item.id}')">
                <img src="${item.imageUrl || item.img}" alt="${item.title || item.name}" class="product-image">
                <div class="product-info">
                    <h3>${item.title || item.name}</h3>
                    <div class="price-tag"><b>₹${item.price}</b></div>
                </div>
            </div>`).join('') : '<p style="padding:20px;">No similar products found.</p>';
    }
};

// ---------------------------
// EVENT LISTENERS (CLICK)
// ---------------------------
document.addEventListener('click', (e) => {
    if (e.target.id === 'openModal') {
        modal.style.display = "flex";
        document.getElementById("loginView").style.display = "block";
        document.getElementById("signupView").style.display = "none";
        document.getElementById("modalTitle").textContent = "Login";
    }
    if (e.target.id === 'closeModal') modal.style.display = "none";
    if (e.target.id === 'toSignup') {
        document.getElementById("loginView").style.display = "none";
        document.getElementById("signupView").style.display = "block";
        document.getElementById("modalTitle").textContent = "Create Account";
    }
    if (e.target.id === 'toLogin') {
        document.getElementById("signupView").style.display = "none";
        document.getElementById("loginView").style.display = "block";
        document.getElementById("modalTitle").textContent = "Login";
    }
    if (e.target.id === 'googleBtn' || e.target.closest('#googleBtn')) {
        signInWithPopup(auth, provider).then(() => modal.style.display = "none").catch(err => alert(err.message));
    }
    if (e.target.id === 'logout') signOut(auth).then(() => location.reload());
    if (e.target.classList.contains('logo') || e.target.classList.contains('back-btn')) showSection('home');

    const catItem = e.target.closest('.cat-item');
    if (catItem) {
        activeCat = catItem.dataset.cat;
        activeSubcat = '';
        document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
        catItem.classList.add('active');
        renderProducts();
    }
    if (e.target.classList.contains('subcat-item')) {
        activeSubcat = e.target.dataset.subcat;
        document.querySelectorAll('.subcat-item').forEach(i => i.classList.remove('active'));
        e.target.classList.add('active');
        renderProducts();
    }
    const menuBtn = e.target.closest('#userMenuBtn');
    const menu = document.getElementById('userMenuContent');
    if (menuBtn) menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
    else if (menu && !e.target.closest('.user-dropdown')) menu.style.display = 'none';
    if (e.target.id === 'goToProfile' || e.target.closest('#goToProfile')) showSection('profile');
    if (e.target.id === 'goToOrders' || e.target.closest('#goToOrders')) showSection('orders');
});

// ---------------------------
// AUTH SUBMIT ACTIONS
// ---------------------------
document.getElementById("loginSubmitAction").onclick = async () => {
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        modal.style.display = "none";
    } catch (e) { alert('Login error: ' + e.message); }
};

document.getElementById("signupSubmitAction").onclick = async () => {
    const firstName = document.getElementById("fname").value;
    const email = document.getElementById("semail").value;
    const pass = document.getElementById("spass").value;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", userCredential.user.uid), { displayName: firstName, email, createdAt: new Date().toISOString() });
        modal.style.display = "none";
    } catch (e) { alert('Signup error: ' + e.message); }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const userName = userData.displayName || "User";
                const isProfileComplete = userData.displayName && userData.phoneNumber && userData.address;
                document.getElementById("authSection").innerHTML = `
                    <div class="user-dropdown">
                        <div class="user-trigger" id="userMenuBtn">Hi, ${userName}! <i class="fa fa-chevron-down"></i></div>
                        <div class="dropdown-content" id="userMenuContent" style="display: none;">
                            <div class="menu-item" id="goToOrders"><i class="fa fa-box"></i> My Orders</div>
                            <div class="menu-item" id="goToProfile"><i class="fa fa-user"></i> Profile</div>
                            <div class="menu-item" id="logout"><i class="fa fa-sign-out-alt"></i> Logout</div>
                        </div>
                    </div>`;
                if (!isProfileComplete && !sessionStorage.getItem('profileSetupSkipped')) document.getElementById('profileSetupModal').style.display = 'flex';
                if(userData.displayName) document.getElementById('profDisplayName').value = userData.displayName;
                if(userData.phoneNumber) document.getElementById('profPhone').value = userData.phoneNumber;
            } else {
                await setDoc(doc(db, "users", user.uid), { email: user.email, displayName: user.displayName || "", createdAt: new Date().toISOString() });
                document.getElementById('profileSetupModal').style.display = 'flex';
            }
        } catch (e) { console.log(e); }
    } else {
        document.getElementById("authSection").innerHTML = `<button class="login-btn" id="openModal">Login</button>`;
    }
});

// ---------------------------
// PROFILE SAVING
// ---------------------------
document.getElementById('savePersonalInfo')?.addEventListener('click', async () => {
    const user = auth.currentUser; if (!user) return;
    const name = document.getElementById('profDisplayName').value;
    const phone = document.getElementById('profPhone').value;
    showLoading("Saving Profile Settings...");
    try {
        await updateDoc(doc(db, "users", user.uid), { displayName: name, phoneNumber: phone });
        showToast("Profile Updated!");
        setTimeout(() => location.reload(), 800);
    } catch (e) { hideLoading(); alert(e.message); }
});

document.getElementById('saveAddressInfo')?.addEventListener('click', async () => {
    const user = auth.currentUser; if (!user) return;
    
    const fields = {
        firstName: document.getElementById('profFirstName').value, 
        lastName: document.getElementById('profLastName').value,
        phone: document.getElementById('addrPhone').value, 
        address: document.getElementById('addrLine1').value,
        postalCode: document.getElementById('addrPostal').value,
        city: document.getElementById('addrCity').value,
        district: document.getElementById('addrDistrict').value,
        state: document.getElementById('addrState').value
    };

    // Validation: No field should be empty
    if (Object.values(fields).some(val => !val.trim())) {
        alert("Please fill in all address fields (District, State, etc.) correctly.");
        return;
    }

    showLoading("Saving Shipping Address...");
    const addressData = {
        ...fields,
        apartment: document.getElementById('addrLine2').value || "", 
        country: 'India'
    };
    try {
        await updateDoc(doc(db, "users", user.uid), { address: addressData });
        showToast("Address Saved!");
        setTimeout(() => location.reload(), 1000);
    } catch (e) { hideLoading(); alert(e.message); }
});

document.getElementById('updateProfileBtn')?.addEventListener('click', async () => {
    const user = auth.currentUser; if (!user) return;
    const name = document.getElementById('editDisplayName').value;
    const phone = document.getElementById('editPhone').value;
    showLoading("Updating Profile...");
    try {
        await updateDoc(doc(db, "users", user.uid), { displayName: name, phoneNumber: phone });
        showToast("Updates Saved!");
        setTimeout(() => location.reload(), 800);
    } catch (e) { hideLoading(); }
});

const loadProfileData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // UI Elements
    const pName = document.getElementById('editDisplayName');
    const pPhone = document.getElementById('editPhone');
    const addrBox = document.getElementById('currentAddress');

    try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const userData = docSnap.data();
            if(pName) pName.value = userData.displayName || "";
            if(pPhone) pPhone.value = userData.phoneNumber || "";
            
            if (userData.address && addrBox) {
                const a = userData.address;
                addrBox.innerHTML = `
                    <div style="padding:15px; background:#f9fbff; border:1px solid #e0eaff; border-radius:4px; text-align:left;">
                        <div style="font-weight:600; color:#212121;">${a.firstName} ${a.lastName}</div>
                        <p style="font-size:13px; color:#666; margin-top:5px;">${a.address}</p>
                        <p style="font-size:13px; color:#666;">${a.city}, ${a.district}, ${a.state} - ${a.postalCode}</p>
                        <p style="font-size:13px; color:#666;">Phone: ${a.phone}</p>
                    </div>
                `;
            } else if(addrBox) {
                addrBox.innerHTML = `<div class="empty-addr" style="padding:20px; background:#f5f5f5; border-radius:4px; text-align:center; color:#999;">No address saved.</div>`;
            }
        }
    } catch (e) { console.error("Error loading profile:", e); }
};

const isAddressComplete = (userData) => {
    if (!userData || !userData.address) return false;
    const a = userData.address;
    return (a.firstName && a.lastName && a.phone && a.address && a.postalCode && a.city && a.district && a.state);
};

document.getElementById('editAddressBtn')?.addEventListener('click', () => { 
    document.getElementById('modalManageSection').style.display = 'none'; 
    document.getElementById('profileSetupModal').style.display = 'flex'; 
});
document.getElementById('backToHome')?.addEventListener('click', () => showSection('home'));
document.getElementById('skipProfile')?.addEventListener('click', () => { sessionStorage.setItem('profileSetupSkipped', 'true'); document.getElementById('profileSetupModal').style.display = 'none'; });

// Helpers
const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
};

const showLoading = (msg = "Processsing...") => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) { overlay.querySelector('p').textContent = msg; overlay.style.display = 'flex'; }
};
const hideLoading = () => { const overlay = document.getElementById('loadingOverlay'); if (overlay) overlay.style.display = 'none'; };

window.showPolicy = (type) => {
    const modal = document.getElementById('policyModal');
    const title = document.getElementById('policyTitle');
    const content = document.getElementById('policyContent');
    if (!modal || !title || !content) return;

    if (type === 'cancellation') {
        title.innerText = "Order Cancellation Policy";
        content.innerHTML = `
            <p><strong>Time Window:</strong> Stallcart allows users to cancel their orders within <b>24 hours</b> from the time of order placement. This gives you time to review your purchase and make changes if necessary.</p>
            <p><strong>Cancellation Process:</strong> To cancel, simply go to your "My Orders" section and click on the "Request Cancellation" button. Once submitted, your request will be reviewed by our admin team.</p>
            <p><strong>Refunds for Cancelled Orders:</strong> Once a cancellation is approved, we initiate the refund process immediately. The refund will be credited to your original payment method (bank account, credit card, or wallet) within <b>24-48 hours</b> depending on your bank's processing time.</p>
            <p><strong>Post-Shipping Cancellations:</strong> Orders cannot be cancelled once they have been shipped. In such cases, you must initiate a standard Return after receiving the product.</p>
        `;
    } else if (type === 'return') {
        title.innerText = "Easy Return Policy";
        content.innerHTML = `
            <p><strong>Return Window:</strong> We offer a direct <b>7-day return policy</b> from the date of delivery. If you are not satisfied with your purchase, you can return it for a refund or replacement.</p>
            <p><strong>Conditions for Return:</strong> Items must be returned in their original condition: unworn, unwashed, and with all original tags and packaging intact. Products showing signs of use or damage will not be eligible for returns.</p>
            <p><strong>Return Process:</strong> To return a product, please email <b>stallcart.in@gmail.com</b> with your Order ID and an image of the product. Our logistics partner will pick up the item within 48 hours of approval.</p>
            <p><strong>Non-returnable Items:</strong> For hygiene reasons, innerwear, essentials, and personalized jewelry may not be eligible for returns unless they are received in a damaged condition.</p>
        `;
    } else if (type === 'terms') {
        title.innerText = "Terms & Conditions";
        content.innerHTML = `
            <p><strong>Ownership:</strong> The website stallcart.in is owned and operated by <b>Manish Kumar Jaiswal</b>. All trademarks, service marks, and trade names are proprietary to the owner.</p>
            <p><strong>Agreement to Terms:</strong> By accessing and using our website, you agree to comply with and be bound by these Terms and Conditions. These terms apply to all visitors and users of the site.</p>
            <p><strong>Order Acceptance:</strong> Stallcart reserves the right to decline or cancel any order for reasons such as product unavailability, pricing errors, or suspicion of fraudulent activity. You will be notified immediately of any such cancellation.</p>
            <p><strong>Accuracy of Information:</strong> You are responsible for providing correct shipping and contact information. Stallcart is not liable for failed deliveries due to incorrect details provided by the user.</p>
            <p><strong>Governing Law:</strong> All transactions and legal matters shall be governed by the laws of <b>Uttar Pradesh, India</b>.</p>
        `;
    } else if (type === 'privacy') {
        title.innerText = "Privacy Policy";
        content.innerHTML = `
            <p><strong>Data Collection:</strong> We collect personal information such as your name, email address, phone number, and physical shipping address solely to process your orders and provide a personalized shopping experience.</p>
            <p><strong>Data Usage:</strong> Your information is used only for fulfilling orders, providing customer support, and sending promotional updates (if you opt-in). We do not use your personal details for any other purpose.</p>
            <p><strong>Third-Party Sharing:</strong> We value your privacy. Stallcart <b>never</b> sells or shares your personal data with third-party marketing agencies. We only share necessary details (Name/Address) with our logistics and payment partners to complete your transaction.</p>
            <p><strong>Data Security:</strong> We use industry-standard encryption and Firebase Secure Store to protect your sensitive information from unauthorized access.</p>
            <p><strong>Cookies:</strong> Our website uses cookies to remember your login status and shopping cart items, ensuring a smooth and fast browsing experience.</p>
        `;
    }

    modal.style.display = 'flex';
};

function startTimer() {
    let timeLeft = 24 * 3600;
    const timerElement = document.getElementById("dealsTimer");
    if (!timerElement) return;
    
    // Change container innerHTML to allow for separate boxes
    setInterval(() => {
        timeLeft--; if (timeLeft < 0) timeLeft = 24 * 3600;
        const h = Math.floor(timeLeft / 3600).toString().padStart(2, '0');
        const m = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        
        timerElement.innerHTML = `
            <div class="timer-container">
                <span class="time-box">${h}</span>
                <span class="timer-sep">:</span>
                <span class="time-box">${m}</span>
                <span class="timer-sep">:</span>
                <span class="time-box">${s}</span>
            </div>
        `;
    }, 1000);
}

async function handleBuyNow(product) {
    const user = auth.currentUser; if (!user) { modal.style.display = "block"; return; }
    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data();
        if (!isAddressComplete(userData)) { alert('First complete your shipping address!'); document.getElementById('profileSetupModal').style.display = 'flex'; return; }
        const deliveryOtp = Math.floor(100000 + Math.random() * 900000);
        const orderData = { userId: user.uid, userName: userData.displayName, userEmail: user.email, address: userData.address, productId: product.id, productTitle: product.title || product.name, productPrice: product.price, productImage: product.imageUrl || product.img, orderDate: new Date().toISOString(), status: 'Ordered', deliveryOtp: deliveryOtp, deliveryEstimate: getDeliveryDate(12) };
        await addDoc(collection(db, "orders"), orderData);
        alert('Congratulations! Your order has been placed.');
        showSection('home');
    } catch (e) { alert(e.message); }
}

// ---------------------------
// Store Banner config from Firestore
// ---------------------------
const loadBannerConfig = async () => {
    try {
        const docSnap = await getDoc(doc(db, "storeConfig", "homeBanner"));
        const bannerBox = document.getElementById('promoBanner');
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Text Elements
            if (data.topBadge && document.getElementById('bannerTopBadge')) document.getElementById('bannerTopBadge').innerText = data.topBadge;
            if (data.badge && document.getElementById('bannerBadge')) document.getElementById('bannerBadge').innerText = data.badge;
            if (data.title && document.getElementById('bannerTitle')) document.getElementById('bannerTitle').innerHTML = data.title;
            if (data.desc && document.getElementById('bannerDesc')) document.getElementById('bannerDesc').innerText = data.desc;
            if (data.btnText && document.getElementById('bannerActionBtn')) document.getElementById('bannerActionBtn').innerText = data.btnText;
            if (data.limitedTag && document.getElementById('bannerLimitedTag')) document.getElementById('bannerLimitedTag').innerText = data.limitedTag;
            
            // Button Link
            if (data.btnLink && document.getElementById('bannerActionBtn')) {
                document.getElementById('bannerActionBtn').onclick = () => {
                   if (data.btnLink.startsWith('http')) window.open(data.btnLink, '_blank');
                   else showSection(data.btnLink);
                };
            }
            
            // Background Image
            if (data.bgUrl && bannerBox) {
                bannerBox.style.backgroundImage = `linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 100%), url('${data.bgUrl}')`;
            }
        }
    } catch (e) { console.error("Error loading banner config:", e); }
};

async function loadStoreDeals() {
    loadBannerConfig();
    try {
        const snap = await getDoc(doc(db, "config", "deals"));
        if (snap.exists()) {
            const data = snap.data();
            const bar = document.getElementById('announcementBar');
            
            if (bar && data.topBar) {
                bar.innerText = data.topBar;
                bar.style.display = 'block';
            }
        }
    } catch (e) { console.log('Deals sync error:', e); }
}

const smoothScrollToDeals = () => {
    const section = document.getElementById('dynamicSection');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
};

const renderMainCategories = () => {
    const nav = document.getElementById('mainCatsNav');
    if(!nav) return;
    const topOffers = `<div class="cat-item ${activeCat === 'top' ? 'active' : ''}" data-cat="top" onclick="window.activeCat='top'; window.activeSubCat='top'; renderMainCategories(); renderProducts(); smoothScrollToDeals();">
        <img src="https://rukminim1.flixcart.com/flap/128/128/image/f15c02bfeb02d15d.png?q=100" alt="Deals">
        <span>Top Offers</span>
    </div>`;
    const otherCats = categories.map(cat => `
        <div class="cat-item ${activeCat === cat.id ? 'active' : ''}" data-cat="${cat.id}">
            <img src="${cat.icon || 'https://rukminim1.flixcart.com/flap/128/128/image/82b3ca5fb2301045.png?q=100'}" alt="${cat.label}">
            <span>${cat.label} <i class="fa fa-chevron-down" style="font-size:10px;"></i></span>
            <div class="subcat-flyout">
                ${(cat.subCategories || []).map(sub => `
                    <div class="flyout-item" onclick="event.stopPropagation(); window.activeCat='${cat.id}'; window.activeSubcat='${sub.id}'; renderMainCategories(); renderProducts(); smoothScrollToDeals();">
                        ${sub.label}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    nav.innerHTML = topOffers + otherCats;
    
    // Category click
    nav.querySelectorAll('.cat-item').forEach(item => {
        if (!item.hasAttribute('onclick')) {
            item.onclick = (e) => {
                const cat = e.currentTarget.dataset.cat;
                window.activeCat = cat;
                window.activeSubcat = ''; // Clear sub-category to show ALL on main category click
                renderMainCategories();
                renderProducts();
                smoothScrollToDeals();
            };
        }
    });

    // Shop Now Scroll
    const shopNowBtn = document.querySelector('.banner-action-btn');
    if (shopNowBtn) shopNowBtn.onclick = smoothScrollToDeals;
};

fetchData();
loadStoreDeals();
startTimer();

window.toggleReadMore = (btn) => {
    const wrapper = btn.closest('.read-more-wrapper');
    const content = wrapper.querySelector('.desc-content');
    content.classList.toggle('open');
    if (content.classList.contains('open')) {
        btn.innerHTML = 'READ LESS <i class="fa fa-chevron-up"></i>';
    } else {
        btn.innerHTML = 'READ MORE <i class="fa fa-chevron-down"></i>';
    }
};
