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
                <svg width="180" height="65" viewBox="0 0 180 65" style="margin: 0 auto 10px; display: block;">
                    <rect width="180" height="65" fill="white"/>
                    <text x="90" y="30" font-family="'Arial Black', 'Arial', sans-serif" font-size="28" font-weight="900" letter-spacing="1" text-anchor="middle" fill="black">PUNTO</text>
                    <text x="90" y="55" font-family="'Arial Black', 'Arial', sans-serif" font-size="22" font-weight="900" letter-spacing="3" text-anchor="middle" fill="black">MILANGA</text>
                </svg>
                <p>Bahía Blanca</p>
                <p>Tel: (291) 400-0000</p>
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
            
            <div class="ticket-totals">
                <div class="ticket-row">
                    <span>Subtotal:</span>
                    <span>${formatPrice(order.total - order.shipping)}</span>
                </div>
                <div class="ticket-row">
                    <span>Envío:</span>
                    <span>${formatPrice(order.shipping)}</span>
                </div>
                <div class="ticket-row total">
                    <span>TOTAL:</span>
                    <span>${formatPrice(order.total)}</span>
                </div>
            </div>
            
            <div class="ticket-footer">
                <p>¡Gracias por elegir a Punto Milanga!</p>
                <p>--</p>
            </div>
        </div>
    `;

    printArea.innerHTML = ticketHtml;

    // Trigger print
    // Pequeño timeout para que el DOM termine de renderizar el SVG
    setTimeout(() => {
        window.print();
    }, 100);
}
