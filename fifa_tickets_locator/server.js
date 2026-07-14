const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions for reading/writing DB
function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            // Re-create default DB structure if it doesn't exist
            const defaultDB = { matches: [], bookedTickets: [] };
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf8');
            return defaultDB;
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading database:', err);
        return { matches: [], bookedTickets: [] };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing database:', err);
    }
}

// === API Endpoints ===

// 1. Get all matches
app.get('/api/matches', (req, res) => {
    const db = readDB();
    res.json(db.matches);
});

// 2. Get all booked tickets
app.get('/api/tickets', (req, res) => {
    const db = readDB();
    res.json(db.bookedTickets);
});

// 3. Book a new ticket
app.post('/api/bookings', (req, res) => {
    const { matchId, holderName, category, qty } = req.body;
    
    if (!matchId || !holderName || !category || !qty) {
        return res.status(400).json({ error: 'Missing required booking parameters.' });
    }

    const db = readDB();
    const matchIndex = db.matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
        return res.status(404).json({ error: 'Match not found.' });
    }

    const match = db.matches[matchIndex];
    const ticketQty = parseInt(qty);

    if (match.ticketsLeft < ticketQty) {
        return res.status(400).json({ error: 'Not enough seats available.' });
    }

    // Deduct ticket capacity
    match.ticketsLeft = Math.max(0, match.ticketsLeft - ticketQty);

    // Seating configurations
    const sectors = ['North', 'East', 'South', 'West'];
    const chosenSector = sectors[Math.floor(Math.random() * sectors.length)];
    const chosenRow = Math.floor(Math.random() * 40) + 1;
    const chosenSeat = Math.floor(Math.random() * 24) + 1;
    
    // Choose gate depending on sector location
    let chosenGate = 'B';
    if (chosenSector === 'North') chosenGate = 'A';
    else if (chosenSector === 'East') chosenGate = 'B';
    else if (chosenSector === 'South') chosenGate = 'C';
    else if (chosenSector === 'West') chosenGate = 'D';

    const categoryLabels = ["Category 1", "Category 2", "Category 3"];
    const catNum = parseInt(category);

    const ticket = {
        matchId: match.id,
        team1: match.team1,
        team2: match.team2,
        team1Flag: match.team1Flag,
        team2Flag: match.team2Flag,
        stadium: match.stadium,
        datetime: `${match.date} • ${match.time}`,
        holder: holderName,
        level: categoryLabels[catNum - 1] || `Category ${catNum}`,
        catNum: catNum,
        sec: `${chosenSector} ${Math.floor(Math.random() * 15) + 101}`,
        sector: chosenSector,
        row: chosenRow,
        seat: chosenSeat,
        gate: chosenGate,
        serial: `FIFA-${Math.floor(10000 + Math.random() * 90000)}-2026`
    };

    db.bookedTickets.push(ticket);
    writeDB(db);

    res.status(201).json(ticket);
});

// 4. Verify a ticket by serial number
app.post('/api/tickets/verify', (req, res) => {
    const { serial } = req.body;
    
    if (!serial) {
        return res.status(400).json({ error: 'Serial number is required.' });
    }

    const db = readDB();
    const ticket = db.bookedTickets.find(t => t.serial.toLowerCase() === serial.toLowerCase());

    if (!ticket) {
        return res.status(404).json({ verified: false, error: 'Invalid or unknown ticket serial.' });
    }

    res.json({
        verified: true,
        ticket: ticket
    });
});

const KB_PATH = path.join(__dirname, 'data', 'stadium_knowledge.json');

function getRelevantContext(query) {
    if (!fs.existsSync(KB_PATH)) return [];
    try {
        const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
        const cleanQuery = query.toLowerCase().replace(/[?.,]/g, '');
        const tokens = cleanQuery.split(/\s+/);
        
        const stopWords = new Set(["what", "is", "where", "the", "can", "i", "a", "of", "to", "in", "on", "at", "for", "with", "how", "do", "you"]);
        const filteredTokens = tokens.filter(t => t && !stopWords.has(t));
        const searchTokens = filteredTokens.length > 0 ? filteredTokens : tokens;
        
        const scoredChunks = kb.map(chunk => {
            let score = 0;
            if (chunk.keywords) {
                chunk.keywords.forEach(kw => {
                    searchTokens.forEach(tok => {
                        if (tok === kw.toLowerCase()) score += 2.0;
                    });
                });
            }
            searchTokens.forEach(tok => {
                if (chunk.content.toLowerCase().includes(tok)) score += 0.5;
            });
            return { chunk, score };
        });
        
        return scoredChunks
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(item => item.chunk);
    } catch (err) {
        console.error('Error in RAG retriever:', err);
        return [];
    }
}

// 5. Intelligent Assistant Chat Endpoint
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    const contextChunks = getRelevantContext(message);
    let retrievedText = '';
    contextChunks.forEach(chunk => {
        retrievedText += `Document: ${chunk.title}\nContent: ${chunk.content}\n\n`;
    });

    let geminiKey = process.env.GEMINI_API_KEY;
    const envPath = path.join(__dirname, '.env');
    if (!geminiKey && fs.existsSync(envPath)) {
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
            if (match) {
                geminiKey = match[1].trim();
            }
        } catch (e) {
            console.error('Error loading .env file:', e);
        }
    }

    let reply = null;

    if (geminiKey) {
        try {
            const systemInstruction = `You are the FIFA 2026 Seating Assistant Chatbot. You help fans navigate the stadium. You must answer the user's question using ONLY the facts provided in the Context below. If the context does not contain the answer, politely tell the user you don't know based on stadium guidelines. Do not make up facts. Keep answers concise, helpful, and formatted in clean markdown.\n\nContext:\n${retrievedText}`;
            const uri = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
            
            const response = await fetch(uri, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: message }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                })
            });

            if (response.ok) {
                const apiRes = await response.json();
                if (apiRes.candidates && apiRes.candidates.length > 0) {
                    reply = apiRes.candidates[0].content.parts[0].text;
                }
            }
        } catch (err) {
            console.error('Gemini RAG API failed, using fallback RAG:', err);
        }
    }

    if (!reply) {
        if (retrievedText) {
            let factsText = '';
            contextChunks.forEach(chunk => {
                factsText += `📖 **${chunk.title}**\n${chunk.content}\n\n`;
            });
            reply = `🤖 **Seat Guide Assistant (Offline RAG Mode):**\nHere are the official stadium guidelines I retrieved for your question:\n\n${factsText}*(Configure a GEMINI_API_KEY inside .env to enable full conversational AI responses!)*`;
        } else {
            reply = `🤖 **Seat Guide Assistant:**\nI couldn't find any specific match in the stadium database for your query. I can help you with gate access, bag policy, food options, elevators, or first aid. Try asking: *'What is the bag policy?'* or *'Where are restrooms?'*`;
        }
    }

    res.json({ response: reply });
});

// Fallback to serving the HTML index for single-page routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` FIFA 2026 Ticket Booking Backend Server started.   `);
    console.log(` Running locally at http://localhost:${PORT}/      `);
    console.log(`====================================================`);
});
