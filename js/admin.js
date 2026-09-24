// --- KANBAN DATA & LOGIC ---
const formatPrice = (price) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price);

const defaultOrders = [
    {
        id: "RKY-1001",
        customer: "Juan Pérez",
        address: "Av. Alem 123, Bahía Blanca",
        timestamp: Date.now() - (12 * 60 * 1000),
        status: "pending",
        items: [
            { name: "Rocky Clásica", qty: 1, basePrice: 4500, unitPrice: 5000, extras: ["Extra Cheddar"] },
            { name: "Coca Cola 1.5L", qty: 1, basePrice: 2000, unitPrice: 2000, extras: [] }
        ],
        shipping: 500,
        total: 7500
    },
    {
        id: "RKY-1002",
        customer: "María Gómez",
        address: "Zapiola 450, Bahía Blanca",
        timestamp: Date.now() - (2 * 60 * 1000),
        status: "pending",
        items: [
            { name: "Pizza Muzzarella", qty: 2, basePrice: 7000, unitPrice: 7000, extras: [] }
        ],
        shipping: 500,
        total: 14500
    }
];

let orders = [];
let isSoundEnabled = true;

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    const icon = document.getElementById('sound-icon');
    const btn = document.getElementById('sound-toggle-btn');
    if (isSoundEnabled) {
        icon.setAttribute('data-lucide', 'bell');
        btn.style.color = 'var(--text-muted)';
    } else {
        icon.setAttribute('data-lucide', 'bell-off');
        btn.style.color = 'var(--primary)';
    }
    lucide.createIcons();
}

let isNotificationsEnabled = false;

function checkNotificationStatus() {
    if (!("Notification" in window)) return;
    const btn = document.getElementById('notify-toggle-btn');
    const icon = document.getElementById('notify-icon');
    if (!btn || !icon) return;
    
    if (Notification.permission === "granted") {
        isNotificationsEnabled = true;
        btn.style.color = 'var(--primary)';
    } else {
        isNotificationsEnabled = false;
        btn.style.color = 'var(--text-muted)';
    }
}

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("Este navegador no soporta notificaciones de escritorio.");
        return;
    }
    
    if (Notification.permission === "granted") {
        alert("Las notificaciones ya están habilitadas.");
        checkNotificationStatus();
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
            checkNotificationStatus();
            if (permission === "granted") {
                new Notification("¡Excelente!", { body: "Recibirás alertas cuando haya nuevos pedidos." });
            }
        });
    } else {
        alert("Las notificaciones fueron bloqueadas. Habilítalas desde la configuración de tu navegador.");
    }
}

function showNotification(title, body) {
    if (isNotificationsEnabled && Notification.permission === "granted") {
        try {
            new Notification(title, { body: body });
        } catch (e) {
            console.error("Error al mostrar notificación:", e);
        }
    }
}

function playDing() {
    if (!isSoundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volumen suave
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.error("Audio bloqueado:", e);
    }
}

function loadOrders() {
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive) {
        // Escuchar base de datos en vivo
        let isFirstLoad = true;
        db.collection("orders").onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added" && !isFirstLoad) {
                    const order = change.doc.data();
                    if (order.status === 'pending') {
                        playDing();
                        showNotification("¡Nuevo Pedido!", "Ha entrado un pedido de " + order.customer);
                    }
                }
            });
            isFirstLoad = false;
            
            const tempOrders = [];
            snapshot.forEach(doc => {
                tempOrders.push({ ...doc.data(), id: doc.id });
            });
            orders = tempOrders;
            renderBoard();
        });
    } else {
        // Fallback a LocalStorage
        console.warn("Firebase no activo. Usando LocalStorage para Pedidos.");
        const saved = localStorage.getItem('rocky_orders');
        if (saved) {
            orders = JSON.parse(saved);
        } else {
            orders = defaultOrders;
            saveOrders();
        }
        renderBoard(); // Llamada manual si es local
    }
}

function saveOrders() {
    if (!isFirebaseActive) {
        localStorage.setItem('rocky_orders', JSON.stringify(orders));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkNotificationStatus();
    loadOrders();
    loadCatalogManager();
    setInterval(renderBoard, 60000);
});

