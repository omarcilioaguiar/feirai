import { ShoppingBag, Trash, CaretDown, CaretUp, PencilSimple, Plus, Save, X, Storefront } from '@phosphor-icons/react';
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

const toDateTimeLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
                date: toDateTimeLocal(session.date), // Store as local string YYYY-MM-DDTHH:mm
                items: res.data.items || []
            });
        } catch (err) {
            console.error(err);
            alert("Erro ao carregar detalhes da feira.");
        }
    };

    const handleSaveEdit = async () => {
        try {
            const totalItems = editingSession.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            const finalTotal = Math.max(0, totalItems - (editingSession.discount || 0));
            
            // Convert local current date string back to ISO before sending to API
            const isoDate = editingSession.date ? new Date(editingSession.date).toISOString() : new Date().toISOString();

            await api.put(`/sessions/${editingSession.id}`, {
                ...editingSession,
                date: isoDate,
                total: finalTotal
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

    const updateEditingItem = (itemId, field, value) => {
        const newItems = editingSession.items.map(item => 
            item.id === itemId ? { ...item, [field]: value } : item
        );
        setEditingSession({ ...editingSession, items: newItems });
    };

    const removeEditingItem = (itemId) => {
        const newItems = editingSession.items.filter(item => item.id !== itemId);
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
                            <div className="card-header-flex" style={{ marginBottom: '0.5rem' }}>
                                <div>
                                    <strong style={{ display: 'block' }}>{formatDate(h.date)}</strong>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Storefront size={16} /> {h.placeName || "Local não informado"}
                                    </span>
                                </div>
                                <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>
                                    {formatCurrency(h.total_amount)}
                                </strong>
                            </div>
                            
                            {expandedSessionId === h.id && sessionItems[h.id] && (
                                <div style={{ marginBottom: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    {sessionItems[h.id].slice()
                                        .sort((a,b) => (a.productName || '').localeCompare(b.productName || ''))
                                        .map((item, idx) => (
                                        <div key={idx} style={{ marginBottom: '0.8rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                <span>{item.productName || 'Produto s/ Nome'} ({item.unit === 'kg' ? (item.quantity || 0).toFixed(3) : Math.round(item.quantity || 0)}{item.unit})</span>
                                                <span>{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {h.discount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--primary)', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                            <span>DESCONTO DA FEIRA</span>
                                            <span>-{formatCurrency(h.discount)}</span>
                                        </div>
                                    )}
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
            <Modal isOpen={editingSession !== null} onClose={() => setEditingSession(null)} title="Editar Histórico da Feira" className="modal-wide">
                {editingSession && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Data</label>
                            <input 
                                type="datetime-local" 
                                className="form-control" 
                                value={editingSession.date || ''} 
                                onChange={(e) => setEditingSession({ ...editingSession, date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Local da Compra</label>
                            <select 
                                className="form-control" 
                                value={editingSession.place_id || ""} 
                                onChange={(e) => setEditingSession({ ...editingSession, place_id: e.target.value })}
                            >
                                <option value="" disabled>Escolha o local...</option>
                                {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '4px' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Itens da Feira</label>
                            {editingSession.items
                                .slice()
                                .sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))
                                .map((item) => (
                                <div key={item.id} style={{ 
                                    padding: '16px', 
                                    borderRadius: 'var(--radius-md)', 
                                    border: '1px solid var(--border)', 
                                    background: 'rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.productName || 'Produto s/ Nome'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{item.unit || 'UN'}</div>
                                        </div>
                                        <button className="icon-btn" style={{ color: 'var(--danger)', width: '32px', height: '32px' }} onClick={() => removeEditingItem(item.id)}>
                                            <Trash size={18} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '80px' }}>
                                            <label style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '2px', display: 'block' }}>Qtd</label>
                                            <input 
                                                type="number" 
                                                step={item.unit === 'kg' ? "0.001" : "1"}
                                                className="form-control" 
                                                value={item.quantity || 0} 
                                                onChange={(e) => updateEditingItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '80px' }}>
                                            <label style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '2px', display: 'block' }}>R$ Unit/kg</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className="form-control" 
                                                value={item.price || 0} 
                                                onChange={(e) => updateEditingItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div style={{ flex: 1, minWidth: '80px', textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Subtotal</div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{formatCurrency((item.price || 0) * (item.quantity || 0))}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem' }}>Desconto Geral da Feira (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="form-control" 
                                    value={Number(editingSession.discount || 0).toFixed(2)} 
                                    onChange={(e) => setEditingSession({ ...editingSession, discount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL RECALCULADO</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                    {formatCurrency(
                                        Math.max(0, 
                                            editingSession.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) 
                                            - (editingSession.discount || 0)
                                        )
                                    )}
                                </div>
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
