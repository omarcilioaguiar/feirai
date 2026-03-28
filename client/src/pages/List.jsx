import { ShoppingBag, Trash, Storefront, Sparkle, PlusCircle } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function List() {
    const [list, setList] = useState([]);
    const [bestBargains, setBestBargains] = useState({}); // productId: { price, placeName }
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [listName, setListName] = useState('Minha Lista');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadList();
        api.get('/products').then(res => setProducts(res.data)).catch(console.error);
    }, []);

    const loadList = async () => {
        try {
            const res = await api.get('/shopping-list');
            const shoppingItems = res.data;
            setList(shoppingItems);
            
            // For each item in the list, try to find the best place to buy it
            const bargains = { ...bestBargains };
            for (const item of shoppingItems) {
                if (!bargains[item.product_id]) {
                    const insightRes = await api.get(`/insight/${item.product_id}`);
                    const history = insightRes.data;
                    if (history && history.length > 0) {
                        bargains[item.product_id] = history[0]; // First is cheapest as per API
                    }
                }
            }
            setBestBargains(bargains);
        } catch (err) {
            console.error(err);
        }
    };

    const addItem = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;
        setLoading(true);
        try {
            await api.post('/shopping-list', {
                productId: selectedProduct,
                quantity: qty,
                listName: listName || 'Minha Lista'
            });
            setSelectedProduct('');
            setQty(1);
            await loadList();
        } catch (err) {
            console.error(err);
            alert("Erro ao adicionar item à lista.");
        } finally {
            setLoading(false);
        }
    };

    const clearList = async () => {
        if (!window.confirm("Deseja limpar todos os itens da lista de planejamento?")) return;
        try {
            for (const item of list) {
                await api.delete(`/shopping-list/${item.id}`);
            }
            setList([]);
            setBestBargains({});
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

    // Grouping logic: ListName -> MarketName -> Items
    const listsGrouped = list.reduce((acc, item) => {
        const listTitle = item.list_name || 'Minha Lista';
        if (!acc[listTitle]) acc[listTitle] = {};
        
        const deal = bestBargains[item.product_id];
        const marketName = deal ? deal.placeName : 'Ainda sem local definido';
        
        if (!acc[listTitle][marketName]) acc[listTitle][marketName] = [];
        acc[listTitle][marketName].push({ ...item, deal });
        return acc;
    }, {});

    return (
        <div style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
               <ShoppingBag size={32} weight="duotone" color="var(--primary)" />
               <h2 style={{ margin: 0 }}>Planejamento Inteligente</h2>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Crie listas separadas e a IA organizará os itens pelo mercado com melhor preço histórico.
            </p>

            <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--primary)', backgroundColor: 'rgba(16, 185, 129, 0.03)' }}>
                <form onSubmit={addItem} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 2, minWidth: '150px', margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nome da Lista (ex: Feira Semana)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={listName} 
                            onChange={(e) => setListName(e.target.value)}
                            placeholder="Minha Lista"
                        />
                    </div>
                    <div className="form-group" style={{ flex: 3, minWidth: '200px', margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Produto</label>
                        <select 
                            className="form-control" 
                            value={selectedProduct} 
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            required
                        >
                            <option value="">Selecione um produto...</option>
                            {products
                                .slice()
                                .sort((a,b) => a.name.localeCompare(b.name))
                                .map(p => <option key={p.id} value={p.id}>{p.name} {p.brand ? `(${p.brand})` : ''}</option>)
                            }
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '80px', margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Qtd</label>
                        <input 
                            type="number" 
                            className="form-control" 
                            value={qty} 
                            onChange={(e) => setQty(parseFloat(e.target.value) || 0)} 
                            step="0.001"
                            min="0.001"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '42px', flex: 1 }} disabled={loading}>
                        <PlusCircle weight="fill" style={{ marginRight: '6px' }} /> {loading ? '...' : 'Adicionar'}
                    </button>
                </form>
            </div>

            {list.length === 0 ? (
                <div className="empty-state">
                    <Sparkle size={48} weight="light" style={{ opacity: 0.5 }} />
                    <h3>Nenhuma lista ativa</h3>
                    <p>Adicione um produto acima para começar seu planejamento.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {Object.keys(listsGrouped).sort().map(lName => (
                        <div key={lName}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.1rem', color: 'var(--primary)' }}>
                                    <ShoppingBag weight="fill" style={{ marginRight: '8px' }} /> {lName}
                                </h3>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {Object.keys(listsGrouped[lName]).sort().map(market => {
                                    const marketId = listsGrouped[lName][market][0].deal?.place_id;
                                    return (
                                        <div key={market} className="market-group">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Storefront size={24} weight="duotone" color="var(--secondary)" />
                                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{market}</h4>
                                                </div>
                                                {marketId && (
                                                    <button 
                                                        className="btn btn-primary" 
                                                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                                                        onClick={() => startShoppingAt(marketId, listsGrouped[lName][market])}
                                                    >
                                                        <PlusCircle style={{ marginRight: '4px' }} />
                                                        Ir ao Local
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {listsGrouped[lName][market].map(item => (
                                                    <div key={item.id} className="card" style={{ padding: '0.8rem 1.25rem', borderLeft: item.deal ? '4px solid var(--primary)' : '4px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>{item.productName}</div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                    {item.quantity} {item.unit}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                {item.deal && (
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>{formatCurrency(item.deal.price)}</div>
                                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>melhor ref.</div>
                                                                    </div>
                                                                )}
                                                                <button className="icon-btn" style={{ color: 'var(--danger)', width: '30px', height: '30px' }} onClick={() => removeItem(item.id)}>
                                                                    <Trash size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
