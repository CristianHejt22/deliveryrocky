// Inicializar o cargar Catálogo desde localStorage
const defaultCatalog = [
    {
        category: "Hamburguesas",
        items: [
            { 
                id: 1, 
                name: "Rocky Clásica", 
                desc: "Medallón 180g, cheddar, lechuga, tomate y salsa Rocky.", 
                price: 4500, 
                image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80",
                extras: [
                    { id: 'e1', name: "Extra Cheddar", price: 500 },
                    { id: 'e2', name: "Bacon Crujiente", price: 700 },
                    { id: 'e3', name: "Medallón Extra", price: 1500 }
                ]
            },
            { 
                id: 2, 
                name: "Doble Bacon", 
                desc: "Doble medallón, cuádruple cheddar, bacon crujiente.", 
                price: 6200, 
                image: "https://images.unsplash.com/photo-1594212686865-eb79cb256b73?auto=format&fit=crop&w=300&q=80",
                extras: [
                    { id: 'e1', name: "Extra Cheddar", price: 500 },
                    { id: 'e3', name: "Medallón Extra", price: 1500 }
                ]
            },
            { 
                id: 3, 
                name: "Veggie Style", 
                desc: "Medallón NotCo, queso vegano, cebolla caramelizada.", 
                price: 5000, 
                image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=300&q=80",
                extras: []
            }
        ]
    },
    {
        category: "Pizzas",
        items: [
            { id: 4, name: "Muzzarella", desc: "Salsa de tomate, abundante muzzarella y orégano.", price: 7000, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", extras: [] },
            { id: 5, name: "Pepperoni", desc: "Muzzarella y pepperoni americano premium.", price: 8500, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=300&q=80", extras: [] }
        ]
    },
    {
        category: "Bebidas",
        items: [
            { id: 6, name: "Coca Cola 1.5L", desc: "Línea Coca Cola retornable o descartable.", price: 2000, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80", extras: [] },
            { id: 7, name: "Cerveza Artesanal", desc: "IPA, Amber o Stout - Pinta 500ml.", price: 2500, image: "https://images.unsplash.com/photo-1566804561066-51e44f84f3cc?auto=format&fit=crop&w=300&q=80", extras: [] }
        ]
    }
];

let catalog = [];

async function loadCatalog() {
    if (typeof db !== 'undefined') {
        try {
            const doc = await db.collection('settings').doc('catalog').get();
            if (doc.exists) {
                catalog = doc.data().items || [];
            } else {
                catalog = defaultCatalog;
                await db.collection('settings').doc('catalog').set({ items: catalog });
            }
        } catch (e) {
            console.error("Error loading catalog from Firestore:", e);
            catalog = defaultCatalog;
        }
    } else {
        catalog = defaultCatalog;
    }
}

// Estado de la aplicación
let cart = {};
let SHIPPING_COST = 500;
let currentUser = null;
let myOrdersUnsubscribe = null;

let appSettings = {
    shippingBase: 1490,
    shippingPerKm: 1250,
    paymentAlias: 'No configurado',
    tgToken: '',
    tgChatId: '',
    bannerActive: false,
    bannerText: ''
};

async function loadGlobalSettings() {
    if (typeof db !== 'undefined') {
        try {
            const doc = await db.collection('settings').doc('global').get();
            if (doc.exists) {
                appSettings = { ...appSettings, ...doc.data() };
                
                // Mostrar banner
                if (appSettings.bannerActive && appSettings.bannerText) {
                    const banner = document.getElementById('global-banner');
                    document.getElementById('global-banner-text').innerText = appSettings.bannerText;
                    banner.style.display = 'block';
                }
                
                // Mostrar Alias
                const aliasDisplay = document.getElementById('payment-alias-display');
                if(aliasDisplay) aliasDisplay.innerText = appSettings.paymentAlias;
            }
        } catch(e) {
            console.error("Error al cargar settings:", e);
        }
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();
    loadGlobalSettings();
    
    // Biometric App Lock Check
    if (localStorage.getItem('biometric_enabled') === 'true') {
        document.getElementById('app-lock-screen').style.display = 'flex';
        unlockAppWithBiometrics(); // Auto-prompt
    }
    
    // Auth Listener
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => {
            if (user) {
                // Usamos onSnapshot para que se actualice instantáneamente apenas se crea el perfil
                db.collection("users").doc(user.uid).onSnapshot(doc => {
                    if (doc.exists) {
                        currentUser = { uid: user.uid, email: user.email, ...doc.data() };
                    } else {
                        // Fallback por si el documento falló al guardarse
                        currentUser = { uid: user.uid, email: user.email, name: "Usuario Invitado", address: "Dirección pendiente", phone: "" };
                    }
                    
                    document.getElementById('profile-name').innerText = currentUser.name;
                    document.getElementById('profile-address').innerText = currentUser.address;
                    
                    // Cargar pedidos
                    if (!myOrdersUnsubscribe) listenToMyOrders(user.uid);
                    
                    // Solicitar notificaciones push y guardar el token
                    requestPushToken(user.uid);
                });
            } else {
                currentUser = null;
                if (myOrdersUnsubscribe) {
                    myOrdersUnsubscribe();
                    myOrdersUnsubscribe = null;
                }
            }
        });
    }
    
    // Simular carga
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
    }, 1500);

    renderCategories();
    renderCatalog();
});

