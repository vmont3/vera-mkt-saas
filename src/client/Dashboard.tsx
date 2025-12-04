import React, { useState, useEffect } from 'react';

interface DashboardProps {
    tenantId: string;
    apiKey: string;
    theme?: { primaryColor: string; logoUrl: string; };
}

// Mock Data for Hive
const MOCK_AGENTS = [
    { id: '1', name: 'Sherlock Spy', role: 'SPY', status: 'SCANNING', xp: 1250, level: 2 },
    { id: '2', name: 'Boss Vera', role: 'MANAGER', status: 'IDLE', xp: 5000, level: 5 },
    { id: '3', name: 'Leo LinkedIn', role: 'CREATOR', status: 'WRITING', xp: 800, level: 1 },
    { id: '4', name: 'DaVinci', role: 'DESIGNER', status: 'RENDERING', xp: 950, level: 1 },
    { id: '5', name: 'Inspector Gadget', role: 'VERIFIER', status: 'AUDITING', xp: 2100, level: 3 },
];

const MOCK_PIPELINE = [
    { id: 't1', title: 'AI Trends 2025', status: 'DRAFT', platform: 'LINKEDIN' },
    { id: 't2', title: 'Sustainable Fashion', status: 'VERIFIED', platform: 'INSTAGRAM' },
    { id: 't3', title: 'Crypto Crash', status: 'PUBLISHED', platform: 'TWITTER' },
];

export const Dashboard: React.FC<DashboardProps> = ({ tenantId, theme }) => {
    const [activeTab, setActiveTab] = useState('HIVE');
    const [agents, setAgents] = useState(MOCK_AGENTS);

    const styles = {
        container: {
            display: 'flex',
            height: '100vh',
            fontFamily: "'Inter', sans-serif",
            backgroundColor: '#0f172a', // Dark Slate
            color: '#f8fafc'
        },
        sidebar: {
            width: '250px',
            backgroundColor: '#1e293b',
            padding: '20px',
            borderRight: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column' as 'column',
            gap: '10px'
        },
        main: {
            flex: 1,
            padding: '40px',
            overflowY: 'auto' as 'auto'
        },
        navItem: (isActive: boolean) => ({
            padding: '12px 15px',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: isActive ? (theme?.primaryColor || '#3b82f6') : 'transparent',
            color: isActive ? 'white' : '#94a3b8',
            fontWeight: 500,
            transition: 'all 0.2s'
        }),
        header: {
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        title: { fontSize: '32px', fontWeight: 700, letterSpacing: '-1px' },
        cardGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '25px'
        },
        card: {
            backgroundColor: '#1e293b',
            padding: '25px',
            borderRadius: '16px',
            border: '1px solid #334155',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        },
        statusDot: (status: string) => ({
            height: '10px',
            width: '10px',
            borderRadius: '50%',
            backgroundColor: status === 'IDLE' ? '#fbbf24' : '#22c55e',
            display: 'inline-block',
            marginRight: '8px'
        }),
        badge: {
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            backgroundColor: '#334155',
            color: '#e2e8f0'
        }
    };

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <aside style={styles.sidebar}>
                <div style={{ marginBottom: '30px', fontWeight: 'bold', fontSize: '20px', color: 'white' }}>
                    ⚡ VERA 5.0
                </div>
                {['OVERVIEW', 'HIVE', 'SEGMENTS', 'PIPELINE', 'SETTINGS'].map(tab => (
                    <div
                        key={tab}
                        style={styles.navItem(activeTab === tab)}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </div>
                ))}
            </aside>

            {/* Main Content */}
            <main style={styles.main}>
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.title}>Command Center</h1>
                        <p style={{ color: '#94a3b8' }}>Welcome back, Admin. The Hive is active.</p>
                    </div>
                    <div style={styles.badge}>{tenantId}</div>
                </header>

                {activeTab === 'HIVE' && (
                    <div style={styles.cardGrid}>
                        {agents.map(agent => (
                            <div key={agent.id} style={styles.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '18px' }}>{agent.name}</span>
                                    <span style={styles.badge}>Lvl {agent.level}</span>
                                </div>
                                <div style={{ color: '#94a3b8', marginBottom: '20px' }}>{agent.role}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={styles.statusDot(agent.status)}></span>
                                        <span style={{ fontSize: '14px' }}>{agent.status}</span>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#60a5fa' }}>{agent.xp} XP</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'PIPELINE' && (
                    <div style={styles.cardGrid}>
                        {['DRAFT', 'VERIFIED', 'PUBLISHED'].map(status => (
                            <div key={status} style={{ ...styles.card, backgroundColor: '#0f172a', border: '1px dashed #334155' }}>
                                <h3 style={{ marginBottom: '20px', color: '#94a3b8' }}>{status}</h3>
                                {MOCK_PIPELINE.filter(t => t.status === status).map(task => (
                                    <div key={task.id} style={{ ...styles.card, marginBottom: '15px', backgroundColor: '#1e293b' }}>
                                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>{task.platform}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
