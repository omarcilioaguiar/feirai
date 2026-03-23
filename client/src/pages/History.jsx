import { ShoppingBag } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateStr) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(dateStr));

export default function History() {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        api.get('/sessions').then(res => setHistory(res.data)).catch(console.error);
    }, []);

    return (
        <div>
            <h2>Histórico de Feiras</h2>
            <div style={{ marginTop: '1rem' }}>
                {history.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhum histórico disponível ainda.</p>
                    </div>
                ) : (
                    history.map(h => (
                        <div className="card premium-card" key={h.id} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <strong>{formatDate(h.date)}</strong>
                                <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>
                                    {formatCurrency(h.total_amount)}
                                </strong>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <ShoppingBag weight="fill" style={{ marginRight: '4px' }} />
                                Feira Finalizada
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
