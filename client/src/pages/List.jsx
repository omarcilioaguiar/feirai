import { ShoppingBag, Trash, Storefront, Sparkle, PlusCircle } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function List() {
    const [list, setList] = useState([]);
    const [bestBargains, setBestBargains] = useState({}); // productId: { price, placeName }
    const navigate = useNavigate();

    useEffect(() => {
        loadList();
    }, []);

    const loadList = async () => {
        try {
            const res = await api.get('/shopping-list');
            setList(res.data);
            
            // For each item in the list, try to find the best place to buy it
            const bargains = {};
            for (const item of res.data) {
                const insightRes = await api.get(`/insight/${item.product_id}`);
                const history = insightRes.data;
                if (history && history.length > 0) {
                    bargains[item.product_id] = history[0]; // First is cheapest as per API
                }
            }
            setBestBargains(bargains);
        } catch (err) {
            console.error(err);
        }
    };

    const startShoppingAt = async (marketId, items) => {
        if (!marketId || marketId === 'null') return;
        
        // Prepare items for the cart
        const cartItems = items.map(i => ({
            id: Date.now() + Math.random(),
            productId: i.product_id,
            productName: i.productName,
            placeId: marketId,
            placeName: i.deal ? i.deal.placeName : 'Desconhecido',
            unit: i.unit,
            price: i.deal ? i.deal.price : 0, 
            qty: i.quantity,
            total: (i.deal ? i.deal.price : 0) * i.quantity,
            shoppingListId: i.id
        }));

        // Merge carts? No, according to instructions: "clear the cart"
        const newCart = [...cartItems];
        
        // Save to localStorage
        localStorage.setItem('feirai_active_cart', JSON.stringify(newCart));
        localStorage.setItem('feirai_session_place', marketId);
        localStorage.setItem('feirai_skip_confirm', 'true'); // Flag to skip the confirm on Home
        
        // Redirect to Home
        navigate('/');
    };

    const removeItem = async (id) => {
        try {
            await api.delete(`/shopping-list/${id}`);
            setList(list.filter(i => i.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    // Grouping logic
    const groupedList = list.reduce((acc, item) => {
        const deal = bestBargains[item.product_id];
        const groupName = deal ? deal.placeName : 'Ainda sem local definido';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push({ ...item, deal });
        return acc;
    }, {});

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
               <ShoppingBag size={32} weight="duotone" color="var(--primary)" />
               <h2 style={{ margin: 0 }}>Lista de Economia</h2>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Itens guardados para comprar em outro local com melhor preço.
            </p>

            {list.length === 0 ? (
                <div className="empty-state">
                    <Sparkle size={48} weight="light" style={{ opacity: 0.5 }} />
                    <h3>Lista Vazia</h3>
                    <p>Adicione itens aqui quando encontrar preços altos durante a feira.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.keys(groupedList).sort().map(market => {
                        const marketId = groupedList[market][0].deal?.place_id;
                        return (
                        <div key={market} className="market-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Storefront size={24} weight="duotone" color="var(--secondary)" />
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{market}</h3>
                                </div>
                                {marketId && (
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                        onClick={() => startShoppingAt(marketId, groupedList[market])}
                                    >
                                        <PlusCircle style={{ marginRight: '4px' }} />
                                        Iniciar Compra
                                    </button>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {groupedList[market].map(item => (
                                    <div key={item.id} className="card" style={{ borderLeft: item.deal ? '4px solid var(--primary)' : '4px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{item.productName}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    Quantidade: {item.quantity} {item.unit}
                                                </div>
                                            </div>
                                            <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeItem(item.id)}>
                                                <Trash size={20} />
                                            </button>
                                        </div>

                                        {item.deal && (
                                            <div style={{ marginTop: '0.8rem', padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Melhor preço recorde:</span>
                                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(item.deal.price)}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
