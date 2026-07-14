// FIFA 2026 Ticket Booking & Seating Pathfinder State Engine

document.addEventListener('DOMContentLoaded', () => {
    // === App State ===
    const state = {
        activeTab: 'booking', // 'booking', 'tickets', 'pathfinder'
        selectedMatchId: null,
        bookedTickets: [],
        matches: [],
        activeTicketIndex: null
    };

    // === Fetch Initial Data from Server ===
    async function loadServerData() {
        try {
            const matchesResponse = await fetch('/api/matches');
            if (matchesResponse.ok) {
                state.matches = await matchesResponse.json();
            }
            const ticketsResponse = await fetch('/api/tickets');
            if (ticketsResponse.ok) {
                state.bookedTickets = await ticketsResponse.json();
                if (state.bookedTickets.length > 0 && state.activeTicketIndex === null) {
                    state.activeTicketIndex = 0;
                }
            }
            renderMatches();
            updateWalletUI();
        } catch (err) {
            console.error('Error fetching data from backend:', err);
        }
    }


    // === Coordinates Matrix for SVG Route Pathfinder ===
    const mapCoordinates = {
        gates: {
            A: { x: 250, y: 20 },
            B: { x: 480, y: 250 },
            C: { x: 250, y: 480 },
            D: { x: 20, y: 250 }
        },
        sectors: {
            North: { x: 250, y: 130 },
            East: { x: 370, y: 250 },
            South: { x: 250, y: 370 },
            West: { x: 130, y: 250 }
        }
    };

    // === UI Elements ===
    const elements = {
        tabs: document.querySelectorAll('.tab-btn'),
        tabSections: document.querySelectorAll('.tab-section'),
        matchesGrid: document.getElementById('matches-grid'),
        checkoutPlaceholder: document.getElementById('checkout-placeholder'),
        bookingForm: document.getElementById('booking-form'),
        formMatchTitle: document.getElementById('form-match-title'),
        formMatchVenue: document.getElementById('form-match-venue'),
        
        // Form controls
        ticketHolder: document.getElementById('ticket-holder'),
        ticketQty: document.getElementById('ticket-qty'),
        ticketPurchaseForm: document.getElementById('ticket-purchase-form'),
        calcCatLabel: document.getElementById('calc-cat-label'),
        calcBasePrice: document.getElementById('calc-base-price'),
        calcQty: document.getElementById('calc-qty'),
        calcTotal: document.getElementById('calc-total'),
        ticketsCountBadge: document.getElementById('tickets-count-badge'),
        
        // Wallet View
        ticketsWalletEmpty: document.getElementById('tickets-wallet-container'),
        ticketsWalletActive: document.getElementById('tickets-wallet-active'),
        walletTicketsList: document.getElementById('wallet-tickets-list'),
        btnScanSimulate: document.getElementById('btn-scan-simulate'),
        btnWalletLocate: document.getElementById('btn-wallet-locate-seat'),
        
        // Ticket Pass Labels
        ticketLblMatchType: document.getElementById('ticket-lbl-match-type'),
        ticketLblTeam1: document.getElementById('ticket-lbl-team1'),
        ticketLblTeam2: document.getElementById('ticket-lbl-team2'),
        ticketImgTeam1: document.getElementById('ticket-img-team1'),
        ticketImgTeam2: document.getElementById('ticket-img-team2'),
        ticketLblStadium: document.getElementById('ticket-lbl-stadium'),
        ticketLblDatetime: document.getElementById('ticket-lbl-datetime'),
        ticketLblHolder: document.getElementById('ticket-lbl-holder'),
        ticketLblLevel: document.getElementById('ticket-lbl-level'),
        ticketLblSec: document.getElementById('ticket-lbl-sec'),
        ticketLblRow: document.getElementById('ticket-lbl-row'),
        ticketLblSeat: document.getElementById('ticket-lbl-seat'),
        ticketLblGate: document.getElementById('ticket-lbl-gate'),
        ticketLblSerial: document.getElementById('ticket-lbl-serial'),
        
        // Pathfinder Tab Controls
        routeTicketSelect: document.getElementById('route-ticket-select'),
        routeGateSelect: document.getElementById('route-gate-select'),
        routeSectorSelect: document.getElementById('route-sector-select'),
        pathfinderInputsForm: document.getElementById('pathfinder-inputs-form'),
        mapRouteIndicator: document.getElementById('map-route-indicator'),
        svgNavigationRoute: document.getElementById('svg-navigation-route'),
        routePulseMarker: document.getElementById('route-pulse-marker'),
        
        // 3D Canvas Seating
        perspectiveCanvas: document.getElementById('perspective-canvas'),
        viewAngleBadge: document.getElementById('view-angle-badge'),
        teleDist: document.getElementById('tele-dist'),
        teleAngle: document.getElementById('tele-angle'),
        
        // Chatbot Panel
        assistantChatForm: document.getElementById('assistant-chat-form'),
        assistantChatInput: document.getElementById('assistant-chat-input'),
        assistantChatMessages: document.getElementById('assistant-chat-messages'),
        
        // Scanner Modal
        scanModal: document.getElementById('scan-modal'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        scanStatusText: document.getElementById('scan-status-text'),
        scanChecklist: document.getElementById('scan-checklist')
    };

    // === 3D Perspective Pitch Drawing Logic ===
    function draw3DPitch(category) {
        const canvas = elements.perspectiveCanvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw deep sky background
        ctx.fillStyle = '#03060a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Adjust perspective variables based on Category
        let horizonY, scaleFactor, viewHeightLabel, distLabel, angleLabel;
        
        if (category == 1) { // Category 1 - Pitchside
            horizonY = 100;
            scaleFactor = 1.0;
            viewHeightLabel = "Category 1 View";
            distLabel = "14 meters";
            angleLabel = "7° (Field Level)";
        } else if (category == 2) { // Category 2 - Club Level
            horizonY = 60;
            scaleFactor = 0.65;
            viewHeightLabel = "Category 2 View";
            distLabel = "38 meters";
            angleLabel = "22° (Middle Tier)";
        } else { // Category 3 - Upper Deck
            horizonY = 30;
            scaleFactor = 0.35;
            viewHeightLabel = "Category 3 View";
            distLabel = "75 meters";
            angleLabel = "44° (Upper Deck)";
        }

        elements.viewAngleBadge.textContent = viewHeightLabel;
        elements.teleDist.textContent = distLabel;
        elements.teleAngle.textContent = angleLabel;

        // Draw Crowd/Stadium Stands Background (Top)
        const standsGrad = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY);
        standsGrad.addColorStop(0, '#101726');
        standsGrad.addColorStop(1, '#080c14');
        ctx.fillStyle = standsGrad;
        ctx.fillRect(0, horizonY - 45, canvas.width, 45);

        // Draw seating crowd dots simulation
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 40; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, horizonY - 10 - Math.random() * 30, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Pitch Field Perspective (Emerald Green Trapezoid)
        ctx.beginPath();
        // Horizon endpoints
        const hzX1 = canvas.width/2 - 120 * scaleFactor;
        const hzX2 = canvas.width/2 + 120 * scaleFactor;
        // Foreground endpoints
        const fgX1 = -80;
        const fgX2 = canvas.width + 80;
        
        ctx.moveTo(hzX1, horizonY);
        ctx.lineTo(hzX2, horizonY);
        ctx.lineTo(fgX2, canvas.height);
        ctx.lineTo(fgX1, canvas.height);
        ctx.closePath();
        
        const fieldGrad = ctx.createLinearGradient(0, horizonY, 0, canvas.height);
        fieldGrad.addColorStop(0, '#0f3825'); // darker green in horizon
        fieldGrad.addColorStop(1, '#00E676'); // glowing grass in foreground
        ctx.fillStyle = fieldGrad;
        ctx.fill();

        // Draw Pitch lines in perspective
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;

        // Center line
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, horizonY);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();

        // Center circle (draw ellipse in perspective)
        ctx.beginPath();
        ctx.ellipse(canvas.width/2, horizonY + (canvas.height - horizonY)/2, 60 * scaleFactor, 30 * scaleFactor, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Goal Post structure (facing the viewer)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        const goalWidth = 140 * scaleFactor;
        const goalHeight = 70 * scaleFactor;
        const goalX = canvas.width/2 - goalWidth/2;
        const goalY = horizonY + 30 * scaleFactor;

        ctx.strokeRect(goalX, goalY, goalWidth, goalHeight);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(goalX, goalY, goalWidth, goalHeight);

        // Draw soccer ball on the field
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const ballY = horizonY + (canvas.height - horizonY) * 0.75;
        const ballSize = 6 * scaleFactor;
        ctx.arc(canvas.width/2 + 15, ballY, ballSize, 0, Math.PI * 2);
        ctx.fill();
        // Ball shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(canvas.width/2 + 15, ballY + ballSize - 1, ballSize, 2, 0, 0, Math.PI*2);
        ctx.fill();
    }

    // === Initialize Match Cards List ===
    function renderMatches() {
        elements.matchesGrid.innerHTML = '';
        state.matches.forEach(m => {
            const card = document.createElement('div');
            card.className = `match-card ${state.selectedMatchId === m.id ? 'selected' : ''}`;
            card.setAttribute('data-id', m.id);
            
            let ticketBadge = `<span class="match-tickets-left">${m.ticketsLeft} seats available</span>`;
            if (m.ticketsLeft <= 10) {
                ticketBadge = `<span class="match-tickets-left low"><i class="fa-solid fa-fire animate-flicker"></i> Only ${m.ticketsLeft} tickets left!</span>`;
            }

            card.innerHTML = `
                <div class="match-details-side">
                    <span class="match-group-lbl">${m.group}</span>
                    <div class="match-teams-lbl">
                        <img src="${m.team1Flag}" alt="${m.team1}"> ${m.team1}
                        <span class="text-primary" style="font-size:0.8rem;">VS</span>
                        <img src="${m.team2Flag}" alt="${m.team2}"> ${m.team2}
                    </div>
                    <span class="match-stadium-lbl"><i class="fa-solid fa-location-dot"></i> ${m.stadium} (${m.location})</span>
                </div>
                <div class="match-action-side">
                    ${ticketBadge}
                    <span class="match-date-lbl">${m.date} • ${m.time}</span>
                    <button class="btn btn-sm btn-outline-primary">Select Match</button>
                </div>
            `;

            card.addEventListener('click', () => {
                selectMatch(m.id);
            });

            elements.matchesGrid.appendChild(card);
        });
    }

    function selectMatch(matchId) {
        state.selectedMatchId = matchId;
        renderMatches();
        
        const match = state.matches.find(m => m.id === matchId);
        
        elements.checkoutPlaceholder.classList.add('hidden');
        elements.bookingForm.classList.remove('hidden');
        
        elements.formMatchTitle.textContent = `${match.team1} vs. ${match.team2}`;
        elements.formMatchVenue.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${match.stadium} (${match.location})`;
        
        updatePriceSummary();
    }

    // === Checkout Price Calculator ===
    function updatePriceSummary() {
        const catValue = document.querySelector('input[name="seat-category"]:checked').value;
        const qty = parseInt(elements.ticketQty.value);
        
        let basePrice = 380;
        let catLabel = "Cat 1 - Pitchside";
        if (catValue == 2) {
            basePrice = 240;
            catLabel = "Cat 2 - Middle Tier";
        } else if (catValue == 3) {
            basePrice = 120;
            catLabel = "Cat 3 - Upper Deck";
        }

        const baseTotal = basePrice * qty;
        const finalTotal = baseTotal + 15; // Fees

        elements.calcCatLabel.textContent = catLabel;
        elements.calcBasePrice.textContent = `$${basePrice.toFixed(2)}`;
        elements.calcQty.textContent = `x ${qty}`;
        elements.calcTotal.textContent = `$${finalTotal.toFixed(2)}`;
        
        // Update 3D canvas live during selection
        draw3DPitch(catValue);
    }

    document.querySelectorAll('input[name="seat-category"]').forEach(input => {
        input.addEventListener('change', updatePriceSummary);
    });
    elements.ticketQty.addEventListener('change', updatePriceSummary);

    // === Buy/Generate Ticket Handler ===
    elements.ticketPurchaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const holderName = elements.ticketHolder.value.trim();
        const catValue = parseInt(document.querySelector('input[name="seat-category"]:checked').value);
        const qty = parseInt(elements.ticketQty.value);

        if (!state.selectedMatchId || !holderName) return;

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: state.selectedMatchId,
                    holderName: holderName,
                    category: catValue,
                    qty: qty
                })
            });

            if (response.ok) {
                const newTicket = await response.json();
                
                // Refresh data from server to sync matches and tickets
                await loadServerData();
                
                // Set the active ticket to the newly booked one
                state.activeTicketIndex = state.bookedTickets.findIndex(t => t.serial === newTicket.serial);
                if (state.activeTicketIndex === -1) {
                    state.activeTicketIndex = state.bookedTickets.length - 1;
                }

                // Reset forms
                elements.ticketHolder.value = '';
                elements.ticketQty.value = '1';
                
                // Update wallet indicators
                updateWalletUI();
                
                // Go to Tickets View
                switchTab('tickets');
            } else {
                const errData = await response.json();
                alert(`Booking failed: ${errData.error || 'Server error'}`);
            }
        } catch (err) {
            console.error('Error posting booking:', err);
            alert('Failed to complete booking. Please try again.');
        }
    });

    // === Wallet UI Rendering ===
    function updateWalletUI() {
        elements.ticketsCountBadge.textContent = state.bookedTickets.length;
        
        // Autofill Pathfinder Select options
        elements.routeTicketSelect.innerHTML = '';

        if (state.bookedTickets.length === 0) {
            elements.ticketsWalletEmpty.classList.remove('hidden');
            elements.ticketsWalletActive.classList.add('hidden');
            
            elements.routeTicketSelect.innerHTML = `<option value="">No active tickets booked</option>`;
            return;
        }

        elements.ticketsWalletEmpty.classList.add('hidden');
        elements.ticketsWalletActive.classList.remove('hidden');
        
        elements.walletTicketsList.innerHTML = '';
        state.bookedTickets.forEach((t, index) => {
            const card = document.createElement('div');
            card.className = `ticket-selector-card ${index === state.activeTicketIndex ? 'active' : ''}`;
            
            card.innerHTML = `
                <div class="tick-sel-meta">
                    <span class="tick-sel-match">
                        <img src="${t.team1Flag}" alt="${t.team1}"> ${t.team1} VS ${t.team2} <img src="${t.team2Flag}" alt="${t.team2}">
                    </span>
                    <span class="tick-sel-venue">${t.stadium} • Sec ${t.sec}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-muted"></i>
            `;

            card.addEventListener('click', () => {
                state.activeTicketIndex = index;
                updateWalletUI();
            });

            elements.walletTicketsList.appendChild(card);
            
            // Add to pathfinder selector option
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = `${t.team1} vs ${t.team2} (Sec ${t.sec})`;
            elements.routeTicketSelect.appendChild(opt);
        });

        // Fill Ticket Details
        const activeT = state.bookedTickets[state.activeTicketIndex];
        
        elements.ticketLblTeam1.textContent = activeT.team1;
        elements.ticketLblTeam2.textContent = activeT.team2;
        elements.ticketImgTeam1.src = activeT.team1Flag;
        elements.ticketImgTeam2.src = activeT.team2Flag;
        elements.ticketLblStadium.textContent = activeT.stadium;
        elements.ticketLblDatetime.textContent = activeT.datetime;
        elements.ticketLblHolder.textContent = activeT.holder;
        elements.ticketLblLevel.textContent = activeT.level;
        elements.ticketLblSec.textContent = activeT.sec.split(" ")[1];
        elements.ticketLblRow.textContent = activeT.row;
        elements.ticketLblSeat.textContent = activeT.seat;
        elements.ticketLblGate.textContent = `Gate ${activeT.gate}`;
        elements.ticketLblSerial.textContent = activeT.serial;

        // Auto-select in pathfinder dropdown
        elements.routeTicketSelect.value = state.activeTicketIndex;
        autofillPathfinderInputs(activeT);
    }

    function autofillPathfinderInputs(ticket) {
        elements.routeGateSelect.value = ticket.gate;
        elements.routeSectorSelect.value = ticket.sector;
    }

    elements.routeTicketSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val !== "") {
            const ticket = state.bookedTickets[parseInt(val)];
            autofillPathfinderInputs(ticket);
        }
    });

    // === Interactive Gate Scan Verification ===
    elements.btnScanSimulate.addEventListener('click', async () => {
        const activeT = state.bookedTickets[state.activeTicketIndex];
        if (!activeT) return;

        elements.scanModal.classList.remove('hidden');
        elements.scanStatusText.textContent = "INITIATING AI SECURITY TRIAGE...";
        elements.scanStatusText.className = "scan-status-lbl text-warning";
        
        const items = elements.scanChecklist.querySelectorAll('.check-item');
        items.forEach(item => item.classList.remove('verified'));

        try {
            const response = await fetch('/api/tickets/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serial: activeT.serial })
            });

            const result = await response.json();

            // Step 1 check
            setTimeout(() => {
                items[0].classList.add('verified');
                elements.scanStatusText.textContent = "AUTHENTICATING SECURITY CRYPTO...";
            }, 1000);

            // Step 2 check
            setTimeout(() => {
                items[1].classList.add('verified');
                elements.scanStatusText.textContent = "VALIDATING CAPACITY SYNC...";
            }, 2000);

            // Step 3 check
            setTimeout(() => {
                if (response.ok && result.verified) {
                    items[2].classList.add('verified');
                    elements.scanStatusText.textContent = "ACCESS GRANTED! GATE VERIFIED.";
                    elements.scanStatusText.className = "scan-status-lbl text-success";
                    
                    // Audio Voiceover Synth welcome
                    if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const welcomeUtter = new SpeechSynthesisUtterance(
                            `Welcome, ${activeT.holder}. Ticket verified for Section ${activeT.sec}. Please enter immediately through Gate ${activeT.gate}. Enjoy the match!`
                        );
                        welcomeUtter.rate = 0.95;
                        window.speechSynthesis.speak(welcomeUtter);
                    }
                } else {
                    elements.scanStatusText.textContent = "ACCESS DENIED! INVALID TICKET.";
                    elements.scanStatusText.className = "scan-status-lbl text-danger";
                }
            }, 3000);
        } catch (err) {
            console.error('Error verifying ticket:', err);
            setTimeout(() => {
                elements.scanStatusText.textContent = "VERIFICATION ERROR! OFFLINE MODE.";
                elements.scanStatusText.className = "scan-status-lbl text-danger";
            }, 3000);
        }
    });

    elements.btnCloseModal.addEventListener('click', () => {
        elements.scanModal.classList.add('hidden');
    });

    // === Pathfinder Route Generator (SVG Animation) ===
    elements.btnWalletLocate.addEventListener('click', () => {
        switchTab('pathfinder');
        elements.pathfinderInputsForm.dispatchEvent(new Event('submit'));
    });

    elements.pathfinderInputsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const gate = elements.routeGateSelect.value;
        const sector = elements.routeSectorSelect.value;

        // Trace pathway line coordinates
        const gateCoords = mapCoordinates.gates[gate];
        const sectorCoords = mapCoordinates.sectors[sector];
        
        const pathLine = elements.svgNavigationRoute;
        const pulseMarker = elements.routePulseMarker;

        // Draw curved path starting at Gate, curving through stadium center, landing on Sector
        // Center midpoint coordinates
        const midX = 250;
        const midY = 250;
        
        // Define path geometry using SVG Q (quadratic curves)
        const dAttribute = `M ${gateCoords.x} ${gateCoords.y} Q ${midX} ${midY} ${sectorCoords.x} ${sectorCoords.y}`;
        
        pathLine.setAttribute('d', dAttribute);
        pathLine.classList.remove('hidden');
        
        // Set pulsing highlight nodes on map
        document.querySelectorAll('.gate-node').forEach(node => node.classList.remove('highlighted'));
        document.getElementById(`node-gate-${gate}`).classList.add('highlighted');
        
        document.querySelectorAll('.sector-segment').forEach(seg => seg.classList.remove('sector-highlight'));
        document.getElementById(`sector-path-${sector}`).classList.add('sector-highlight');

        elements.mapRouteIndicator.textContent = `Gate ${gate} ➔ Section ${sector}`;
        elements.mapRouteIndicator.className = "badge badge-success";

        // Animate marker dot along the path
        pulseMarker.classList.remove('hidden');
        pulseMarker.setAttribute('cx', gateCoords.x);
        pulseMarker.setAttribute('cy', gateCoords.y);
        
        // Calculate canvas 3D view depending on Category numbers
        let catNum = 1;
        const ticketSelectVal = elements.routeTicketSelect.value;
        if (ticketSelectVal !== "") {
            catNum = state.bookedTickets[parseInt(ticketSelectVal)].catNum;
        } else {
            // Default select base matching row Category
            if (sector === 'East') catNum = 2;
            else if (sector === 'South') catNum = 3;
        }
        draw3DPitch(catNum);

        // Log AI chatbot prompt matching routes
        addAssistantMessage(`Routing complete. Pathway established starting from **Gate ${gate}** directly into **Section ${sector}**. Walking time is estimated at **3 minutes** via Concourse Ring-Walkway. Elevators are accessible near Section ${sector === 'West' ? 'West' : 'North'}.`);
    });

    // === GenAI Seating Assistant Chatbot ===
    function addAssistantMessage(markdownText, isUser = false) {
        const msg = document.createElement('div');
        msg.className = `chat-bubble ${isUser ? 'user' : 'bot'}`;
        
        let formatted = markdownText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
            
        msg.innerHTML = formatted;
        elements.assistantChatMessages.appendChild(msg);
        elements.assistantChatMessages.scrollTop = elements.assistantChatMessages.scrollHeight;
    }

    elements.assistantChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = elements.assistantChatInput.value.trim();
        if (text) {
            addAssistantMessage(text, true);
            elements.assistantChatInput.value = '';
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });

                if (response.ok) {
                    const data = await response.json();
                    addAssistantMessage(data.response);
                } else {
                    addAssistantMessage("🤖 **Seat Guide Assistant:**\nI'm sorry, I'm having trouble connecting to my service right now.");
                }
            } catch (err) {
                console.error('Chat error:', err);
                addAssistantMessage("🤖 **Seat Guide Assistant:**\nI'm sorry, I'm having trouble connecting to my service right now.");
            }
        }
    });

    // === Navigation Tab Switcher ===
    function switchTab(tabId) {
        state.activeTab = tabId;
        elements.tabs.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        elements.tabSections.forEach(section => {
            if (section.id === `tab-${tabId}`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
        
        // Recalculate 3D views when tabs switch to pathfinder
        if (tabId === 'pathfinder') {
            const ticketSelectVal = elements.routeTicketSelect.value;
            let currentCat = 1;
            if (ticketSelectVal !== "") {
                currentCat = state.bookedTickets[parseInt(ticketSelectVal)].catNum;
            }
            draw3DPitch(currentCat);
        }
    }

    elements.tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-tab'));
        });
    });

    // === Fetch Initial Data from Server ===
    loadServerData();
});
