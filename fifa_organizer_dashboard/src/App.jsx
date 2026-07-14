import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, DollarSign, AlertTriangle, 
  CheckCircle, Clock, Volume2, Play, Plus, 
  MapPin, RefreshCw, Server, Send, XCircle
} from 'lucide-react';

// Set backend URL dynamically. Fallback to current host if served by server.ps1,
// or localhost:8000 for standard React npm run dev mode.
const DEFAULT_API_URL = window.location.port === '3000' ? 'http://localhost:8000' : '';

function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [activeTab, setActiveTab] = useState('overview');
  const [matches, setMatches] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [incSector, setIncSector] = useState('North');
  const [incCategory, setIncCategory] = useState('Crowd Congestion');
  const [incSeverity, setIncSeverity] = useState('MEDIUM');
  const [incDesc, setIncDesc] = useState('');
  
  // Broadcast states
  const [broadcastText, setBroadcastText] = useState('Emergency crowd detour active at Gate B. Use Gate A.');
  const [broadcastLang, setBroadcastLang] = useState('en-US');

  useEffect(() => {
    fetchData();
    // Auto-refresh metrics every 8 seconds
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const fetchData = async () => {
    try {
      setError(null);
      const matchesRes = await fetch(`${apiUrl}/api/matches`);
      const ticketsRes = await fetch(`${apiUrl}/api/tickets`);
      const incidentsRes = await fetch(`${apiUrl}/api/admin/incidents`);
      
      if (matchesRes.ok && ticketsRes.ok && incidentsRes.ok) {
        setMatches(await matchesRes.json());
        setTickets(await ticketsRes.json());
        setIncidents(await incidentsRes.json());
      } else {
        throw new Error('API server returned error status.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to API backend server. Check your connection URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!incDesc.trim()) return;

    try {
      const response = await fetch(`${apiUrl}/api/admin/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: incSector,
          category: incCategory,
          severity: incSeverity,
          description: incDesc.trim()
        })
      });

      if (response.ok) {
        setIncDesc('');
        fetchData();
      }
    } catch (err) {
      alert('Error creating incident: ' + err.message);
    }
  };

  const handleResolveIncident = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/api/admin/incidents/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      alert('Error resolving incident: ' + err.message);
    }
  };

  const handleTriggerSimulation = async (type) => {
    try {
      const response = await fetch(`${apiUrl}/api/admin/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        fetchData();
        alert(`Simulation: spawned ${type === 'congestion' ? 'Gate B Congestion' : 'Elevator Outage'} incident!`);
      }
    } catch (err) {
      alert('Error triggering simulation: ' + err.message);
    }
  };

  const handleSpeakBroadcast = () => {
    if (!broadcastText.trim()) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(broadcastText);
      utter.lang = broadcastLang;
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  // Math Helper calculations
  const totalRevenue = tickets.reduce((sum, t) => {
    const prices = { 1: 380, 2: 240, 3: 120 };
    return sum + (prices[t.catNum] || 0) + 15;
  }, 0);

  const activeIncidents = incidents.filter(i => i.status === 'ACTIVE');
  const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED');

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ animation: 'spin 1.5s linear infinite', color: '#FFE259' }} size={48} />
          <h2 style={{ color: 'white', marginTop: 16 }}>Loading Operational Control Panel...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(30, 45, 74, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #FFE259, #FFA751)', padding: 8, borderRadius: '50%', display: 'flex' }}>
            <Shield size={22} color="black" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: 0.5 }}>
              FIFAPass 26 <span style={{ fontSize: 13, color: '#FFE259', fontWeight: 600, borderLeft: '1px solid #1E2D4A', paddingLeft: 10, marginLeft: 10 }}>STADIUM COMMAND</span>
            </h1>
          </div>
        </div>

        {/* Server IP Configurer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(7, 11, 20, 0.5)', padding: '6px 12px', borderRadius: 8, border: '1px solid #1E2D4A' }}>
            <Server size={14} color="#FFE259" />
            <input 
              type="text" 
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: 12, width: 140 }}
            />
            <button onClick={fetchData} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <RefreshCw size={12} color="white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div style={{ display: 'flex', flex: 1 }}>
        
        {/* Sidebar */}
        <aside className="glass-panel" role="tablist" aria-label="Operations Tab List" style={{ width: 220, padding: 20, display: 'flex', flexDirection: 'column', gap: 8, borderRight: '1px solid rgba(30, 45, 74, 0.5)' }}>
          <button 
            onClick={() => setActiveTab('overview')} 
            className="glass-card"
            role="tab"
            aria-selected={activeTab === 'overview'}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: 'none', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
              color: activeTab === 'overview' ? '#FFE259' : 'white', width: '100%', fontWeight: 600,
              background: activeTab === 'overview' ? 'rgba(22, 32, 53, 0.8)' : 'transparent'
            }}
          >
            <Users size={16} /> Overview Command
          </button>
          <button 
            onClick={() => setActiveTab('incidents')} 
            className="glass-card"
            role="tab"
            aria-selected={activeTab === 'incidents'}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: 'none', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
              color: activeTab === 'incidents' ? '#FFE259' : 'white', width: '100%', fontWeight: 600,
              background: activeTab === 'incidents' ? 'rgba(22, 32, 53, 0.8)' : 'transparent'
            }}
          >
            <AlertTriangle size={16} /> Incident Queue ({activeIncidents.length})
          </button>
          <button 
            onClick={() => setActiveTab('scanner')} 
            className="glass-card"
            role="tab"
            aria-selected={activeTab === 'scanner'}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: 'none', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
              color: activeTab === 'scanner' ? '#FFE259' : 'white', width: '100%', fontWeight: 600,
              background: activeTab === 'scanner' ? 'rgba(22, 32, 53, 0.8)' : 'transparent'
            }}
          >
            <CheckCircle size={16} /> Scan Logs ({tickets.length})
          </button>
          <button 
            onClick={() => setActiveTab('simulate')} 
            className="glass-card"
            role="tab"
            aria-selected={activeTab === 'simulate'}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: 'none', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
              color: activeTab === 'simulate' ? '#FFE259' : 'white', width: '100%', fontWeight: 600,
              background: activeTab === 'simulate' ? 'rgba(22, 32, 53, 0.8)' : 'transparent'
            }}
          >
            <Volume2 size={16} /> Command Simulators
          </button>
        </aside>

        {/* Content Panel */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          
          {error && (
            <div style={{ background: 'rgba(239, 83, 80, 0.15)', border: '1px solid #ef5350', padding: '12px 16px', borderRadius: 10, color: '#ef5350', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'overview' && _renderOverview()}
          {activeTab === 'incidents' && _renderIncidents()}
          {activeTab === 'scanner' && _renderScannerLogs()}
          {activeTab === 'simulate' && _renderSimulators()}

        </main>
      </div>
    </div>
  );

  function _renderOverview() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="glass-panel" style={{ padding: 20, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'rgba(0, 230, 118, 0.1)', padding: 12, borderRadius: 12 }}>
              <Users size={24} color="#00E676" />
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>TICKETS BOOKED</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: 24, fontWeight: 800 }}>{tickets.length}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 20, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'rgba(255, 226, 89, 0.1)', padding: 12, borderRadius: 12 }}>
              <DollarSign size={24} color="#FFE259" />
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>TOTAL REVENUE</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: 24, fontWeight: 800 }}>${totalRevenue.toLocaleString()}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 20, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'rgba(239, 83, 80, 0.1)', padding: 12, borderRadius: 12 }}>
              <AlertTriangle size={24} color="#ef5350" />
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>ACTIVE ALERTS</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: 24, fontWeight: 800, color: activeIncidents.length > 0 ? '#ef5350' : 'white' }}>{activeIncidents.length}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 20, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'rgba(74, 144, 226, 0.1)', padding: 12, borderRadius: 12 }}>
              <CheckCircle size={24} color="#4A90E2" />
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>SCAN SYNC RATE</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: 24, fontWeight: 800 }}>100%</h3>
            </div>
          </div>
        </div>

        {/* Capacity dashboard */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'white', letterSpacing: 0.5 }}>Capacity Utilization dashboard</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {matches.map(m => {
              const maxCap = m.id === 'm4' ? 10 : m.id === 'm2' ? 50 : 250; // Dynamic capacity limits
              const sold = maxCap - m.ticketsLeft;
              const rate = (sold / maxCap) * 100;
              const isFull = m.ticketsLeft === 0;

              return (
                <div key={m.id} style={{ borderBottom: '1px solid rgba(30, 45, 74, 0.2)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>{m.group}</span>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: 15, fontWeight: 700 }}>{m.team1} vs. {m.team2} ({m.stadium})</h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 'bold', color: isFull ? '#ef5350' : 'white' }}>
                        {sold} / {maxCap} sold
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block' }}>{rate.toFixed(0)}% full</span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div style={{ height: 10, background: '#0D1524', borderRadius: 5, overflow: 'hidden', border: '1px solid #1E2D4A' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${rate}%`, 
                        background: rate >= 90 
                            ? 'linear-gradient(90deg, #ef5350, #d32f2f)' 
                            : 'linear-gradient(90deg, #FFE259, #FFA751)', 
                        borderRadius: 5 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function _renderIncidents() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        
        {/* Active Incident Reports */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'white' }}>Stands Incidents Queue</h3>

          {activeIncidents.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <CheckCircle size={48} style={{ marginBottom: 12, color: '#00E676' }} />
              <p style={{ margin: 0 }}>All stadium sectors clear. No active alerts.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeIncidents.map(inc => {
                const borderColors = { 'HIGH': '#ef5350', 'MEDIUM': '#ff9800', 'LOW': '#FFE259' };
                const textColors = { 'HIGH': '#ef5350', 'MEDIUM': '#ffaa33', 'LOW': '#FFE259' };

                return (
                  <div 
                    key={inc.id} 
                    style={{ 
                      padding: 16, borderRadius: 12, background: 'rgba(7, 11, 20, 0.4)', 
                      borderLeft: `4px solid ${borderColors[inc.severity] || '#1E2D4A'}`,
                      borderTop: '1px solid rgba(30, 45, 74, 0.4)',
                      borderRight: '1px solid rgba(30, 45, 74, 0.4)',
                      borderBottom: '1px solid rgba(30, 45, 74, 0.4)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 'bold', color: textColors[inc.severity] }}>{inc.severity} SEVERITY</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>•</span>
                        <span style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>{inc.category}</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>•</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> Sector {inc.sector}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 8px 0', fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{inc.description}</p>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {inc.timestamp}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleResolveIncident(inc.id)}
                      style={{ 
                        background: 'rgba(0, 230, 118, 0.1)', border: '1px solid #00E676', color: '#00E676', 
                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12
                      }}
                    >
                      Resolve
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resolved List divider */}
          {resolvedIncidents.length > 0 && (
            <>
              <h4 style={{ margin: '32px 0 12px 0', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Recently Resolved Log</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {resolvedIncidents.slice(0, 4).map(inc => (
                  <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(7, 11, 20, 0.2)', border: '1px solid rgba(30, 45, 74, 0.2)', borderRadius: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      [Sector {inc.sector}] {inc.category}: {inc.description}
                    </span>
                    <span style={{ color: '#00E676', fontSize: 12, fontWeight: 'bold' }}>RESOLVED</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Report New Incident panel */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'white' }}>Dispatch Incident</h3>
          
          <form onSubmit={handleCreateIncident} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>SECTOR LOCATION</label>
              <select 
                value={incSector} 
                onChange={(e) => setIncSector(e.target.value)}
                style={{ width: '100%', background: '#0D1524', border: '1px solid #1E2D4A', padding: 8, borderRadius: 8, color: 'white' }}
              >
                <option value="North">North (Gate A)</option>
                <option value="East">East (Gate B)</option>
                <option value="South">South (Gate C)</option>
                <option value="West">West (Gate D)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>CATEGORY</label>
              <select 
                value={incCategory} 
                onChange={(e) => setIncCategory(e.target.value)}
                style={{ width: '100%', background: '#0D1524', border: '1px solid #1E2D4A', padding: 8, borderRadius: 8, color: 'white' }}
              >
                <option value="Crowd Congestion">Crowd Congestion</option>
                <option value="Medical">Medical Urgent</option>
                <option value="Infrastructure">Infrastructure Fault</option>
                <option value="Security">Security Issue</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>SEVERITY LEVEL</label>
              <select 
                value={incSeverity} 
                onChange={(e) => setIncSeverity(e.target.value)}
                style={{ width: '100%', background: '#0D1524', border: '1px solid #1E2D4A', padding: 8, borderRadius: 8, color: 'white' }}
              >
                <option value="LOW">LOW Severity</option>
                <option value="MEDIUM">MEDIUM Severity</option>
                <option value="HIGH">HIGH Severity</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>DESCRIPTION</label>
              <textarea 
                value={incDesc} 
                onChange={(e) => setIncDesc(e.target.value)}
                placeholder="Describe the operational incident details..."
                rows={3}
                style={{ width: '100%', background: '#0D1524', border: '1px solid #1E2D4A', padding: 10, borderRadius: 8, color: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit"
              style={{ 
                width: '100%', height: 40, background: 'linear-gradient(90deg, #FFE259, #FFA751)', border: 'none', 
                borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <Plus size={16} /> Log & Dispatch
            </button>
          </form>
        </div>

      </div>
    );
  }

  function _renderScannerLogs() {
    return (
      <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'white' }}>Live Entrance Verification Stream</h3>
        
        {tickets.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>No verification scans processed yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map((t, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, 
                  background: 'rgba(7, 11, 20, 0.4)', border: '1px solid rgba(30, 45, 74, 0.4)', borderRadius: 10 
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{t.holder}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>•</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t.team1} VS {t.team2}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>•</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Sec {t.sec}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>SERIAL: {t.serial}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 4 }}>
                  <span style={{ color: '#00E676', fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} /> GRANTED (GATE {t.gate})
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t.datetime.split('•')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function _renderSimulators() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        
        {/* Command Simulators */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'white' }}>Gate Simulation Core</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
            Trigger real-time incidents on the backend server database to test crowd dispatches and the fan pathfinder routing alerts.
          </p>

          <button 
            onClick={() => handleTriggerSimulation('congestion')}
            style={{ 
              height: 48, background: 'rgba(239, 83, 80, 0.1)', border: '1px solid #ef5350', color: '#ef5350',
              borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <AlertTriangle size={16} /> Simulate Gate B Surge (Congestion)
          </button>

          <button 
            onClick={() => handleTriggerSimulation('delay')}
            style={{ 
              height: 48, background: 'rgba(255, 170, 51, 0.1)', border: '1px solid #ffaa33', color: '#ffaa33',
              borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <Clock size={16} /> Simulate West Concourse Delay
          </button>
        </div>

        {/* Emergency Broadcast Generator */}
        <div className="glass-panel" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: 'white' }}>GenAI Operations Announcer</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
            Broadcast emergency alerts through the stadium speakers. Type a message below and click **Play Announcement** to synthesize audio via the browser Speech Engine.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>BROADCAST SCRIPT</label>
              <textarea 
                value={broadcastText} 
                onChange={(e) => setBroadcastText(e.target.value)}
                rows={3}
                style={{ width: '100%', background: '#0D1524', border: '1px solid #1E2D4A', padding: 12, borderRadius: 8, color: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>LANGUAGE ENGINE</label>
                <select 
                  value={broadcastLang} 
                  onChange={(e) => setBroadcastLang(e.target.value)}
                  style={{ width: '100%', background: '#0D1524', border: '1px solid #1E2D4A', padding: 8, borderRadius: 8, color: 'white' }}
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="fr-FR">French (France)</option>
                  <option value="de-DE">German (Germany)</option>
                </select>
              </div>

              <div style={{ paddingTop: 16 }}>
                <button 
                  onClick={handleSpeakBroadcast}
                  style={{ 
                    height: 40, background: 'linear-gradient(90deg, #FFE259, #FFA751)', border: 'none', 
                    borderRadius: 8, padding: '0 24px', fontWeight: 700, cursor: 'pointer', color: 'black', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <Play size={16} fill="black" /> Play Announcement
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

export default App;
