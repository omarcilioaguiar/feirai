import { Sparkle, Plus, Trash, CheckCircle, Storefront } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Indica() {
    const [products, setProducts] = useState([]);
    const [selectedList, setSelectedList] = useState([]); // Array of { productId, quantity }
    const [optimizedList, setOptimizedList] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/products').then(res => setProducts(res.data)).catch(console.error);
    }, []);

    const addItemToList = (productId) => {
        const existing = selectedList.find(i => i.productId === productId);
        if (existing) {
            setSelectedList(selectedList.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedList([...selectedList, { productId, quantity: 1 }]);
        }
    };

    const removeItem = (productId) => setSelectedList(selectedList.filter(i => i.productId !== productId));

    const handleOptimize = async () => {
        if (selectedList.length === 0) return;
        setLoading(true);
        try {
            const res = await api.post('/optimize-list', { desiredItems: selectedList });
            setOptimizedList(res.data);
        } catch (e) {
            console.error(e);
            alert('Erro ao otimizar lista');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ paddingBottom: '100px' }}>
            <h2>FeirAI <span style={{ color: 'var(--primary)' }}>Indica</span></h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Selecione o que você precisa comprar e a IA dirá onde compensa mais ir hoje.
            </p>

            <div className="card">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Quero comprar:</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                    <select className="form-control" style={{ flex: 1 }} onChange={(e) => {
                        if (e.target.value) {
                            addItemToList(e.target.value);
                            e.target.value = "";
                        }
                    }}>
                        <option value="">Adicionar produto...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.brand ? `(${p.brand})` : ''}</option>)}
                    </select>
                </div>

                <div id="draft-list">
                    {selectedList.map(item => {
                        const p = products.find(prod => prod.id === item.productId);
                        return (
                            <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                <span>{p?.name} ({item.quantity} {p?.unit})</span>
                                <button className="icon-btn" onClick={() => removeItem(item.productId)} style={{ color: 'var(--danger)' }}>
                                    <Trash />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {selectedList.length > 0 && (
                    <button onClick={handleOptimize} className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} disabled={loading}>
                        <Sparkle weight="fill" style={{ marginRight: '8px' }} /> {loading ? 'Otimizando...' : 'Gerar Roteiro de Compra'}
                    </button>
                )}
            </div>

            {optimizedList && (
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Roteiro Sugerido</h3>
                    {optimizedList.map((item, idx) => (
                        <div key={idx} className="card premium-card" style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.productName}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.brand} | {item.quantity} {item.unit}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--primary)', fontWeight: 800 }}>{item.noHistory ? 'Sem Preço' : formatCurrency(item.estimatedTotal)}</div>
                                    <div style={{ fontSize: '0.75rem' }}>{item.noHistory ? '--' : `${formatCurrency(item.price)} un.`}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)' }}>
                                <Storefront weight="fill" />
                                <strong>{item.placeName || 'Não Encontrado'}</strong>
                            </div>
                        </div>
                    ))}
                    <div className="ai-insight" style={{ marginTop: '1rem' }}>
                        <div className="ai-icon"><CheckCircle weight="fill" /></div>
                        <div className="ai-text">
                            <div className="ai-title">Checklist Feito!</div>
                            <div className="ai-desc">Economia estimada com base no seu histórico real de compras.</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
