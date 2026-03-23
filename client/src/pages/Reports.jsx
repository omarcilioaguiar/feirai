import { Storefront, Sparkle } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip } from 'chart.js';
import api from '../api';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip);

export default function Reports() {
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        api.get('/reports/summary').then(res => setReportData(res.data)).catch(console.error);
    }, []);

    if (!reportData) return <div className="empty-state"><p>Carregando relatórios...</p></div>;
    
    if (reportData.chartData.length === 0) {
        return <div className="empty-state"><p>Dados insuficientes. Finalize feiras para ver relatórios.</p></div>;
    }

    const { favPlace, chartData, categories } = reportData;

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