// Renderizar Categorías
function renderCategories() {
    const container = document.getElementById('categories-list');
    let html = `<div class="category-chip active" onclick="filterCategory('Todas', this)">Todas</div>`;
    
    catalog.forEach(cat => {
        html += `<div class="category-chip" onclick="filterCategory('${cat.category}', this)">${cat.category}</div>`;
    });
    
    container.innerHTML = html;
}

// Filtrar Categoría
function filterCategory(categoryName, element) {
    document.querySelectorAll('.category-chip').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    renderCatalog(categoryName);
}

// Formatear moneda
const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price);
};

// Renderizar Catálogo
function renderCatalog(filter = 'Todas') {
    const container = document.getElementById('catalog-container');
    let html = '';
    let delay = 0;

    catalog.forEach(cat => {
        if (filter === 'Todas' || filter === cat.category) {
            html += `
                <div class="section-title">${cat.category}</div>
                <div class="products-grid" style="margin-bottom: 25px;">
            `;
            
            cat.items.forEach(item => {
                html += `
                    <div class="product-card" style="animation-delay: ${delay}s">
                        <img src="${item.image}" alt="${item.name}" class="product-image" loading="lazy">
                        <div class="product-info">
                            <div class="product-title">${item.name}</div>
                            <div class="product-desc">${item.desc}</div>
                            <div class="product-footer">
                                <span class="product-price">${formatPrice(item.price)}</span>
                                <button class="add-btn" onclick="openProductOptions(${item.id})">
                                    <i data-lucide="plus" style="width: 20px; height: 20px;"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                delay += 0.05;
            });
            
            html += `</div>`;
        }
    });

    container.innerHTML = html;
    lucide.createIcons();
}

// Encontrar producto por ID
function getProductById(id) {
    for (const cat of catalog) {
        const item = cat.items.find(i => i.id === id);
        if (item) return item;
    }
    return null;
}

// --- Lógica de Extras ---
let currentProductForExtras = null;
const extrasModalOverlay = document.getElementById('extras-modal-overlay');

function openProductOptions(id) {
    const product = getProductById(id);
    if (!product) return;

    // Backward compatibility & migration on the fly for client
    let groups = product.optionGroups || [];
    if (product.extras && product.extras.length > 0 && groups.length === 0) {
        groups = [{
            id: 'g_legacy',
            name: 'Adicionales',
            type: 'checkbox',
            options: product.extras
        }];
    }

    if (groups.length === 0) {
        // No extras, add directly
        addToCart(id, []);
        return;
    }

    // Prepare Extras Modal
    currentProductForExtras = product;
    document.getElementById('extras-modal-title').innerText = product.name;
    
    const container = document.getElementById('extras-container');
    let html = '';
    
    groups.forEach(group => {
        html += `<h4 style="padding: 0 20px; margin-top: 15px; margin-bottom: 10px; font-size: 1rem; color: var(--text-main);">${group.name} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">${group.type === 'radio' ? '(Elige 1)' : '(Opcional)'}</span></h4>`;
        html += '<div class="extras-grid">';
        
        group.options.forEach(opt => {
            let imgHtml = opt.image ? 
                `<div class="extra-card-img-container"><img src="${opt.image}" alt="${opt.name}" class="extra-card-img" loading="lazy"></div>` : 
                `<div class="extra-card-img-container"><i data-lucide="${group.type === 'radio' ? 'circle-dot' : 'plus-square'}" style="width:32px; height:32px; color:var(--text-muted); opacity:0.5;"></i></div>`;
            
            let inputType = group.type === 'radio' ? 'radio' : 'checkbox';
            let inputName = group.type === 'radio' ? `group_${group.id}` : `extra`;
            
            html += `
                <label class="extra-card-label">
                    <input type="${inputType}" name="${inputName}" class="opt-input" data-group-id="${group.id}" value="${opt.id}">
                    ${imgHtml}
                    <div class="extra-card-check"><i data-lucide="check" style="width:14px; stroke-width: 3px;"></i></div>
                    <div class="extra-card-info">
                        <div class="extra-card-name">${opt.name}</div>
                        <div class="extra-card-price">${opt.price > 0 ? '+' + formatPrice(opt.price) : 'Gratis'}</div>
                    </div>
                </label>
            `;
        });
        html += '</div>';
    });
    
    container.innerHTML = html;
    lucide.createIcons();
    
    extrasModalOverlay.classList.add('active');
}

function closeExtrasModal() {
    extrasModalOverlay.classList.remove('active');
    currentProductForExtras = null;
}

function confirmExtrasAndAdd() {
    if (!currentProductForExtras) return;
    
    let groups = currentProductForExtras.optionGroups || [];
    if (currentProductForExtras.extras && currentProductForExtras.extras.length > 0 && groups.length === 0) {
        groups = [{ id: 'g_legacy', type: 'checkbox', options: currentProductForExtras.extras }];
    }
    
    // Validate required groups (radio buttons)
    let valid = true;
    groups.forEach(g => {
        if (g.type === 'radio') {
            const checked = document.querySelector(`input[name="group_${g.id}"]:checked`);
            if (!checked) {
                valid = false;
                alert(`Debes seleccionar una opción para: ${g.name}`);
            }
        }
    });
    
    if (!valid) return;

    // Gather checked inputs
    const checkboxes = document.querySelectorAll('.opt-input:checked');
    const selectedExtrasIds = Array.from(checkboxes).map(cb => cb.value);
    
    addToCart(currentProductForExtras.id, selectedExtrasIds);
    closeExtrasModal();
}

// --- Carrito de compras ---
function addToCart(productId, selectedExtrasIds = []) {
    const product = getProductById(productId);
    
    // Map IDs to actual extra objects using optionGroups
    let selectedExtras = [];
    let groups = product.optionGroups || [];
    if (product.extras && product.extras.length > 0 && groups.length === 0) {
        groups = [{ id: 'g_legacy', type: 'checkbox', options: product.extras }];
    }
    
    if (selectedExtrasIds.length > 0) {
        groups.forEach(g => {
            if (g.options) {
                g.options.forEach(opt => {
                    if (selectedExtrasIds.includes(opt.id)) {
                        // Prepend group name for better display if it's not the legacy group
                        let displayName = g.id === 'g_legacy' ? opt.name : `${opt.name}`;
                        selectedExtras.push({ id: opt.id, name: displayName, price: opt.price });
                    }
                });
            }
        });
    }
    
    // Create unique Cart Item Key (e.g. "1_e1_e2")
    const extrasKey = selectedExtras.map(e => e.id).sort().join('_');
    const cartKey = `${productId}_${extrasKey}`;

    if (cart[cartKey]) {
        cart[cartKey].quantity += 1;
    } else {
        // Calculate unit price with extras
        const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
        
        cart[cartKey] = { 
            id: cartKey,
            productId: product.id,
            name: product.name,
            basePrice: product.price,
            unitPrice: product.price + extrasTotal,
            selectedExtras: selectedExtras,
            quantity: 1 
        };
    }
    
    // UI Feedback
    showToast("Agregado al carrito");
    bounceCartIcon();
    
    updateCartUI();
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="check-circle" style="width:16px;"></i> ${message}`;
    container.appendChild(toast);
    lucide.createIcons();
    
    // Remove element after animation finishes
    setTimeout(() => {
        if (container.contains(toast)) container.removeChild(toast);
    }, 3000);
}

function bounceCartIcon() {
    const icon = document.querySelector('.cart-icon-wrapper');
    if (icon) {
        icon.classList.remove('bounce-anim');
        void icon.offsetWidth; // Trigger reflow
        icon.classList.add('bounce-anim');
    }
}

function removeFromCart(cartKey) {
    if (cart[cartKey]) {
        cart[cartKey].quantity -= 1;
        if (cart[cartKey].quantity <= 0) {
            delete cart[cartKey];
        }
        updateCartUI();
    }
}

function updateCartUI() {
    const floatingCart = document.getElementById('floating-cart');
    const badge = document.getElementById('cart-badge');
    const totalEl = document.getElementById('cart-total-floating');
    
    let totalItems = 0;
    let totalPrice = 0;

    Object.values(cart).forEach(item => {
        totalItems += item.quantity;
        totalPrice += (item.unitPrice * item.quantity);
    });

    if (totalItems > 0) {
        floatingCart.classList.add('visible');
        badge.innerText = totalItems;
        totalEl.innerText = formatPrice(totalPrice);
    } else {
        floatingCart.classList.remove('visible');
        if(isModalOpen) toggleCart();
    }

    renderCartModal(totalPrice);
}

// --- Modal del Carrito ---
let isModalOpen = false;
const modalOverlay = document.getElementById('cart-modal-overlay');

async function checkout() {
    if (Object.keys(cart).length === 0) return alert('El carrito está vacío');
    
    if (!currentUser) {
        alert("Por favor, inicia sesión o regístrate para confirmar tu pedido.");
        toggleCart();
        openAuthModal();
        return;
    }
    
    const customer = currentUser.name;
    const phone = currentUser.phone || '';
    
    const addr1Radio = document.getElementById('radio-addr1');
    const selectedAddress = (addr1Radio && addr1Radio.checked) ? currentUser.address : (currentUser.address2 || currentUser.address);
    
    if (customer && selectedAddress) {
        const notes = document.getElementById('cart-notes').value;
        const subtotal = Object.values(cart).reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const orderData = {
            id: 'RKY-' + Math.floor(1000 + Math.random() * 9000),
            userId: currentUser.uid,
            customer: customer,
            address: selectedAddress,
            phone: phone,
            notes: notes,
            timestamp: Date.now(),
            status: 'pending',
            items: Object.values(cart).map(item => ({
                name: item.name,
                qty: item.quantity,
                basePrice: item.basePrice,
                unitPrice: item.unitPrice,
                extras: item.selectedExtras ? item.selectedExtras.map(e => e.name) : []
            })),
            shipping: SHIPPING_COST,
            total: subtotal + SHIPPING_COST
        };

        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive) {
            // Guardar en variable global y abrir modal de pago
            window.currentPendingOrderData = orderData;
            document.getElementById('cart-modal-overlay').classList.remove('active');
            document.getElementById('payment-modal-overlay').classList.add('active');
        } else {
            console.log("Offline mode, simulated order:", orderData);
            showToast("¡Pedido confirmado (Modo Offline)!");
            cart = {};
            updateCartUI();
            document.getElementById('cart-modal-overlay').classList.remove('active');
        }
    } else {
        showToast("Tu perfil está incompleto (Falta nombre o dirección).");
    }
}

// --- Payment & Telegram Flow ---
function closePaymentModal() {
    document.getElementById('payment-modal-overlay').classList.remove('active');
    document.getElementById('payment-file').value = '';
    document.getElementById('payment-file-name').innerText = 'Toca aquí para seleccionar tu comprobante';
    document.getElementById('btn-confirm-payment').style.opacity = '0.5';
    document.getElementById('btn-confirm-payment').style.pointerEvents = 'none';
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('payment-file-name').innerText = file.name;
        document.getElementById('btn-confirm-payment').style.opacity = '1';
        document.getElementById('btn-confirm-payment').style.pointerEvents = 'auto';
    }
}

async function uploadReceiptAndConfirm() {
    const fileInput = document.getElementById('payment-file');
    const file = fileInput.files[0];
    if (!file) return alert("Debes adjuntar el comprobante.");
    
    const orderData = window.currentPendingOrderData;
    if (!orderData) return alert("Error interno: No hay orden pendiente.");
    
    const btn = document.getElementById('btn-confirm-payment');
    btn.innerText = "Subiendo comprobante...";
    btn.style.pointerEvents = "none";
    
    // Subir a Telegram
    if (appSettings.tgToken && appSettings.tgChatId) {
        const formData = new FormData();
        formData.append('chat_id', appSettings.tgChatId);
        formData.append('caption', `🧾 Nuevo Pedido: ${orderData.id}\n👤 Cliente: ${orderData.customer}\n💰 Total: $${orderData.total}`);
        
        // Si es PDF, usar sendDocument. Si es imagen, sendPhoto.
        const endpoint = file.type === 'application/pdf' ? 'sendDocument' : 'sendPhoto';
        const fileParam = file.type === 'application/pdf' ? 'document' : 'photo';
        formData.append(fileParam, file);
        
        try {
            const tgResponse = await fetch(`https://api.telegram.org/bot${appSettings.tgToken}/${endpoint}`, {
                method: 'POST',
                body: formData
            });
            if (!tgResponse.ok) {
                console.error("Error Telegram:", await tgResponse.text());
                showToast("Aviso: No se pudo enviar el comprobante a Telegram, pero la orden se registrará.");
            }
        } catch (e) {
            console.error("Error subiendo a Telegram:", e);
        }
    }
    
    // Guardar en Firestore
    btn.innerText = "Confirmando pedido...";
    try {
        await db.collection("orders").doc(orderData.id).set(orderData);
        showToast("¡Pedido confirmado y enviado al local!");
        cart = {};
        document.getElementById('cart-notes').value = '';
        updateCartUI();
        closePaymentModal();
    } catch (error) {
        console.error("Error:", error);
        showToast("Error al confirmar el pedido.");
    } finally {
        btn.innerText = "Enviar Comprobante y Finalizar Pedido";
        btn.style.pointerEvents = "auto";
    }
}

