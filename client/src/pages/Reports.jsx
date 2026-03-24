import { Storefront, Sparkle, ChartPieSlice } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip } from 'chart.js';
import api from '../api';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip);

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Reports() {
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        api.get('/reports/summary').then(res => setReportData(res.data)).catch(console.error);
    }, []);

    if (!reportData) return <div className="empty-state"><p>Carregando relatórios...</p></div>;
    
    if (reportData.chartData.length === 0) {
        return <div className="empty-state"><p>Dados insuficientes. Finalize feiras para ver relatórios.</p></div>;
    }

    const { favPlace, chartData, categories, savingsOpportunities } = reportData;

    // Line Chart Data
    const lineData = {
        labels: chartData.map(d => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(d.date))),
        datasets: [{
            label: 'Total R$',
            data: chartData.map(d => d.total_amount),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            fill: true,
            tension: 0.4
        }]
    };

    // Doughnut Chart Data for Categories
    const categoryColors = ['#10B981', '#3B82F6', '#6366F1', '#F59E0B', '#EF4444'];
    const doughnutData = {
        labels: categories.map(c => c.category),
        datasets: [{
            data: categories.map(c => Math.round(c.total_spend)),
            backgroundColor: categoryColors,
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    return (
        <div>
            <h2>Relatórios <small style={{ color: 'var(--primary)', fontSize: '0.5em' }}><Sparkle weight="fill" /> Dashboard Avançado</small></h2>
            
            <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Gastos por Feira</h3>
                <div className="chart-container">
                    <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }} />
                </div>
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <Sparkle weight="fill" style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Oportunidades de Economia</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Confira onde cada item foi comprado pelo menor preço histórico.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {savingsOpportunities && savingsOpportunities.length > 0 ? (
                        savingsOpportunities.slice(0, 10).map((opt, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{opt.productName}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Storefront size={12} weight="fill" /> {opt.placeName}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(opt.bestPrice)}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Melhor Preço/{opt.unit}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Processando dados de economia...</p>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <ChartPieSlice weight="fill" style={{ color: 'var(--secondary)' }} />
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Tendências de Consumo</h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    O dia da semana onde o item costuma estar com o <b>menor preço médio</b> histórico.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                    {reportData.purchaseTrends && reportData.purchaseTrends.length > 0 ? (
                        reportData.purchaseTrends.map((trend, i) => {
                            const days = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];
                            return (
                                <div key={i} style={{ padding: '10px', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trend.productName}</div>
                                    <div style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: '0.9rem' }}>{days[parseInt(trend.bestDay)]}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Méd. {formatCurrency(trend.bestAvgPrice)}</div>
                                </div>
                            );
                        })
                    ) : <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Aguardando mais feiras para gerar tendências...</p>}
                </div>
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Gastos por Categoria</h3>
                {categories.length > 0 ? (
                    <div style={{ height: '200px', display: 'flex', justifyContent: 'center' }}>
                        <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
                    </div>
                ) : <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sem dados</p>}
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Local mais Frequente</h3>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                    <Storefront weight="fill" style={{ fontSize: '3rem', color: 'var(--secondary)', marginBottom: '0.5rem' }} />
                    <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        {favPlace ? favPlace.name : 'Ainda não calculado'}
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Onde você compra mais itens.</span>
                </div>
            </div>
        </div>
    );
}
