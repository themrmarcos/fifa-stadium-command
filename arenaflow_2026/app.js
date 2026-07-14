// ArenaFlow 2026 - Stadium Operations & Fan Companion
// Powered by Simulated GenAI Engines

document.addEventListener('DOMContentLoaded', () => {
    // === App State ===
    const state = {
        currentView: 'fan', // 'fan' or 'ops'
        selectedStadium: 'metlife',
        ecoPoints: 350,
        crowdDensity: 68,
        activeIncidents: [
            { id: 1, text: "Congestion backlog forming at Gate B entrance", severity: "MEDIUM", category: "Crowd Control", squad: "Squad 2", location: "Gate B", status: "Active", time: "22:30" },
            { id: 2, text: "Minor water leak reported near concession stand 12", severity: "LOW", category: "Facilities", squad: "Squad 4", location: "South Concourse", status: "Active", time: "22:38" }
        ],
        squads: [
            { name: "Squad 1 (North Gate Crowd Control)", location: "Sector North / Gate A", status: "Available" },
            { name: "Squad 2 (East Gate Crowd Control)", location: "Sector East / Gate B", status: "Dispatched" },
            { name: "Squad 4 (Janitorial Services)", location: "Sector South Concourse", status: "Dispatched" },
            { name: "Squad 6 (Medical & First Aid)", location: "Central Med Station", status: "Available" },
            { name: "Squad 9 (Accessibility Assistance)", location: "Sector West Concourse", status: "Available" }
        ],
        gates: {
            A: { name: "Gate A (North)", wait: 3, status: "Fast", color: "#22c55e" },
            B: { name: "Gate B (East)", wait: 24, status: "Congested", color: "#ef4444" },
            C: { name: "Gate C (South)", wait: 14, status: "Moderate", color: "#f59e0b" },
            D: { name: "Gate D (West)", wait: 5, status: "Fast", color: "#22c55e" }
        },
        transitDelay: false
    };

    // === DOM Element Cache ===
    const elements = {
        // Navigation / Headers
        btnFanView: document.getElementById('btn-fan-view'),
        btnOpsView: document.getElementById('btn-ops-view'),
        viewFan: document.getElementById('view-fan'),
        viewOps: document.getElementById('view-ops'),
        stadiumSelect: document.getElementById('stadium-select'),
        headerTime: document.getElementById('header-time'),
        
        // Fan View
        stadiumMap: document.getElementById('interactive-stadium-map'),
        mapTooltip: document.getElementById('map-tooltip'),
        btnRecycleSimulate: document.getElementById('btn-recycle-simulate'),
        fanEcoPoints: document.getElementById('fan-eco-points'),
        
        // Chatbot
        chatForm: document.getElementById('chat-form'),
        chatInput: document.getElementById('chat-input'),
        chatMessages: document.getElementById('chat-messages'),
        chatLangSelect: document.getElementById('chat-lang-select'),
        chatTyping: document.getElementById('chat-typing'),
        presetBtns: document.querySelectorAll('.preset-btn'),
        
        // Ops View
        kpiCrowdDensity: document.getElementById('kpi-crowd-density'),
        kpiIncidentsCount: document.getElementById('kpi-incidents-count'),
        incidentForm: document.getElementById('incident-form'),
        incidentInput: document.getElementById('incident-input'),
        triageOutput: document.getElementById('triage-output-container'),
        triageSeverity: document.getElementById('triage-badge-severity'),
        triageCategory: document.getElementById('triage-val-category'),
        triageSquad: document.getElementById('triage-val-squad'),
        triageSteps: document.getElementById('triage-val-steps'),
        incidentsList: document.getElementById('incidents-list'),
        squadList: document.getElementById('squad-list'),
        
        // Simulation buttons
        simBtnGateBSurge: document.getElementById('sim-btn-gate-b-surge'),
        simBtnMedical: document.getElementById('sim-btn-medical'),
        simBtnTransitDelay: document.getElementById('sim-btn-transit-delay'),
        simBtnReset: document.getElementById('sim-btn-reset'),
        
        // Broadcasts
        broadcastForm: document.getElementById('broadcast-form'),
        broadcastPrompt: document.getElementById('broadcast-prompt'),
        broadcastOutput: document.getElementById('broadcast-output'),
        broadcastWave: document.getElementById('broadcast-wave'),
        broadcastTxtEn: document.getElementById('broadcast-txt-en'),
        broadcastTxtEs: document.getElementById('broadcast-txt-es'),
        broadcastTxtFr: document.getElementById('broadcast-txt-fr'),
        
        // Map Toggles
        mapToggles: document.querySelectorAll('.map-toggle-btn'),
        layerAmenities: document.getElementById('layer-amenities')
    };

    // === Live Clock ===
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        
        const timeZone = state.selectedStadium === 'metlife' ? 'EST' : 
                         state.selectedStadium === 'azteca' ? 'CST' : 'PST';
                         
        elements.headerTime.textContent = `${hours}:${minutes}:${seconds} ${ampm} ${timeZone}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // === Tab Switching ===
    function switchView(viewName) {
        state.currentView = viewName;
        if (viewName === 'fan') {
            elements.btnFanView.classList.add('active');
            elements.btnOpsView.classList.remove('active');
            elements.viewFan.classList.add('active');
            elements.viewOps.classList.remove('active');
        } else {
            elements.btnFanView.classList.remove('active');
            elements.btnOpsView.classList.add('active');
            elements.viewFan.classList.remove('active');
            elements.viewOps.classList.add('active');
            renderOpsIncidents();
            renderSquads();
        }
    }
    
    elements.btnFanView.addEventListener('click', () => switchView('fan'));
    elements.btnOpsView.addEventListener('click', () => switchView('ops'));

    elements.stadiumSelect.addEventListener('change', (e) => {
        state.selectedStadium = e.target.value;
        updateClock();
        // Add a message about changing stadium in chat
        addBotMessage(`Stadium switched to **${elements.stadiumSelect.options[elements.stadiumSelect.selectedIndex].text}**. Stadium systems synchronized.`);
    });

    // === Map Toggle Layers ===
    elements.mapToggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.mapToggles.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const layer = btn.getAttribute('data-layer');
            if (layer === 'amenities') {
                elements.layerAmenities.classList.remove('hidden');
            } else {
                elements.layerAmenities.classList.add('hidden');
            }
        });
    });

    // === Interactive Map Hover/Click Interactions ===
    const mapGates = document.querySelectorAll('.map-gate');
    mapGates.forEach(gateEl => {
        const gateId = gateEl.getAttribute('data-gate');
        
        gateEl.addEventListener('mouseenter', (e) => {
            const gate = state.gates[gateId];
            elements.mapTooltip.innerHTML = `<strong>${gate.name}</strong>: ${gate.wait} min wait (${gate.status})`;
            elements.mapTooltip.style.borderColor = gate.color;
        });

        gateEl.addEventListener('mouseleave', () => {
            elements.mapTooltip.innerHTML = "Hover over gates or sectors for details";
            elements.mapTooltip.style.borderColor = "var(--border-active)";
        });

        gateEl.addEventListener('click', () => {
            // Highlight matching mini gate card
            const gateCard = document.querySelector(`.gate-mini-card[data-gate="${gateId}"]`);
            if (gateCard) {
                gateCard.classList.add('highlighted');
                setTimeout(() => gateCard.classList.remove('highlighted'), 1500);
                gateCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            // Auto prompt chat
            const promptText = `Which stadium gate is least crowded right now?`;
            sendMessage(promptText);
        });
    });

    const mapSectors = document.querySelectorAll('.stadium-sector');
    mapSectors.forEach(sectorEl => {
        const sectorName = sectorEl.getAttribute('data-sector');
        
        sectorEl.addEventListener('mouseenter', () => {
            let densityText = "Normal";
            let color = "var(--color-accent-green)";
            if (sectorName === 'East') {
                densityText = "High Congestion";
                color = "var(--color-accent-red)";
            } else if (sectorName === 'South') {
                densityText = "Moderate Flow";
                color = "var(--color-accent-yellow)";
            }
            elements.mapTooltip.innerHTML = `<strong>Sector ${sectorName}</strong>: ${densityText}`;
            elements.mapTooltip.style.borderColor = color;
        });

        sectorEl.addEventListener('mouseleave', () => {
            elements.mapTooltip.innerHTML = "Hover over gates or sectors for details";
            elements.mapTooltip.style.borderColor = "var(--border-active)";
        });

        sectorEl.addEventListener('click', () => {
            const promptText = `Show food and accessibility options near Sector ${sectorName}`;
            sendMessage(promptText);
        });
    });

    // === Recycling Simulation ===
    elements.btnRecycleSimulate.addEventListener('click', () => {
        state.ecoPoints += 150;
        elements.fanEcoPoints.textContent = state.ecoPoints;
        elements.fanEcoPoints.parentElement.classList.add('animate-flicker');
        setTimeout(() => elements.fanEcoPoints.parentElement.classList.remove('animate-flicker'), 1500);
        
        addBotMessage("♻️ **GenAI Recycling rewards logged!** You returned 1 cup at Gate C recycling station. **+150 Eco Points** credited to your FIFA Fan Pass. Total Balance: **" + state.ecoPoints + " Pts**.");
    });

    // === GenAI Multilingual Fan Assistant Chatbot ===
    
    // Translations Data
    const chatbotResponses = {
        en: {
            accessibility: "♿ **Accessibility Routes & Support:**\nAll gates support wheelchair access. However, **Gate D (West)** offers the flattest entry gradient and the shortest distance to wheelchair-accessible elevators in Section 112. Volunteer squads (look for yellow sleeves) are stationed at Gate D for direct transport escort.",
            gates: "🚪 **Gate Crowd Wait Times:**\n- **Gate A (North):** 3 min wait (Fastest)\n- **Gate D (West):** 5 min wait (Fast)\n- **Gate C (South):** 14 min wait (Moderate)\n- **Gate B (East):** 24 min wait (CONGESTED due to high train shuttle volume).\n*AI Suggestion:* If you are arriving from downtown, bypass Gate B and walk 4 minutes North to enter via Gate A.",
            transit: "🚇 **Transit Routing Center:**\n- **Express Metro Line 1** departs from East Terminal every 5 minutes. Queue times to enter terminal: 15 mins.\n- **Shuttle Bus 12B** leaves North Parking lot every 10 minutes.\n- **Ride-share pick up** is restricted to Lot C (expect 25 min vehicle delays). We recommend Metro Line 1 for fastest exit.",
            food: "🌱 **Vegan & Dietary Options:**\nYes! Concession stands 102 (North) and 124 (South) serve plant-based hot dogs, vegan street tacos, and compostable mineral water. Stands 102 and 124 also offer express checkout lanes for fans using Eco-Points.",
            fallback: "🤖 **FIFA GenAI Companion:**\nI hear your request regarding stadium operations. Our real-time data indicators confirm the stadium is at 68% occupancy. For immediate route assistance, restrooms, or emergency alerts, you can also ask one of our venue volunteers. Can you clarify your request?"
        },
        es: {
            accessibility: "♿ **Rutas de Accesibilidad y Soporte:**\nTodas las puertas cuentan con acceso para sillas de ruedas. Sin embargo, la **Puerta D (Oeste)** ofrece la pendiente de entrada más plana y la distancia más corta a los ascensores en la Sección 112. Voluntarios están listos en la Puerta D para escoltarle.",
            gates: "🚪 **Tiempos de Espera en las Puertas:**\n- **Puerta A (Norte):** 3 min (Más rápida)\n- **Puerta D (Oeste):** 5 min (Rápida)\n- **Puerta C (Sur):** 14 min (Moderada)\n- **Puerta B (Este):** 24 min (CONGESTIONADA por llegada masiva del metro).\n*Sugerencia de IA:* Rodee la Puerta B y camine 4 minutos al Norte para ingresar por la Puerta A.",
            transit: "🚇 **Centro de Tránsito:**\n- **Línea 1 del Metro Express** sale cada 5 minutos desde la terminal Este (espera de 15 min).\n- **Autobús Lanzadera 12B** sale del estacionamiento Norte cada 10 minutos.\n- **Servicios de Uber/Didi** operan únicamente en el Lote C (retraso de 25 min). Se recomienda el metro.",
            food: "🌱 **Opciones Veganas y Alimentos:**\n¡Sí! Las concesiones 102 (Norte) y 124 (Sur) sirven hot dogs vegetarianos, tacos veganos y agua mineral sustentable. Puede utilizar sus Eco-Puntos para obtener un 15% de descuento.",
            fallback: "🤖 **Asistente FIFA GenAI:**\nEntiendo su consulta. Actualmente el estadio está al 68% de capacidad. Si requiere asistencia médica, de seguridad o direcciones específicas, avíseme para guiarle. ¿Podría detallar su pregunta?"
        },
        fr: {
            accessibility: "♿ **Itinéraires Accessibles et Assistance:**\nToutes les portes sont accessibles aux fauteuils roulants. La **Porte D (Ouest)** présente la pente la plus douce et l'accès le plus rapide aux ascenseurs de la Section 112. Des bénévoles sont présents pour vous guider.",
            gates: "🚪 **Temps d'attente aux Portes:**\n- **Porte A (Nord):** 3 min (Le plus rapide)\n- **Porte D (Ouest):** 5 min (Rapide)\n- **Porte C (Sud):** 14 min (Modéré)\n- **Porte B (Est):** 24 min (ENCOMBRÉE par les navettes ferroviaires).\n*Conseil IA:* Évitez la Porte B et marchez 4 minutes vers le Nord pour entrer par la Porte A.",
            transit: "🚇 **Options de Transport:**\n- **Métro Express Ligne 1** part toutes les 5 minutes du Terminal Est (file d'attente de 15 min).\n- **Navette Bus 12B** part du parking Nord toutes les 10 minutes.\n- **Taxis/Ride-share** sont limités au Parking C (attente de 25 min). Le Métro est conseillé.",
            food: "🌱 **Options Végétaliennes et Restauration:**\nOui! Les stands 102 (Nord) et 124 (Sud) proposent des hot-dogs végétaux, des tacos végétaliens et de l'eau en bouteille compostable. Bénéficiez d'une file prioritaire avec vos Eco-Points.",
            fallback: "🤖 **Compagnon IA de la FIFA:**\nJe comprends votre demande. L'occupation du stade est de 68%. Si vous avez besoin d'aide pour trouver votre siège ou d'une assistance immédiate, je suis à votre écoute."
        },
        pt: {
            accessibility: "♿ **Rotas de Acessibilidade:**\nTodas as portas são adaptadas para cadeirantes. A **Porta D (Oeste)** possui rampa de acesso mais suave e elevador próximo no Setor 112.",
            gates: "🚪 **Tempo de Espera nos Portões:**\n- **Portão A (Norte):** 3 min (Mais rápido)\n- **Portão D (Oeste):** 5 min (Rápido)\n- **Portão C (Sul):** 14 min (Moderado)\n- **Portão B (Leste):** 24 min (CONGESTIONADO).\n*Dica de IA:* Use o Portão A para economizar tempo.",
            transit: "🚇 **Transporte Público:**\n- **Metro Linha Expressa 1** opera a cada 5 min (Terminal Leste).\n- **Ônibus 12B** sai do Estacionamento Norte a cada 10 min.",
            food: "🌱 **Comida Vegana:**\nSim! Os quiosques 102 (Norte) e 124 (Sul) têm opções veganas como tacos e lanches rápidos.",
            fallback: "🤖 **Assistente GenAI FIFA:**\nEstou processando seu pedido. O estádio está com fluxo estável. Deseja mais informações sobre setores ou transporte?"
        },
        de: {
            accessibility: "♿ **Barrierefreiheit & Unterstützung:**\nAlle Tore sind barrierefrei. **Tor D (Westen)** hat die flachste Rampe und ist dem Aufzug in Sektor 112 am nächsten.",
            gates: "🚪 **Wartezeiten an den Toren:**\n- **Tor A (Norden):** 3 Min (Schnell)\n- **Tor D (Westen):** 5 Min (Schnell)\n- **Tor C (Süden):** 14 Min (Mittel)\n- **Tor B (Osten):** 24 Min (ÜBERFÜLLT).\n*KI-Tipp:* Nutzen Sie Tor A für schnellen Zugang.",
            transit: "🚇 **Nahverkehr:**\n- **Express-U-Bahn 1** fährt alle 5 Min vom Terminal Ost ab.\n- **Shuttlebus 12B** fährt alle 10 Min vom Parkplatz Nord.",
            food: "🌱 **Vegane Optionen:**\nKiosk 102 (Nord) und 124 (Süd) bieten vegane Tacos und Hot Dogs an.",
            fallback: "🤖 **FIFA GenAI-Assistent:**\nIch bin bereit zu helfen. Das Stadion ist zu 68% gefüllt. Wie kann ich Ihnen bei der Navigation oder Verpflegung helfen?"
        }
    };

    function addBotMessage(markdownText) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message assistant';
        
        // Convert simple markdown styling to HTML
        let formatted = markdownText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
            
        msgDiv.innerHTML = `
            <div class="message-content">${formatted}</div>
            <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        elements.chatMessages.appendChild(msgDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function addFanMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message user';
        msgDiv.innerHTML = `
            <div class="message-content">${text}</div>
            <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        elements.chatMessages.appendChild(msgDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function triggerBotThinking(userInput) {
        elements.chatTyping.classList.remove('hidden');
        
        // Dynamic reply simulation
        setTimeout(() => {
            elements.chatTyping.classList.add('hidden');
            const lang = elements.chatLangSelect.value;
            const query = userInput.toLowerCase();
            let matchedKey = 'fallback';
            
            if (query.includes('wheelchair') || query.includes('access') || query.includes('disabled') || query.includes('disability') || query.includes('rampa') || query.includes(' handicap') || query.includes('♿') || query.includes('elevat')) {
                matchedKey = 'accessibility';
            } else if (query.includes('gate') || query.includes('crowd') || query.includes('wait') || query.includes('least') || query.includes('puerta') || query.includes('porte') || query.includes('portão')) {
                matchedKey = 'gates';
            } else if (query.includes('transit') || query.includes('bus') || query.includes('subway') || query.includes('metro') || query.includes('taxi') || query.includes('ride') || query.includes('car') || query.includes('station')) {
                matchedKey = 'transit';
            } else if (query.includes('food') || query.includes('vegan') || query.includes('eat') || query.includes('diet') || query.includes('comida') || query.includes('nourrit') || query.includes('vegetar')) {
                matchedKey = 'food';
            }
            
            // Check transit delay context
            let response = chatbotResponses[lang][matchedKey];
            if (matchedKey === 'transit' && state.transitDelay) {
                if (lang === 'en') {
                    response += "\n\n⚠️ **WARNING UPDATE:** AI has detected a train signaling issue at Metro Line 1. Delays of 20+ mins are expected. Extra Shuttle Buses are being deployed to Gate C.";
                } else if (lang === 'es') {
                    response += "\n\n⚠️ **ALERTA:** La IA ha detectado fallas en la línea 1 del Metro. Retrasos de 20 min. Autobuses de apoyo saldrán desde la Puerta C.";
                } else if (lang === 'fr') {
                    response += "\n\n⚠️ **ALERTE:** Problème de signalisation sur la Ligne 1 du Métro. Retards de 20+ min. Navettes de secours déployées Porte C.";
                }
            }

            addBotMessage(response);
        }, 1200);
    }

    function sendMessage(text) {
        addFanMessage(text);
        triggerBotThinking(text);
    }

    elements.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = elements.chatInput.value.trim();
        if (text) {
            sendMessage(text);
            elements.chatInput.value = '';
        }
    });

    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query');
            sendMessage(query);
        });
    });

    // === GenAI Smart Incident Triage & Dispatch (Operations View) ===
    
    function renderOpsIncidents() {
        elements.incidentsList.innerHTML = '';
        elements.kpiIncidentsCount.textContent = state.activeIncidents.length;
        
        if (state.activeIncidents.length === 0) {
            elements.incidentsList.innerHTML = `
                <div class="incident-queue-item justify-center text-muted">
                    <i class="fa-solid fa-circle-check text-success"></i> &nbsp; No active incidents. All zones green.
                </div>
            `;
            return;
        }

        state.activeIncidents.forEach(inc => {
            const item = document.createElement('div');
            item.className = 'incident-queue-item';
            
            let badgeClass = 'badge-success';
            if (inc.severity === 'HIGH') badgeClass = 'badge-danger';
            else if (inc.severity === 'MEDIUM') badgeClass = 'badge-warning';
            else if (inc.severity === 'LOW') badgeClass = 'badge-outline';

            item.innerHTML = `
                <div class="incident-q-meta">
                    <span class="incident-q-text">${inc.text}</span>
                    <span class="incident-q-loc"><i class="fa-solid fa-location-pin"></i> ${inc.location} • Assigned: ${inc.squad} • ${inc.time}</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span class="badge ${badgeClass}">${inc.severity}</span>
                    <button class="btn btn-xs btn-outline-success btn-resolve" data-id="${inc.id}">Resolve</button>
                </div>
            `;
            elements.incidentsList.appendChild(item);
        });

        // Attach Resolve Handlers
        document.querySelectorAll('.btn-resolve').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const incId = parseInt(btn.getAttribute('data-id'));
                const removedIncident = state.activeIncidents.find(i => i.id === incId);
                
                state.activeIncidents = state.activeIncidents.filter(i => i.id !== incId);
                
                // Return volunteer squad to Available state
                if (removedIncident) {
                    const squad = state.squads.find(s => s.name.includes(removedIncident.squad));
                    if (squad) squad.status = "Available";
                }
                
                renderOpsIncidents();
                renderSquads();
            });
        });
    }

    function renderSquads() {
        elements.squadList.innerHTML = '';
        state.squads.forEach(s => {
            const item = document.createElement('div');
            item.className = 'squad-item';
            
            let statusBadge = 'badge-outline-success';
            if (s.status === 'Dispatched') statusBadge = 'badge-outline-warning';

            item.innerHTML = `
                <div class="squad-meta">
                    <span class="squad-name">${s.name}</span>
                    <span class="squad-loc"><i class="fa-solid fa-location-arrow"></i> ${s.location}</span>
                </div>
                <span class="badge ${statusBadge}">${s.status}</span>
            `;
            elements.squadList.appendChild(item);
        });
    }

    // Incident triage algorithm (Simulated LLM response)
    function runIncidentTriage(inputText) {
        elements.triageOutput.classList.remove('hidden');
        elements.triageOutput.style.opacity = 0.5;
        
        setTimeout(() => {
            elements.triageOutput.style.opacity = 1;
            const inputLower = inputText.toLowerCase();
            
            let severity = "LOW";
            let category = "Facilities";
            let squad = "Squad 4 (Janitorial Services)";
            let steps = [
                "Issue registered in maintenance logs.",
                "Janitorial dispatcher notified.",
                "Inspect section within 15 minutes."
            ];

            // AI Triage Rules
            if (inputLower.includes('medical') || inputLower.includes('hurt') || inputLower.includes('faint') || inputLower.includes('bleed') || inputLower.includes('heart') || inputLower.includes('injury')) {
                severity = "HIGH";
                category = "Medical Emergency";
                squad = "Squad 6 (Medical & First Aid)";
                steps = [
                    "DISPATCH squad 6 immediately with trauma kit.",
                    "Notify stadium central medical bay.",
                    "Direct nearest usher to clear path for responders."
                ];
            } else if (inputLower.includes('fight') || inputLower.includes('security') || inputLower.includes('steal') || inputLower.includes('weapon') || inputLower.includes('police') || inputLower.includes('fire')) {
                severity = "HIGH";
                category = "Security & Safety";
                squad = "Squad 2 (East Gate Crowd Control)";
                steps = [
                    "Alert Arena police dispatchers.",
                    "Dispatch Squad 2 to monitor perimeter and de-escalate.",
                    "Log security camera feeds in Sector North."
                ];
            } else if (inputLower.includes('crowd') || inputLower.includes('line') || inputLower.includes('wait') || inputLower.includes('bottleneck') || inputLower.includes('surge')) {
                severity = "MEDIUM";
                category = "Crowd Control";
                squad = "Squad 1 (North Gate Crowd Control)";
                steps = [
                    "Direct gate staff to open supplementary turnstiles.",
                    "Send digital navigation alert to fans recommending alternative gates.",
                    "Dispatch Squad 1 to establish guidance stanchions."
                ];
            } else if (inputLower.includes('leak') || inputLower.includes('spill') || inputLower.includes('trash') || inputLower.includes('garbage')) {
                severity = "LOW";
                category = "Facilities/Sanitation";
                squad = "Squad 4 (Janitorial Services)";
                steps = [
                    "Dispatch Squad 4 for clean-up.",
                    "Deploy 'Wet Floor' caution markers.",
                    "Assess stand equipment for valve leaks."
                ];
            }

            // Update UI Elements
            elements.triageSeverity.textContent = severity;
            elements.triageSeverity.className = 'badge';
            if (severity === 'HIGH') elements.triageSeverity.classList.add('badge-danger');
            else if (severity === 'MEDIUM') elements.triageSeverity.classList.add('badge-warning');
            else elements.triageSeverity.classList.add('badge-outline');

            elements.triageCategory.textContent = category;
            elements.triageSquad.textContent = squad;
            
            elements.triageSteps.innerHTML = '';
            steps.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                elements.triageSteps.appendChild(li);
            });

            // Dispatch squad in state
            const squadObj = state.squads.find(s => s.name.includes(squad.split(" ")[0]));
            if (squadObj) {
                squadObj.status = "Dispatched";
            }

            // Add to active incident queue
            const newId = state.activeIncidents.length > 0 ? Math.max(...state.activeIncidents.map(i => i.id)) + 1 : 1;
            state.activeIncidents.unshift({
                id: newId,
                text: inputText,
                severity: severity,
                category: category,
                squad: squad.split(" (")[0],
                location: "Sector East/Concourse",
                status: "Active",
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });

            renderOpsIncidents();
            renderSquads();

        }, 800);
    }

    elements.incidentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputText = elements.incidentInput.value.trim();
        if (inputText) {
            runIncidentTriage(inputText);
            elements.incidentInput.value = '';
        }
    });

    // === GenAI Multilingual Broadcast Generator ===
    const translateAPIMock = (promptText) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                let en = "Gate B is experiencing delays. Fans are advised to utilize Gate A to minimize entry times.";
                let es = "La puerta B está registrando demoras. Se aconseja a los aficionados utilizar la puerta A para minimizar los tiempos de ingreso.";
                let fr = "La porte B enregistre des retards. Les supporters sont priés d'emprunter la porte A afin de réduire l'attente.";
                
                const lower = promptText.toLowerCase();
                
                if (lower.includes('rain') || lower.includes('storm') || lower.includes('lightning') || lower.includes('weather')) {
                    en = "⛈️ Severe weather forecast near Azeca Stadium. Please seek shelter inside covered concourses immediately.";
                    es = "⛈️ Pronóstico de tormenta severa cerca del estadio. Por favor, busque refugio dentro de los pasillos cubiertos de inmediato.";
                    fr = "⛈️ Alerte météo violente à proximité du stade. Veuillez vous abriter immédiatement sous les coursives couvertes.";
                } else if (lower.includes('subway') || lower.includes('metro') || lower.includes('train') || lower.includes('delay')) {
                    en = "🚇 Express Transit Line 1 is experiencing signaling issues. Expect shuttle buses at Gate C to depart shortly.";
                    es = "🚇 La Línea 1 del Metro Express presenta fallas. Los autobuses de apoyo saldrán pronto desde la puerta C.";
                    fr = "🚇 La ligne 1 du métro express subit des retards. Des bus de secours partiront bientôt de la porte C.";
                } else if (lower.includes('game') || lower.includes('start') || lower.includes('kickoff')) {
                    en = "⚽ 60 minutes to kickoff. Gates are at optimal flow except Gate B. Please proceed to seats promptly.";
                    es = "⚽ 60 minutos para el silbatazo inicial. Las puertas están en flujo óptimo excepto la puerta B. Proceda a sus asientos.";
                    fr = "⚽ Kickoff dans 60 minutes. Toutes les portes sont fluides sauf la Porte B. Rejoignez vos sièges rapidement.";
                } else {
                    // Custom prompt translation simulation
                    en = promptText;
                    es = `[Traducido al Español por GenAI]: ${promptText.replace(/gate/gi, 'puerta').replace(/wait/gi, 'espera').replace(/minutes/gi, 'minutos')}`;
                    fr = `[Traduit en Français par GenAI]: ${promptText.replace(/gate/gi, 'porte').replace(/wait/gi, 'attente').replace(/minutes/gi, 'minutes')}`;
                }

                resolve({ en, es, fr });
            }, 1000);
        });
    };

    elements.broadcastForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = elements.broadcastPrompt.value.trim();
        if (prompt) {
            elements.broadcastOutput.classList.remove('hidden');
            elements.broadcastWave.classList.add('active');
            
            const result = await translateAPIMock(prompt);
            
            elements.broadcastWave.classList.remove('active');
            elements.broadcastTxtEn.textContent = result.en;
            elements.broadcastTxtEs.textContent = result.es;
            elements.broadcastTxtFr.textContent = result.fr;
        }
    });

    // Multilingual Text-to-Speech playback using standard Web Speech API
    document.querySelectorAll('.btn-audio').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            let text = "";
            let speechLang = "en-US";
            
            if (lang === 'en') {
                text = elements.broadcastTxtEn.textContent;
                speechLang = "en-US";
            } else if (lang === 'es') {
                text = elements.broadcastTxtEs.textContent;
                speechLang = "es-MX";
            } else if (lang === 'fr') {
                text = elements.broadcastTxtFr.textContent;
                speechLang = "fr-FR";
            }
            
            // Trigger actual synthesis if supported
            if ('speechSynthesis' in window) {
                // Cancel existing speeches
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = speechLang;
                utterance.rate = 0.95; // Slightly slower for clear stadium acoustics
                
                // Add indicator class during speech
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Playing...`;
                btn.disabled = true;
                
                utterance.onend = () => {
                    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> ${lang === 'en' ? 'Play Announcement' : lang === 'es' ? 'Reproducir' : 'Écouter'}`;
                    btn.disabled = false;
                };
                
                utterance.onerror = () => {
                    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Play Announcement`;
                    btn.disabled = false;
                };
                
                window.speechSynthesis.speak(utterance);
            } else {
                // Visual simulation fallback
                btn.innerHTML = `<i class="fa-solid fa-check"></i> Broadcast Completed`;
                setTimeout(() => {
                    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Play Announcement`;
                }, 2000);
            }
        });
    });

    // === Simulation Action Controllers ===

    // Gate B Surge Action
    elements.simBtnGateBSurge.addEventListener('click', () => {
        // Change gate status
        state.gates.B.wait = 48;
        state.gates.B.status = "CRITICAL BOTTLENECK";
        state.gates.B.color = "#FF3B30";
        document.getElementById('gate-time-B').textContent = "48 min";
        document.getElementById('gate-time-B').style.color = "#FF3B30";
        
        // Update map gate node status
        const gateBNode = document.querySelector('#map-gate-B circle');
        if (gateBNode) {
            gateBNode.className.baseVal = "gate-node node-danger animate-pulse-ring";
        }
        
        // Change KPI crowd density
        state.crowdDensity = 92;
        elements.kpiCrowdDensity.textContent = "92%";
        elements.kpiCrowdDensity.parentElement.classList.remove('border-primary');
        elements.kpiCrowdDensity.parentElement.classList.add('border-danger');
        
        // Update fan helper chat response context
        addBotMessage("🚨 **Stadium Ops Alert:** Gate B is currently clogged due to high ticket check bottlenecks. Walkways are redirected. Staff recommends fans bypass Gate B and use **Gate A (North)** for immediately faster entry.");
        
        // Auto trigger triage recommend
        runIncidentTriage("Crowd surge bottleneck at Gate B. Queue times exceeded 45 minutes.");
    });

    // Medical emergency alert
    elements.simBtnMedical.addEventListener('click', () => {
        runIncidentTriage("Medical emergency: Fan collapsed at Sector East Aisle 108 near concession stand.");
        
        // Flash operations view
        if (state.currentView !== 'ops') {
            addBotMessage("🚨 **Live Incident Triage Dispatch:** A medical emergency has been logged. Volunteer First Aid Squad 6 dispatched to Sector East Aisle 108. Response status is being monitored in Operations Command.");
        }
    });

    // Subway transit delays simulation
    elements.simBtnTransitDelay.addEventListener('click', () => {
        state.transitDelay = true;
        
        // Update transit line delays in GUI
        const transitBoard = document.querySelector('.transit-board');
        if (transitBoard) {
            transitBoard.innerHTML = `
                <div class="transit-item">
                    <div class="transit-route">
                        <span class="transit-icon rail" style="background:rgba(239, 68, 68, 0.15); color:var(--color-accent-red);"><i class="fa-solid fa-triangle-exclamation"></i></span>
                        <div>
                            <span class="route-name">Express Line 1 (Subway)</span>
                            <span class="route-desc" style="color:var(--color-accent-red);">SUSPENDED - Signal Failure</span>
                        </div>
                    </div>
                    <div class="transit-time text-danger">Delayed 30m</div>
                </div>
                <div class="transit-item">
                    <div class="transit-route">
                        <span class="transit-icon bus"><i class="fa-solid fa-bus"></i></span>
                        <div>
                            <span class="route-name">Shuttle Bus 12B</span>
                            <span class="route-desc">Extra Units Deployed to Gate C</span>
                        </div>
                    </div>
                    <div class="transit-time text-success">3 mins <span class="boarding">Boarding</span></div>
                </div>
                <div class="transit-item">
                    <div class="transit-route">
                        <span class="transit-icon rideshare"><i class="fa-solid fa-car"></i></span>
                        <div>
                            <span class="route-name">Ride-Share Lot C</span>
                            <span class="route-desc">Severe Traffic Around Stadium</span>
                        </div>
                    </div>
                    <div class="transit-time text-danger">40 min delay</div>
                </div>
            `;
        }

        // Auto trigger warning broadcast translation prompt
        elements.broadcastPrompt.value = "Express subway line 1 is suspended due to technical failure. Fans please proceed to Gate C transit depot for immediate shuttle buses.";
        elements.broadcastForm.dispatchEvent(new Event('submit'));
        
        // Notify fans through chatbot
        addBotMessage("⚠️ **Transit Advisory Alert:** Express Metro Line 1 is experiencing critical service delays. Venue organizers have dispatched additional Shuttle Buses to the Gate C transit zone. Please follow directional signs.");
    });

    // Reset Stadium variables
    elements.simBtnReset.addEventListener('click', () => {
        state.gates.B.wait = 24;
        state.gates.B.status = "Congested";
        state.gates.B.color = "#ef4444";
        document.getElementById('gate-time-B').textContent = "24 min";
        document.getElementById('gate-time-B').style.color = "var(--text-main)";
        
        const gateBNode = document.querySelector('#map-gate-B circle');
        if (gateBNode) {
            gateBNode.className.baseVal = "gate-node node-danger";
        }

        state.crowdDensity = 68;
        elements.kpiCrowdDensity.textContent = "68%";
        elements.kpiCrowdDensity.parentElement.classList.add('border-primary');
        elements.kpiCrowdDensity.parentElement.classList.remove('border-danger');

        state.transitDelay = false;
        const transitBoard = document.querySelector('.transit-board');
        if (transitBoard) {
            transitBoard.innerHTML = `
                <div class="transit-item">
                    <div class="transit-route">
                        <span class="transit-icon rail"><i class="fa-solid fa-train"></i></span>
                        <div>
                            <span class="route-name">Express Line 1 (Subway)</span>
                            <span class="route-desc">To Downtown / Fan Zone</span>
                        </div>
                    </div>
                    <div class="transit-time text-success">4 mins <span class="boarding">Boarding</span></div>
                </div>
                <div class="transit-item">
                    <div class="transit-route">
                        <span class="transit-icon bus"><i class="fa-solid fa-bus"></i></span>
                        <div>
                            <span class="route-name">Shuttle Bus 12B</span>
                            <span class="route-desc">To Public Park & Ride</span>
                        </div>
                    </div>
                    <div class="transit-time text-warning">12 mins</div>
                </div>
                <div class="transit-item">
                    <div class="transit-route">
                        <span class="transit-icon rideshare"><i class="fa-solid fa-car"></i></span>
                        <div>
                            <span class="route-name">Ride-Share Lot C</span>
                            <span class="route-desc">High Demand / Traffic Delay</span>
                        </div>
                    </div>
                    <div class="transit-time text-danger">25 min delay</div>
                </div>
            `;
        }

        state.activeIncidents = [
            { id: 1, text: "Congestion backlog forming at Gate B entrance", severity: "MEDIUM", category: "Crowd Control", squad: "Squad 2", location: "Gate B", status: "Active", time: "22:30" },
            { id: 2, text: "Minor water leak reported near concession stand 12", severity: "LOW", category: "Facilities", squad: "Squad 4", location: "South Concourse", status: "Active", time: "22:38" }
        ];

        state.squads.forEach(s => {
            if (s.name.includes("Squad 2") || s.name.includes("Squad 4")) {
                s.status = "Dispatched";
            } else {
                s.status = "Available";
            }
        });

        elements.triageOutput.classList.add('hidden');
        elements.broadcastOutput.classList.add('hidden');
        elements.broadcastPrompt.value = '';

        renderOpsIncidents();
        renderSquads();
        addBotMessage("🔄 **Operations Reset Complete:** Stadium queue simulation metrics, public transit maps, and incident logs have been reverted to baseline values.");
    });

    // Initialize display lists
    renderOpsIncidents();
    renderSquads();
});