function toggleCart() {
    if (Object.keys(cart).length === 0 && !isModalOpen) return;
    
    isModalOpen = !isModalOpen;
    if (isModalOpen) {
        modalOverlay.classList.add('active');
        modalOverlay.addEventListener('click', handleOverlayClick);
        
        // Prepare address selector if logged in
        if (currentUser) {
            document.getElementById('address-selector-container').style.display = 'block';
            document.getElementById('label-addr1').innerText = currentUser.address;
            if (currentUser.address2) {
                document.getElementById('label-addr2').innerText = currentUser.address2;
                document.getElementById('container-addr2').style.display = 'flex';
                
                // Re-evaluar selección actual
                const addr1Radio = document.getElementById('radio-addr1');
                const addr2Radio = document.getElementById('radio-addr2');
                
                if (!addr1Radio.checked && !addr2Radio.checked) {
                    addr1Radio.checked = true;
                }
            } else {
                document.getElementById('container-addr2').style.display = 'none';
                document.getElementById('radio-addr1').checked = true;
            }
            updateShippingCost();
        } else {
            document.getElementById('address-selector-container').style.display = 'none';
            SHIPPING_COST = appSettings.shippingBase || 1490;
            document.getElementById('cart-shipping').innerText = formatPrice(SHIPPING_COST);
        }
    } else {
        modalOverlay.classList.remove('active');
        modalOverlay.removeEventListener('click', handleOverlayClick);
    }
}