// Cerrar modales clickeando afuera
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });
});

function getMinutesElapsed(timestamp) { return Math.floor((Date.now() - timestamp) / 60000); }

function renderBoard() {
    const pending = orders.filter(o => o.status === 'pending');
    const prep = orders.filter(o => o.status === 'prep');
    const ready = orders.filter(o => o.status === 'ready');
    const done = orders.filter(o => o.status === 'done');

    document.getElementById('count-pending').innerText = pending.length;
    document.getElementById('count-prep').innerText = prep.length;
    document.getElementById('count-ready').innerText = ready.length;
    document.getElementById('count-done').innerText = done.length;

    renderList('list-pending', pending, 'prep');
    renderList('list-prep', prep, 'ready');
    renderList('list-ready', ready, 'done');
    renderList('list-done', done, null);
    
    calculateMetrics();
}

function calculateMetrics() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let totalRevenue = 0;
    let totalOrders = 0;
    
    orders.forEach(order => {
        if ((order.status === 'done' || order.status === 'archived') && order.timestamp >= today.getTime()) {
            totalRevenue += order.total || 0;
            totalOrders++;
        }
    });
    
    document.getElementById('metric-revenue').innerText = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalRevenue);
    document.getElementById('metric-orders').innerText = totalOrders;
}

function cancelOrder(id) {
    if (confirm('¿Estás seguro de cancelar/rechazar este pedido? Se notificará al cliente.')) {
        db.collection('orders').doc(id).update({ status: 'cancelled' }).then(() => {
            console.log("Pedido cancelado", id);
        });
    }
}

function archiveDoneOrders() {
    const doneOrders = orders.filter(o => o.status === 'done');
    if (doneOrders.length === 0) return;
    
    if (confirm('¿Archivar todos los pedidos entregados? Esto limpiará la columna para mantener el rendimiento.')) {
        const batch = db.batch();
        doneOrders.forEach(order => {
            const ref = db.collection('orders').doc(order.id);
            batch.update(ref, { status: 'archived' });
        });
        batch.commit().then(() => {
            console.log("Pedidos archivados");
        });
    }
}

