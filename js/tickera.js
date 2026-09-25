/*
 * Tickera.js - Generador de Tickets de Impresión 58mm / 80mm
 */

function printTicket(orderId) {
    const order = getOrder(orderId);
    if (!order) return;

    const printArea = document.getElementById('ticket-print-area');
    
    // Formato Moneda
    const formatPrice = (price) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price);
    
    // Fecha actual formato DD/MM/YYYY
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = `${day}/${month}/${year} ${timeStr}`;

    let itemsHtml = '';
    order.items.forEach(item => {
        let extraText = item.extras && item.extras.length > 0 ? `<br><span style="font-size:0.8em; margin-left:5px;">+ ${item.extras.join(', ')}</span>` : '';
        let itemPrice = item.unitPrice || item.price || 0;
        itemsHtml += `
            <tr class="ticket-item-row">
                <td class="qty">${item.qty}</td>
                <td class="desc">${item.name}${extraText}</td>
                <td class="price">${formatPrice(itemPrice * item.qty)}</td>
            </tr>
        `;
    });

    const ticketHtml = `
        <div class="ticket">
            <div class="ticket-header" style="text-align: center;">
                <img src="img/logo.png" alt="Punto Milanga" style="max-width: 140px; height: auto; filter: grayscale(100%) contrast(300%) brightness(0%); margin: 0 auto 10px auto; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <p>Bahía Blanca</p>
                <p>Tel: 2915658321</p>
                <div class="ticket-divider"></div>
            </div>
            
            <div class="ticket-info">
                <p><b>Pedido:</b> #${order.id}</p>
                <p><b>Fecha:</b> ${dateStr}</p>
                <p><b>Cliente:</b> ${order.customer}</p>
                <p><b>Dirección:</b> ${order.address}</p>
            </div>
            
            <div class="ticket-divider"></div>
            
            <table class="ticket-items">
                <thead>
                    <tr>
                        <th class="qty">Cant</th>
                        <th class="desc">Item</th>
                        <th class="price">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div class="ticket-divider"></div>
            
            ${order.notes ? `<div style="padding: 10px 0; font-size: 14px;"><b>NOTA PARA COCINA:</b><br>${order.notes}</div><div class="ticket-divider"></div>` : ''}
            
            <table class="ticket-totals" style="width: 100%; border-collapse: collapse;">
                <tr class="ticket-row">
                    <td style="text-align: right; padding-right: 15px;">Subtotal:</td>
                    <td style="text-align: right; width: 35%;">${formatPrice(order.total - order.shipping)}</td>
                </tr>
                <tr class="ticket-row">
                    <td style="text-align: right; padding-right: 15px;">Envío:</td>
                    <td style="text-align: right; width: 35%;">${formatPrice(order.shipping)}</td>
                </tr>
                <tr class="ticket-row total">
                    <td style="text-align: right; padding-right: 15px; font-weight: bold; font-size: 18px; border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding-top: 10px; padding-bottom: 10px; margin-top: 5px;">TOTAL:</td>
                    <td style="text-align: right; width: 35%; font-weight: bold; font-size: 18px; border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding-top: 10px; padding-bottom: 10px; margin-top: 5px;">${formatPrice(order.total)}</td>
                </tr>
            </table>
            
            <div class="ticket-footer">
                <p>¡Gracias por elegir a Punto Milanga!</p>
                <p>--</p>
            </div>
        </div>
    `;

    printArea.innerHTML = ticketHtml;

    // Trigger print after image loads
    const logoImg = printArea.querySelector('img');
    if (logoImg) {
        if (logoImg.complete) {
            setTimeout(() => window.print(), 100);
        } else {
            logoImg.onload = () => setTimeout(() => window.print(), 100);
            logoImg.onerror = () => setTimeout(() => window.print(), 100);
        }
    } else {
        setTimeout(() => window.print(), 150);
    }
}

function printPromoTicket() {
    const printArea = document.getElementById('ticket-print-area');
    
    const promoHtml = `
        <div class="ticket" style="text-align: center; padding-top: 20px; padding-bottom: 20px;">
            <img src="img/logo.png" alt="Punto Milanga" style="max-width: 180px; height: auto; filter: grayscale(100%) contrast(300%) brightness(0%); margin: 0 auto 20px auto; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">¡Haz tu pedido por WhatsApp!</div>
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 22px; font-weight: 900; margin-top: 15px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                2915658321
            </div>
            
            <div class="ticket-divider" style="margin-top: 25px;"></div>
            <p style="font-size: 12px; font-weight: bold; margin-top: 10px;">¡Gracias por preferir Punto Milanga!</p>
        </div>
    `;

    printArea.innerHTML = promoHtml;

    const logoImg = printArea.querySelector('img');
    if (logoImg) {
        if (logoImg.complete) {
            setTimeout(() => window.print(), 100);
        } else {
            logoImg.onload = () => setTimeout(() => window.print(), 100);
            logoImg.onerror = () => setTimeout(() => window.print(), 100);
        }
    } else {
        setTimeout(() => window.print(), 150);
    }
}
