import { ShoppingBag, Trash, CaretDown, CaretUp, PencilSimple, Plus, Save, X } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateStr) => {
    try {
        return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(dateStr));
    } catch (e) {
        return dateStr;
    }
};

export default function History() {
    const [history, setHistory] = useState([]);
    const [expandedSessionId, setExpandedSessionId] = useState(null);
    const [sessionItems, setSessionItems] = useState({}); // { sessionId: [items] }
    const [editingSession, setEditingSession] = useState(null); // { id, total, items, date }
    const [products, setProducts] = useState([]);
    const [places, setPlaces] = useState([]);

    useEffect(() => {
        loadHistory();
        api.get('/products').then(res => setProducts(res.data)).catch(console.error);
        api.get('/places').then(res => setPlaces(res.data)).catch(console.error);
    }, []);

    const loadHistory = () => {
        api.get('/sessions').then(res => setHistory(res.data)).catch(console.error);
    };

    const toggleExpand = async (id) => {
        if (expandedSessionId === id) {
            setExpandedSessionId(null);
        } else {
            setExpandedSessionId(id);
            if (!sessionItems[id]) {
                try {
                    const res = await api.get(`/sessions/${id}`);
                    setSessionItems(prev => ({ ...prev, [id]: res.data.items }));
                } catch (err) {
                    console.error(err);
                }
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta feira do histórico?')) {
            try {
                await api.delete(`/sessions/${id}`);
                loadHistory();
            } catch (err) {
                console.error(err);
                alert("Erro ao excluir feira do histórico.");
            }
        }
    };

    const startEdit = async (session) => {
        try {
            const res = await api.get(`/sessions/${session.id}`);
            setEditingSession({
                ...session,
                items: res.data.items || []
            });
        } catch (err) {
            console.error(err);
            alert("Erro ao carregar detalhes da feira.");
        }
    };

    const handleSaveEdit = async () => {
        try {
            const total = editingSession.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            await api.put(`/sessions/${editingSession.id}`, {
                ...editingSession,
                total: total
            });
            setEditingSession(null);
            loadHistory();
            // Refresh expanded session items if it's the one we just edited
            if (expandedSessionId === editingSession.id) {
                const res = await api.get(`/sessions/${editingSession.id}`);
                setSessionItems(prev => ({ ...prev, [editingSession.id]: res.data.items }));
            }
            alert("Histórico atualizado com sucesso!");
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar histórico.");
        }
    };

    const updateEditingItem = (index, field, value) => {
        const newItems = [...editingSession.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditingSession({ ...editingSession, items: newItems });
    };

    const removeEditingItem = (index) => {
        const newItems = editingSession.items.filter((_, i) => i !== index);
        setEditingSession({ ...editingSession, items: newItems });
    };

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
                            
                            {expandedSessionId === h.id && sessionItems[h.id] && (
                                <div style={{ marginBottom: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    {sessionItems[h.id].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                            <span>{item.productName} ({Math.round(item.quantity)}{item.unit})</span>
                                            <span>{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    {sessionItems[h.id].length === 0 && <p style={{ fontSize: '0.8rem' }}>Sem itens registrados.</p>}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div 
                                    style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    onClick={() => toggleExpand(h.id)}
                                >
                                    <ShoppingBag weight="fill" style={{ marginRight: '4px' }} />
                                    {expandedSessionId === h.id ? 'Ocultar Itens' : 'Ver Itens'}
                                    {expandedSessionId === h.id ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className="icon-btn" 
                                        style={{ color: 'var(--primary)', padding: '8px' }}
                                        onClick={() => startEdit(h)}
                                    >
                                        <PencilSimple weight="fill" />
                                    </button>
                                    <button 
                                        className="icon-btn" 
                                        style={{ color: 'var(--danger)', padding: '8px' }}
                                        onClick={() => handleDelete(h.id)}
                                    >
                                        <Trash weight="fill" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal for Editing Session */}
            <Modal isOpen={editingSession !== null} onClose={() => setEditingSession(null)} title="Editar Histórico da Feira">
                {editingSession && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Data</label>
                            <input 
                                type="datetime-local" 
                                className="form-control" 
                                value={editingSession.date && editingSession.date.length >= 16 ? editingSession.date.substring(0, 16) : ''} 
                                onChange={(e) => setEditingSession({ ...editingSession, date: new Date(e.target.value).toISOString() })}
                            />
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label>Itens da Feira</label>
                            {editingSession.items.map((item, idx) => (
                                <div key={idx} className="card" style={{ padding: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '0.9rem' }}>{item.productName}</strong>
                                        <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeEditingItem(idx)}>
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Qtd</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={item.quantity} 
                                                onChange={(e) => updateEditingItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Preço Unit.</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className="form-control" 
                                                value={item.price} 
                                                onChange={(e) => updateEditingItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'right' }}>
                                            <label style={{ fontSize: '0.7rem' }}>Total</label>
                                            <div style={{ fontWeight: 600, padding: '6px 0' }}>{formatCurrency(item.price * item.quantity)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL RECALCULADO</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                {formatCurrency(editingSession.items.reduce((sum, i) => sum + (i.price * i.quantity), 0))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button className="btn btn-secondary flex-1" onClick={() => setEditingSession(null)}>Cancelar</button>
                            <button className="btn btn-primary flex-1" onClick={handleSaveEdit}>Salvar Alterações</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
