/*
 * Tickera.js - Generador de Tickets de Impresión 58mm / 80mm
 */

function printTicket(orderId) {
    const order = getOrder(orderId);
    if (!order) return;

    const printArea = document.getElementById('ticket-print-area');
    
    // Formato Moneda
    const formatPrice = (price) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price);
    
    // Fecha actual
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

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
                <img src="img/logo.png" alt="Punto Milanga" style="max-width: 140px; height: auto; filter: grayscale(100%) contrast(250%) brightness(80%); margin: 0 auto 10px auto; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
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