function renderList(containerId, itemsList, nextStatus) {
    const container = document.getElementById(containerId);
    let html = '';
    itemsList.sort((a, b) => a.timestamp - b.timestamp);

    itemsList.forEach(order => {
        let itemsHtml = order.items.map(i => {
            let extraTxt = i.extras && i.extras.length > 0 ? ` <span style="color:var(--text-muted);font-size:0.75rem;">(+${i.extras.join(', ')})</span>` : '';
            return `<b>${i.qty}x</b> ${i.name}${extraTxt}`;
        }).join('<br>');
        
        let actionLabel = nextStatus === 'prep' ? 'A Cocina' : (nextStatus === 'ready' ? 'Listo' : 'Entregado');
        let iconNext = nextStatus === 'prep' ? 'chef-hat' : (nextStatus === 'ready' ? 'check' : 'truck');
        let mins = getMinutesElapsed(order.timestamp);
        let timeStr = mins < 1 ? 'Recién' : `Hace ${mins} min`;
        let alertClass = (order.status === 'pending' && mins >= 10) ? 'alert' : '';
        let priorityClass = nextStatus === 'prep' ? 'priority' : '';

        let actionButtons = '';
        if (nextStatus) {
            let cancelBtn = (order.status === 'pending' || order.status === 'prep') ? `<button class="btn btn-danger" onclick="event.stopPropagation(); cancelOrder('${order.id}')"><i data-lucide="x-circle" style="width:14px"></i></button>` : '';
            actionButtons = `
                ${cancelBtn}
                <button class="btn btn-print" onclick="event.stopPropagation(); printTicket('${order.id}')"><i data-lucide="printer" style="width:14px"></i> Ticket</button>
                <button class="btn btn-next" onclick="event.stopPropagation(); changeStatus('${order.id}', '${nextStatus}')"><i data-lucide="${iconNext}" style="width:14px"></i> ${actionLabel}</button>
            `;
        } else {
            actionButtons = `<button class="btn btn-print" onclick="event.stopPropagation(); printTicket('${order.id}')"><i data-lucide="printer" style="width:14px"></i> Reimprimir</button>`;
        }

        const date = new Date(order.timestamp);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let notesHtml = '';
        if (order.notes && order.notes.trim() !== '') {
            notesHtml = `<div style="background: #fff3cd; color: #856404; padding: 6px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 8px; border: 1px solid #ffeeba;">
                <strong style="display:flex; align-items:center; gap:4px;"><i data-lucide="message-square" style="width:12px;height:12px;"></i> Nota:</strong> ${order.notes}
            </div>`;
        }

        html += `
            <div class="order-card ${priorityClass} ${alertClass}" draggable="true" ondragstart="drag(event)" id="order-${order.id}">
                <div class="order-header">
                    <span class="order-id">#${order.id.split('-')[1] || order.id}</span>
                    <span class="order-time"><i data-lucide="clock" style="width:12px"></i> ${timeStr}</span>
                </div>
                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="cursor: pointer; color: var(--primary); display: flex; align-items: center; gap: 4px;" onclick="openCustomerModal('${order.id}')">
                        <i data-lucide="user" style="width:14px"></i> <u>${order.customer}</u>
                    </div>
                    <button class="btn" style="background: var(--bg-color); border: 1px solid var(--border-color); color: var(--text-muted); padding: 4px 8px;" onclick="openMessageModal('${order.id}')">
                        <i data-lucide="message-circle" style="width:14px"></i>
                    </button>
                </div>
                <div style="font-size: 0.8rem; color: #5E6C84; margin-bottom: 8px;"><i data-lucide="map-pin" style="width:12px"></i> ${order.address}</div>
                ${notesHtml}
                <div class="order-items">${itemsHtml}</div>
                <div class="order-actions">${actionButtons}</div>
            </div>
        `;
    });
    container.innerHTML = html;
    lucide.createIcons();
}

function changeStatus(id, newStatus) {
    const order = orders.find(o => o.id === id);
    if (order) {
        if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive) {
            db.collection("orders").doc(id).update({ status: newStatus })
              .catch(err => console.error("Error actualizando estado:", err));
        } else {
            order.status = newStatus;
            saveOrders();
            renderBoard();
        }
    }
}

function getOrder(id) { return orders.find(o => o.id === id); }

function openOrderModal(id) {
    const order = getOrder(id);
    if (!order) return;
    document.getElementById('modal-order-title').innerText = `Pedido #${order.id}`;
    
    let itemsHtml = order.items.map(item => {
        let extrasHtml = item.extras && item.extras.length > 0 ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">+ ${item.extras.join(', ')}</div>` : '';
        return `<div class="detail-item"><div style="display:flex; justify-content:space-between; align-items:flex-start;"><div><strong>${item.qty}x ${item.name}</strong>${extrasHtml}</div><strong>${formatPrice(item.unitPrice * item.qty)}</strong></div></div>`;
    }).join('');

    document.getElementById('modal-order-body').innerHTML = `
        <div class="detail-row"><span style="color:var(--text-muted)">Cliente</span><strong>${order.customer}</strong></div>
        <div class="detail-row"><span style="color:var(--text-muted)">Dirección</span><strong>${order.address}</strong></div>
        <div class="detail-row"><span style="color:var(--text-muted)">Estado</span><strong style="text-transform:uppercase; color:var(--primary)">${order.status}</strong></div>
        <div class="detail-items-list">${itemsHtml}</div>
        <div class="detail-row"><span>Subtotal</span><span>${formatPrice(order.total - order.shipping)}</span></div>
        <div class="detail-row"><span>Envío</span><span>${formatPrice(order.shipping)}</span></div>
        <div class="detail-row" style="font-size:1.2rem; font-weight:800; border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px;"><span>TOTAL</span><span style="color:var(--primary)">${formatPrice(order.total)}</span></div>
    `;
    document.getElementById('order-modal-overlay').classList.add('active');
}
function closeOrderModal() { document.getElementById('order-modal-overlay').classList.remove('active'); }