function handleOverlayClick(e) {
    if (e.target === modalOverlay) {
        toggleCart();
    }
}

function renderCartModal(subtotal) {
    const container = document.getElementById('cart-items');
    let html = '';

    if (Object.keys(cart).length === 0) {
        html = `<div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <i data-lucide="shopping-bag" style="width: 48px; height: 48px; opacity: 0.5; margin-bottom: 10px;"></i>
            <p>Tu carrito está vacío</p>
        </div>`;
    } else {
        Object.values(cart).forEach(item => {
            let extrasText = '';
            if (item.selectedExtras.length > 0) {
                extrasText = `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                    + ${item.selectedExtras.map(e => e.name).join(', ')}
                </div>`;
            }

            html += `
                <div class="cart-item">
                    <div class="item-details">
                        <div class="item-name">${item.name}</div>
                        ${extrasText}
                        <div class="item-price" style="margin-top: 4px;">${formatPrice(item.unitPrice)}</div>
                    </div>
                    <div class="item-controls">
                        <button class="qty-btn" onclick="removeFromCart('${item.id}')"><i data-lucide="minus" style="width: 16px;"></i></button>
                        <span class="item-qty">${item.quantity}</span>
                        <button class="qty-btn" onclick="addToCart(${item.productId}, ${JSON.stringify(item.selectedExtras.map(e=>e.id))})"><i data-lucide="plus" style="width: 16px;"></i></button>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
    
    document.getElementById('cart-subtotal').innerText = formatPrice(subtotal);
    const finalTotal = subtotal > 0 ? subtotal + SHIPPING_COST : 0;
    document.getElementById('cart-final-total').innerText = formatPrice(finalTotal);
    
    lucide.createIcons();
}

// --- Geolocation & Shipping Cost (Nominatim) ---
const STORE_LAT = -38.7135776; // Holdich 64
const STORE_LNG = -62.2754509;

async function getCoordinates(address) {
    try {
        const query = encodeURIComponent(`${address}, Bahía Blanca, Argentina`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch (e) {
        return null;
    }
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function updateShippingCost() {
    if (!currentUser) return;
    
    const addr1Radio = document.getElementById('radio-addr1');
    const selectedAddress = (addr1Radio && addr1Radio.checked) ? currentUser.address : currentUser.address2;
    
    if (!selectedAddress) return;

    document.getElementById('shipping-distance').innerText = '(Calculando...)';
    
    const coords = await getCoordinates(selectedAddress);
    
    const base = appSettings.shippingBase || 1490;
    const perKm = appSettings.shippingPerKm || 1250;
    
    if (coords) {
        const dist = haversine(STORE_LAT, STORE_LNG, coords.lat, coords.lng);
        SHIPPING_COST = Math.round(base + (dist * perKm));
        document.getElementById('shipping-distance').innerText = `(${dist.toFixed(1)} km)`;
    } else {
        SHIPPING_COST = base; // Fijo si no se encuentra
        document.getElementById('shipping-distance').innerText = '(Costo fijo)';
    }
    
    document.getElementById('cart-shipping').innerText = formatPrice(SHIPPING_COST);
    
    // Refresh totals
    const subtotal = Object.values(cart).reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const finalTotal = subtotal > 0 ? subtotal + SHIPPING_COST : 0;
    document.getElementById('cart-final-total').innerText = formatPrice(finalTotal);
}

// --- Auth & Profile ---
let authMode = 'login'; 

function openAuthModal() {
    document.getElementById('auth-modal-overlay').classList.add('active');
    if (currentUser) {
        document.getElementById('auth-view-login').style.display = 'none';
        document.getElementById('auth-view-register').style.display = 'none';
        document.getElementById('auth-view-forgot').style.display = 'none';
        document.getElementById('auth-view-edit-profile').style.display = 'none';
        document.getElementById('auth-view-profile').style.display = 'block';
        document.getElementById('auth-modal-title').innerText = "Mi Perfil";
    } else {
        authMode = 'login';
        updateAuthView();
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal-overlay').classList.remove('active');
}

function toggleAuthMode(mode) {
    if (mode) {
        authMode = mode;
    } else {
        authMode = authMode === 'login' ? 'register' : 'login';
    }
    updateAuthView();
}

function updateAuthView() {
    document.getElementById('auth-view-profile').style.display = 'none';
    document.getElementById('auth-view-login').style.display = 'none';
    document.getElementById('auth-view-register').style.display = 'none';
    document.getElementById('auth-view-forgot').style.display = 'none';
    document.getElementById('auth-view-edit-profile').style.display = 'none';

    if (authMode === 'login') {
        document.getElementById('auth-view-login').style.display = 'block';
        document.getElementById('auth-modal-title').innerText = "Iniciar Sesión";
    } else if (authMode === 'register') {
        document.getElementById('auth-view-register').style.display = 'block';
        document.getElementById('auth-modal-title').innerText = "Crear Cuenta";
    } else if (authMode === 'forgot') {
        document.getElementById('auth-view-forgot').style.display = 'block';
        document.getElementById('auth-modal-title').innerText = "Recuperar Contraseña";
    } else if (authMode === 'profile') {
        document.getElementById('auth-view-profile').style.display = 'block';
        document.getElementById('auth-modal-title').innerText = "Mi Perfil";
    } else if (authMode === 'edit-profile') {
        document.getElementById('auth-view-edit-profile').style.display = 'block';
        document.getElementById('auth-modal-title').innerText = "Editar Perfil";
        
        // Populate inputs
        if (currentUser) {
            document.getElementById('edit-name').value = currentUser.name || '';
            document.getElementById('edit-phone').value = currentUser.phone || '';
            document.getElementById('edit-address').value = currentUser.address || '';
            document.getElementById('edit-address2').value = currentUser.address2 || '';
        }
    }
}

async function handleAuthSubmit(mode) {
    if (!isFirebaseActive || typeof auth === 'undefined') {
        return showToast("Firebase no está configurado.");
    }
    
    try {
        if (mode === 'login') {
            const email = document.getElementById('auth-email').value;
            const pass = document.getElementById('auth-password').value;
            if(!email || !pass) return showToast("Por favor, completa todos los datos.");
            
            await auth.signInWithEmailAndPassword(email, pass);
            showToast("Sesión iniciada correctamente.");
            closeAuthModal();
        } else {
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            const name = document.getElementById('reg-name').value;
            const address = document.getElementById('reg-address').value;
            const address2 = document.getElementById('reg-address2').value;
            const phone = document.getElementById('reg-phone').value;
            
            if(!name || !address || !email || !pass || !phone) return showToast("Por favor, completa todos los campos principales (incluyendo teléfono y dirección 1).");
            
            const cred = await auth.createUserWithEmailAndPassword(email, pass);
            await db.collection("users").doc(cred.user.uid).set({
                name: name,
                address: address,
                address2: address2,
                phone: phone,
                email: email
            });
            showToast("¡Cuenta creada exitosamente!");
            closeAuthModal();
        }
    } catch (e) {
        console.error(e);
        let errorMsg = "Error de autenticación";
        if (e.code === 'auth/user-not-found') errorMsg = "No existe una cuenta con este correo.";
        if (e.code === 'auth/wrong-password') errorMsg = "Contraseña incorrecta.";
        if (e.code === 'auth/email-already-in-use') errorMsg = "El correo ya está registrado.";
        if (e.code === 'auth/weak-password') errorMsg = "La contraseña debe tener al menos 6 caracteres.";
        
        showToast(errorMsg);
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('forgot-email').value;
    if (!email) return showToast("Por favor, ingresa tu correo electrónico.");
    
    try {
        await auth.sendPasswordResetEmail(email);
        showToast("Te hemos enviado un correo para restablecer tu contraseña.");
        toggleAuthMode('login');
    } catch (e) {
        console.error(e);
        let errorMsg = "Error al enviar correo.";
        if (e.code === 'auth/user-not-found') errorMsg = "No existe una cuenta con este correo.";
        showToast(errorMsg);
    }
}

async function saveProfileChanges() {
    if (!currentUser || !isFirebaseActive) return;

    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;
    const address = document.getElementById('edit-address').value;
    const address2 = document.getElementById('edit-address2').value;

    if (!name || !phone || !address) {
        return showToast("El nombre, teléfono y la Dirección 1 son obligatorios.");
    }

    try {
        await db.collection('users').doc(currentUser.uid).set({
            name: name,
            phone: phone,
            address: address,
            address2: address2
        }, { merge: true });
        showToast("Datos actualizados correctamente.");
        toggleAuthMode('profile');
    } catch (error) {
        console.error(error);
        showToast("Error al actualizar los datos.");
    }
}

function logout() {
    auth.signOut();
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_cred_id');
    showToast("Sesión cerrada");
    closeAuthModal();
}

function forceLogout() {
    if (typeof auth !== 'undefined') auth.signOut();
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_cred_id');
    document.getElementById('app-lock-screen').style.display = 'none';
}

// --- Mis Pedidos (Real-time Tracking) ---
function listenToMyOrders(uid) {
    if (!isFirebaseActive || typeof db === 'undefined') return;
    
    myOrdersUnsubscribe = db.collection('orders')
        .where('userId', '==', uid)
        .onSnapshot(snapshot => {
            const container = document.getElementById('my-orders-list');
            if (snapshot.empty) {
                container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin: 10px 0;">No tienes pedidos recientes.</p>';
                return;
            }
            
            const myOrders = [];
            snapshot.forEach(doc => myOrders.push(doc.data()));
            myOrders.sort((a,b) => b.timestamp - a.timestamp);
            
            let historyHtml = '';
            let activeHtml = '';
            let hasActive = false;
            
            myOrders.slice(0, 10).forEach(order => {
                const statusColors = {
                    pending: 'var(--text-muted)',
                    preparing: 'var(--primary)',
                    ready: '#28a745',
                    delivered: '#6c757d',
                    done: '#6c757d',
                    archived: '#6c757d',
                    cancelled: '#dc3545'
                };
                const statusNames = {
                    pending: 'Pendiente',
                    preparing: 'Preparando',
                    ready: 'Listo',
                    delivered: 'Entregado',
                    done: 'Entregado',
                    archived: 'Entregado',
                    cancelled: 'Cancelado'
                };
                
                const time = new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const color = statusColors[order.status] || 'var(--text-muted)';
                const name = statusNames[order.status] || order.status;
                
                // History List (Profile)
                historyHtml += `
                <div style="background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 600; font-size: 0.9rem;">Pedido ${order.id.split('-')[1]}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${time} • ${formatPrice(order.total)}</div>
                    </div>
                    <div style="background: ${color}20; color: ${color}; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; display:flex; align-items:center; gap:4px;">
                        ${order.status === 'preparing' ? '<i data-lucide="chef-hat" style="width:12px;height:12px;"></i>' : ''}
                        ${name}
                    </div>
                </div>
                `;
                
                // Active Tracker (Main Page)
                if (['pending', 'preparing', 'ready'].includes(order.status)) {
                    hasActive = true;
                    const isPrep = order.status === 'preparing' || order.status === 'ready';
                    const isReady = order.status === 'ready';
                    
                    let customMsgHtml = '';
                    if (order.customMessage) {
                        customMsgHtml = `
                        <div class="tracker-message">
                            <i data-lucide="message-circle" style="width: 16px; flex-shrink: 0;"></i>
                            <span>${order.customMessage}</span>
                        </div>`;
                    }
                    
                    activeHtml += `
                    <div class="order-tracker-card">
                        <div class="order-tracker-header">
                            <span>Pedido ${order.id.split('-')[1]}</span>
                            <span style="color: ${color};">${name}</span>
                        </div>
                        <div class="tracker-stepper">
                            <div class="tracker-step ${true ? 'completed' : ''}">
                                <div class="tracker-icon"><i data-lucide="check"></i></div>
                                <span>Recibido</span>
                            </div>
                            <div class="tracker-step ${isPrep ? (isReady ? 'completed' : 'active') : ''}">
                                <div class="tracker-icon"><i data-lucide="flame"></i></div>
                                <span>Cocina</span>
                            </div>
                            <div class="tracker-step ${isReady ? 'active' : ''}">
                                <div class="tracker-icon"><i data-lucide="shopping-bag"></i></div>
                                <span>Retiro</span>
                            </div>
                        </div>
                        ${customMsgHtml}
                    </div>`;
                }
            });
            
            container.innerHTML = historyHtml;
            
            const activeContainer = document.getElementById('active-orders-container');
            const activeList = document.getElementById('active-orders-list');
            if (activeContainer && activeList) {
                if (hasActive) {
                    activeContainer.style.display = 'block';
                    activeList.innerHTML = activeHtml;
                } else {
                    activeContainer.style.display = 'none';
                    activeList.innerHTML = '';
                }
            }
            
            lucide.createIcons();
        }, err => {
            console.error("Error al escuchar pedidos:", err);
        });
}

// --- Biometría (WebAuthn Passkeys locales) ---
async function setupBiometric() {
    if (!window.PublicKeyCredential) {
        return alert("Tu dispositivo o navegador no soporta biometría o HTTPS.");
    }
    
    // Necesitamos que localhost o HTTPS para WebAuthn.
    // Si falla, es probable que se deba a no estar en un contexto seguro.
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const pubKeyCredParams = [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 } // RS256
        ];

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { name: "Punto Milanga", id: window.location.hostname },
                user: {
                    id: userId,
                    name: currentUser.email,
                    displayName: currentUser.name
                },
                pubKeyCredParams,
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                },
                timeout: 60000
            }
        });

        if (credential) {
            localStorage.setItem('biometric_enabled', 'true');
            const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
            localStorage.setItem('biometric_cred_id', rawIdBase64);
            
            showToast("Biometría activada con éxito.");
            document.getElementById('btn-setup-biometric').innerText = "Biometría Activada";
            document.getElementById('btn-setup-biometric').style.background = "#28a745";
        }
    } catch (e) {
        console.error("Error Biometría:", e);
        alert("No se pudo configurar la biometría (Requiere HTTPS o Localhost): " + e.message);
    }
}

async function unlockAppWithBiometrics() {
    try {
        const rawIdBase64 = localStorage.getItem('biometric_cred_id');
        if(!rawIdBase64) throw new Error("No hay credencial guardada");
        
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const rawId = Uint8Array.from(atob(rawIdBase64), c => c.charCodeAt(0));

        await navigator.credentials.get({
            publicKey: {
                challenge,
                allowCredentials: [{
                    id: rawId,
                    type: 'public-key'
                }],
                userVerification: "required"
            }
        });
        
        document.getElementById('app-lock-screen').style.display = 'none';
        showToast("App desbloqueada");
        
    } catch (e) {
        console.error("Error al desbloquear:", e);
        // Silencioso o muestra un error según UX, permitiendo reintentar.
    }
}

// ---------------- FCM Push Notifications ----------------
async function requestPushToken(uid) {
    if (typeof messaging === 'undefined') return;
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await messaging.getToken({
                vapidKey: 'BGB2kJGFDHvjdQc6uHufq6VWBf0-AJ0wv0dr1WgjJ7rOOxRm_cwCk5WbHkqTK8qvsdhd4N8UDfdS6zTO_rRZb54' // Se enseñará cómo obtenerla en el Walkthrough
            });
            
            if (token) {
                console.log("FCM Token obtenido");
                // Guardar el token en el perfil del usuario en Firestore
                await db.collection('users').doc(uid).update({
                    fcmToken: token
                });
            }
        }
    } catch (e) {
        console.log("Error al pedir permiso para notificaciones o generar token: ", e);
    }
}