// --- CATALOG MANAGER LOGIC ---
let adminCatalog = [];

async function loadCatalogManager() {
    if (typeof db !== 'undefined') {
        try {
            const doc = await db.collection('settings').doc('catalog').get();
            if (doc.exists) {
                adminCatalog = doc.data().items || [];
            } else {
                adminCatalog = []; 
            }
        } catch (e) {
            console.error("Error loading catalog:", e);
            adminCatalog = [];
        }
    } else {
        adminCatalog = [];
    }
    renderCatalogManager();
}

async function saveCatalogManager() {
    try {
        await db.collection('settings').doc('catalog').set({ items: adminCatalog });
        renderCatalogManager();
        showToast("Catálogo guardado en la nube.");
    } catch (e) {
        console.error("Error al guardar catálogo", e);
        alert("Error al guardar catálogo. Asegúrate de iniciar sesión como usuario.");
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view-container').forEach(view => view.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    document.getElementById('view-' + tabId).classList.add('active');
    
    if (tabId === 'catalog') renderCatalogManager();
    if (tabId === 'settings') loadGlobalSettings();
}

function renderCatalogManager() {
    const container = document.getElementById('catalog-sections');
    let html = '';

    if (adminCatalog.length === 0) {
        html = '<p>No hay catálogo guardado. Abre la app del cliente primero para inicializar datos por defecto.</p>';
    } else {
        adminCatalog.forEach((cat, catIndex) => {
            let rowsHtml = cat.items.map((item, itemIndex) => {
                let optionsCount = 0;
                if (item.optionGroups) {
                    item.optionGroups.forEach(g => optionsCount += g.options ? g.options.length : 0);
                } else if (item.extras) {
                    optionsCount = item.extras.length;
                }
                
                return `
                <tr>
                    <td><strong>${item.name}</strong><div style="font-size:0.8rem;color:var(--text-muted);">${item.desc}</div></td>
                    <td>${formatPrice(item.price)}</td>
                    <td>${optionsCount} opciones</td>
                    <td style="text-align:right;">
                        <div class="action-btns" style="justify-content: flex-end;">
                            <button class="btn-icon" title="Gestionar Extras" onclick="openExtrasModalManager(${catIndex}, ${itemIndex})"><i data-lucide="layers" style="width:16px;"></i></button>
                            <button class="btn-icon" title="Editar Producto" onclick="openProductModal(${catIndex}, ${itemIndex})"><i data-lucide="edit-2" style="width:16px;"></i></button>
                            <button class="btn-icon" style="color: #FF5630;" title="Eliminar Producto" onclick="deleteProduct(${catIndex}, ${itemIndex})"><i data-lucide="trash-2" style="width:16px;"></i></button>
                        </div>
                    </td>
                </tr>
            `}).join('');

            html += `
                <div class="cat-section">
                    <div class="cat-header">
                        <span class="cat-title">${cat.category}</span>
                        <button class="btn btn-print" onclick="openProductModal(${catIndex}, null)"><i data-lucide="plus" style="width:14px"></i> Añadir Producto</button>
                    </div>
                    <table class="table-list">
                        <thead><tr><th>Producto</th><th>Precio Base</th><th>Extras</th><th></th></tr></thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            `;
        });
    }

    container.innerHTML = html;
    lucide.createIcons();
}

// -- Product Modal --
function openProductModal(catIndex, itemIndex) {
    document.getElementById('p-catIndex').value = catIndex;
    
    if (itemIndex !== null) {
        // Edit
        const item = adminCatalog[catIndex].items[itemIndex];
        document.getElementById('modal-product-title').innerText = "Editar Producto";
        document.getElementById('p-itemIndex').value = itemIndex;
        document.getElementById('p-name').value = item.name;
        document.getElementById('p-desc').value = item.desc;
        document.getElementById('p-price').value = item.price;
        document.getElementById('p-image').value = item.image;
    } else {
        // Create
        document.getElementById('modal-product-title').innerText = "Añadir Producto";
        document.getElementById('p-itemIndex').value = "";
        document.getElementById('product-form').reset();
    }
    
    document.getElementById('product-modal-overlay').classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal-overlay').classList.remove('active');
}

function saveProduct(e) {
    e.preventDefault();
    const catIndex = parseInt(document.getElementById('p-catIndex').value);
    const itemIndex = document.getElementById('p-itemIndex').value;
    
    const productData = {
        name: document.getElementById('p-name').value,
        desc: document.getElementById('p-desc').value,
        price: parseInt(document.getElementById('p-price').value),
        image: document.getElementById('p-image').value
    };

    if (itemIndex !== "") {
        // Update existing
        const idx = parseInt(itemIndex);
        productData.id = adminCatalog[catIndex].items[idx].id; // Keep original ID
        productData.optionGroups = adminCatalog[catIndex].items[idx].optionGroups || []; // Keep options
        if (adminCatalog[catIndex].items[idx].extras) {
            productData.extras = adminCatalog[catIndex].items[idx].extras; // Keep extras for legacy
        }
        adminCatalog[catIndex].items[idx] = productData;
    } else {
        // Create new
        productData.id = Date.now(); // Generate unique ID
        productData.optionGroups = [];
        adminCatalog[catIndex].items.push(productData);
    }

    saveCatalogManager();
    closeProductModal();
}

function deleteProduct(catIndex, itemIndex) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
        adminCatalog[catIndex].items.splice(itemIndex, 1);
        saveCatalogManager();
    }
}

// -- Category Modal --
function openCategoryModal() {
    document.getElementById('c-name').value = '';
    document.getElementById('category-modal-overlay').classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('category-modal-overlay').classList.remove('active');
}

function saveCategory() {
    const name = document.getElementById('c-name').value.trim();
    if (!name) return;
    
    adminCatalog.push({
        category: name,
        items: []
    });
    
    saveCatalogManager();
    closeCategoryModal();
}

// -- Options Modal --
let currentExtraCatIndex = null;
let currentExtraItemIndex = null;

function openExtrasModalManager(catIndex, itemIndex) {
    currentExtraCatIndex = catIndex;
    currentExtraItemIndex = itemIndex;
    
    const item = adminCatalog[catIndex].items[itemIndex];
    // Migrate old extras to optionGroups if needed
    if (item.extras && item.extras.length > 0 && !item.optionGroups) {
        item.optionGroups = [{
            id: 'g_' + Date.now(),
            name: 'Extras / Adicionales',
            type: 'checkbox',
            options: item.extras
        }];
        delete item.extras;
        saveCatalogManager();
    }
    
    if (!item.optionGroups) item.optionGroups = [];
    
    renderOptionGroupsList();
    document.getElementById('extras-modal-overlay').classList.add('active');
}

function closeExtrasModal() {
    document.getElementById('extras-modal-overlay').classList.remove('active');
}

function renderOptionGroupsList() {
    const container = document.getElementById('extras-list-container');
    const item = adminCatalog[currentExtraCatIndex].items[currentExtraItemIndex];
    
    if (!item.optionGroups || item.optionGroups.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No hay grupos de opciones para este producto.</p>';
        return;
    }

    let html = item.optionGroups.map((group, gIdx) => {
        let optionsHtml = group.options.map((opt, oIdx) => {
            let imgHtml = opt.image ? `<img src="${opt.image}" style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover; margin-right: 10px;">` : '';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; font-size: 0.85rem;">
                        ${imgHtml}
                        <span>${opt.name}</span> <span style="color:var(--primary); margin-left:10px;">+${formatPrice(opt.price)}</span>
                    </div>
                    <button class="btn-icon" style="color: #FF5630; padding: 2px;" onclick="deleteOption(${gIdx}, ${oIdx})"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
                </div>
            `;
        }).join('');

        return `
        <div style="background: var(--surface); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h5 style="margin:0;">${group.name} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(${group.type === 'radio' ? 'Única' : 'Múltiple'})</span></h5>
                <button class="btn-icon" style="color: #FF5630; padding: 4px;" onclick="deleteOptionGroup(${gIdx})"><i data-lucide="trash-2" style="width:16px;"></i></button>
            </div>
            <div style="margin-bottom: 15px;">
                ${optionsHtml || '<div style="font-size:0.8rem; color:var(--text-muted);">Sin opciones configuradas</div>'}
            </div>
            
            <div style="display: flex; gap: 8px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
                <input type="text" id="new-opt-name-${gIdx}" class="form-control" placeholder="Nombre opción" style="font-size: 0.8rem;">
                <input type="number" id="new-opt-price-${gIdx}" class="form-control" placeholder="$" style="width: 70px; font-size: 0.8rem;" value="0">
                <input type="url" id="new-opt-img-${gIdx}" class="form-control" placeholder="URL Img (Opcional)" style="width: 100px; font-size: 0.8rem;">
                <button type="button" class="btn btn-next" style="padding: 4px 8px; font-size:0.8rem;" onclick="addOptionToGroup(${gIdx})">Añadir</button>
            </div>
        </div>
    `}).join('');
    
    container.innerHTML = html;
    lucide.createIcons();
}

function addOptionGroup() {
    const nameInput = document.getElementById('new-group-name');
    const typeSelect = document.getElementById('new-group-type');
    
    if (!nameInput.value) return alert("Escribe un nombre para el grupo");

    adminCatalog[currentExtraCatIndex].items[currentExtraItemIndex].optionGroups.push({
        id: 'g_' + Date.now(),
        name: nameInput.value,
        type: typeSelect.value,
        options: []
    });
    
    nameInput.value = '';
    saveCatalogManager();
    renderOptionGroupsList();
}

function deleteOptionGroup(gIdx) {
    adminCatalog[currentExtraCatIndex].items[currentExtraItemIndex].optionGroups.splice(gIdx, 1);
    saveCatalogManager();
    renderOptionGroupsList();
}

function addOptionToGroup(gIdx) {
    const nameInput = document.getElementById(`new-opt-name-${gIdx}`);
    const priceInput = document.getElementById(`new-opt-price-${gIdx}`);
    const imageInput = document.getElementById(`new-opt-img-${gIdx}`);
    
    if (!nameInput.value || !priceInput.value) return alert("Completa nombre y precio");

    const newOpt = {
        id: 'o_' + Date.now(),
        name: nameInput.value,
        price: parseInt(priceInput.value)
    };
    
    if (imageInput.value.trim() !== '') {
        newOpt.image = imageInput.value.trim();
    }

    adminCatalog[currentExtraCatIndex].items[currentExtraItemIndex].optionGroups[gIdx].options.push(newOpt);
    
    saveCatalogManager();
    renderOptionGroupsList();
}

function deleteOption(gIdx, oIdx) {
    adminCatalog[currentExtraCatIndex].items[currentExtraItemIndex].optionGroups[gIdx].options.splice(oIdx, 1);
    saveCatalogManager();
    renderOptionGroupsList();
}
// --- Customer Info & Messaging ---
function openCustomerModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const phone = order.phone || 'No registrado';
    const hasPhone = order.phone && order.phone.length > 5;
    const wpMessage = encodeURIComponent(`Hola ${order.customer}, te escribimos de Punto Milanga por tu pedido #${order.id}. `);
    const wpLink = hasPhone ? `https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=${wpMessage}` : '#';
    
    const html = `
        <div style="margin-bottom: 15px;">
            <strong style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Nombre</strong>
            <div style="font-size: 1.1rem; font-weight: 600;">${order.customer}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <strong style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Dirección de Entrega</strong>
            <div style="font-size: 1rem;">${order.address}</div>
        </div>
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Teléfono</strong>
            <div style="font-size: 1rem;">${phone}</div>
        </div>
        ${hasPhone ? `
        <a href="${wpLink}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #25D366; color: white; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: 600;">
            <i data-lucide="message-circle" style="width: 20px;"></i> Enviar WhatsApp
        </a>` : ''}
    `;
    
    document.getElementById('customer-info-content').innerHTML = html;
    document.getElementById('customer-modal-overlay').classList.add('active');
    lucide.createIcons();
}

function closeCustomerModal() {
    document.getElementById('customer-modal-overlay').classList.remove('active');
}

function openMessageModal(orderId) {
    document.getElementById('message-order-id').value = orderId;
    document.getElementById('custom-message-text').value = '';
    document.getElementById('message-modal-overlay').classList.add('active');
}

function closeMessageModal() {
    document.getElementById('message-modal-overlay').classList.remove('active');
}

async function sendCustomMessage() {
    const orderId = document.getElementById('message-order-id').value;
    const msg = document.getElementById('custom-message-text').value;
    
    if (!msg.trim()) return alert("Por favor escribe un mensaje.");
    
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive) {
        try {
            await db.collection('orders').doc(orderId).update({
                customMessage: msg.trim()
            });
            alert("Notificación Push enviada al cliente exitosamente.");
            closeMessageModal();
        } catch (e) {
            console.error(e);
            alert("Error al enviar el mensaje. Revisa tu conexión a Firebase.");
        }
    } else {
        alert("Modo offline: No se puede enviar notificación push.");
        closeMessageModal();
    }
}

// --- WhatsApp Contacts Export ---
function openExportContactsModal() {
    // Extract unique valid phones
    const phoneMap = new Map();
    orders.forEach(order => {
        if (order.phone && order.phone.length > 6) {
            // Keep only numbers
            const cleanPhone = order.phone.replace(/[^0-9]/g, '');
            if (cleanPhone.length > 6) {
                // Store phone with latest customer name
                phoneMap.set(cleanPhone, order.customer || 'Cliente');
            }
        }
    });

    const contactsList = [];
    phoneMap.forEach((name, phone) => {
        contactsList.push(`${phone}, ${name}`);
    });
    
    contactsList.sort();

    const listText = contactsList.length > 0 ? contactsList.join('\n') : "No hay números registrados aún.";
    
    document.getElementById('contacts-list-text').value = listText;
    document.getElementById('contacts-modal-overlay').classList.add('active');
}

function closeContactsModal() {
    document.getElementById('contacts-modal-overlay').classList.remove('active');
}

function copyContactsList() {
    const textarea = document.getElementById('contacts-list-text');
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(textarea.value).then(() => {
        alert("¡Lista copiada al portapapeles!");
    }).catch(err => {
        console.error("Error al copiar: ", err);
    });
}

// --- CONFIGURACIÓN GLOBAL ---
async function loadGlobalSettings() {
    if (!isFirebaseActive) return;
    try {
        const doc = await db.collection('settings').doc('global').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.shippingBase !== undefined) document.getElementById('set-ship-base').value = data.shippingBase;
            if (data.shippingPerKm !== undefined) document.getElementById('set-ship-km').value = data.shippingPerKm;
            if (data.paymentAlias !== undefined) document.getElementById('set-payment-alias').value = data.paymentAlias;
            if (data.tgToken !== undefined) document.getElementById('set-tg-token').value = data.tgToken;
            if (data.tgChatId !== undefined) document.getElementById('set-tg-chat').value = data.tgChatId;
            if (data.bannerActive !== undefined) document.getElementById('set-banner-active').checked = data.bannerActive;
            if (data.bannerText !== undefined) document.getElementById('set-banner-text').value = data.bannerText;
        }
    } catch (error) {
        console.error("Error al cargar configuración", error);
    }
}

async function saveGlobalSettings() {
    if (!isFirebaseActive) return alert("Firebase no está activo.");
    
    const settingsData = {
        shippingBase: parseInt(document.getElementById('set-ship-base').value) || 0,
        shippingPerKm: parseInt(document.getElementById('set-ship-km').value) || 0,
        paymentAlias: document.getElementById('set-payment-alias').value.trim(),
        tgToken: document.getElementById('set-tg-token').value.trim(),
        tgChatId: document.getElementById('set-tg-chat').value.trim(),
        bannerActive: document.getElementById('set-banner-active').checked,
        bannerText: document.getElementById('set-banner-text').value.trim()
    };
    
    try {
        await db.collection('settings').doc('global').set(settingsData, { merge: true });
        alert("Configuración guardada correctamente.");
    } catch (error) {
        console.error("Error al guardar configuración", error);
        alert("Hubo un error al guardar.");
    }
}

