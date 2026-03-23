import { ShoppingCartSimple, Trash, Storefront, Sparkle, Plus, CheckCircle } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Home() {
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [places, setPlaces] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    
    // Form State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedPlace, setSelectedPlace] = useState('');
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState(1);
    const [insight, setInsight] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Initial Load & Restore Persistent Cart
    useEffect(() => {
        api.get('/products').then(res => setProducts(res.data)).catch(console.error);
        api.get('/places').then(res => setPlaces(res.data)).catch(console.error);

        // Restore Cart from LocalStorage
        const savedCart = localStorage.getItem('feirai_active_cart');
        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if (parsedCart.length > 0) {
                if (confirm('Você possui uma feira em andamento. Deseja recuperar os itens no carrinho?')) {
                    setCart(parsedCart);
                } else {
                    localStorage.removeItem('feirai_active_cart');
                }
            }
        }

        // Try getting user location for enhanced AI insight
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.warn('Geolocation disabled or failed.', err)
            );
        }
    }, []);

    // Persist Cart to LocalStorage whenever it changes
    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('feirai_active_cart', JSON.stringify(cart));
        } else {
            localStorage.removeItem('feirai_active_cart');
        }
    }, [cart]);

    // Haversine formula to get distance in km
    const getDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    const fetchInsight = async (productId) => {
        if (!productId) return;
        try {
            const res = await api.get(`/insight/${productId}`);
            const purchases = res.data; // Array of purchases
            
            if (purchases && purchases.length > 0) {
                let bestOption = purchases[0]; // defaults to cheapest if no geodistance
                let infoMessage = `A última vez mais em conta foi no <b>${bestOption.placeName}</b> por ${formatCurrency(bestOption.price)}.`;

                if (userLocation) {
                    // Cost-benefit evaluation
                    let bestScore = Infinity;
                    const travelCostPerKm = 1.50; // Arbitrary cost for travel
                    
                    for (const p of purchases) {
                        const dist = getDistance(userLocation.lat, userLocation.lng, p.lat, p.lng);
                        if (dist !== null) {
                            const simulatedTotalCost = p.price + (dist * travelCostPerKm);
                            if (simulatedTotalCost < bestScore) {
                                bestScore = simulatedTotalCost;
                                bestOption = p;
                                infoMessage = `Melhor Custo x Benefício: <b>${p.placeName}</b> a ${dist.toFixed(1)}km.<br>Preço histórico: ${formatCurrency(p.price)}.`;
                            }
                        }
                    }
                }

                setInsight({
                    message: infoMessage,
                    placeId: bestOption.place_id,
                    price: bestOption.price
                });
                setSelectedPlace(bestOption.place_id);
                setPrice(bestOption.price);
            } else {
                setInsight(null);
            }
        } catch(e) { console.error(e); }
    };

    const handleProductChange = (e) => {
        const pid = e.target.value;
        setSelectedProduct(pid);
        fetchInsight(pid);
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        const product = products.find(p => p.id === selectedProduct);
        const place = places.find(p => p.id === selectedPlace);
        if(!product || !place) return;

        const numPrice = parseFloat(price) || 0;
        const numQty = parseFloat(qty) || 1;

        setCart([
            ...cart, 
            { 
                id: Math.random().toString(), 
                productId: product.id, 
                placeId: place.id, 
                productName: product.name,
                placeName: place.name,
                unit: product.unit,
                price: numPrice, 
                qty: numQty, 
                total: numPrice * numQty 
            }
        ]);
        
        setModalOpen(false);
        setSelectedProduct('');
        setPrice('');
        setQty(1);
        setInsight(null);
    };

    const removeCartItem = (id) => setCart(cart.filter(i => i.id !== id));

    const totalCart = cart.reduce((sum, item) => sum + item.total, 0);

    const finishShopping = async () => {
        if(confirm('Deseja finalizar esta feira e salvar no histórico?')) {
            try {
                await api.post('/sessions', {
                    total: totalCart,
                    items: cart.map(i => ({ productId: i.productId, placeId: i.placeId, price: i.price, quantity: i.qty }))
                });
                setCart([]);
                alert("Feira finalizada com sucesso!");
            } catch (e) {
                console.error(e);
                alert("Erro ao finalizar feira");
            }
        }
    };

    return (
        <div>
            <div className="total-display">
                <div className="total-label">Subtotal da Feira</div>
                <div className="total-amount">
                    <span className="currency">R$</span>
                    <span>{totalCart.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>
            
            <div className="header-split" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: '1rem' }}>
                <h3>Itens no Carrinho</h3>
            </div>

            <div id="cart-list" style={{ marginTop: '1rem' }}>
                {cart.length === 0 ? (
                    <div className="empty-state">
                        <ShoppingCartSimple size={64} weight="light" />
                        <h3>Carrinho Vazio</h3>
                        <p>Adicione itens para começar a feira.</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div className="list-item" key={item.id}>
                            <div className="item-main">
                                <span className="item-name">{item.productName}</span>
                                <span className="item-meta">
                                    <Storefront /> {item.placeName}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="item-price">{formatCurrency(item.total)}</div>
                                <div className="item-qty">{Math.round(item.qty)} {item.unit} x {formatCurrency(item.price)}</div>
                            </div>
                            <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeCartItem(item.id)}>
                                <Trash weight="fill" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <button className="fab" onClick={() => {
                if(products.length === 0 || places.length === 0) {
                    alert('Cadastre pelo menos 1 produto e 1 local para adicionar itens ao carrinho.');
                } else setModalOpen(true);
            }}>
                <Plus weight="bold" />
            </button>
            
            {cart.length > 0 && (
                <button onClick={finishShopping} className="btn btn-primary btn-block" style={{ marginTop: '2rem' }}>
                    <CheckCircle weight="fill" style={{ marginRight: '8px' }} /> Finalizar Feira
                </button>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Adicionar à Feira">
                <form onSubmit={handleAddItem}>
                    <div className="form-group">
                        <label>Produto</label>
                        <select className="form-control" required value={selectedProduct} onChange={handleProductChange}>
                            <option value="" disabled>Selecione um produto...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                        </select>
                    </div>
                    
                    {insight && (
                        <div className="ai-insight">
                            <div className="ai-icon"><Sparkle weight="fill" /></div>
                            <div className="ai-text">
                                <div className="ai-title">Dica Inteligente</div>
                                <div className="ai-desc" dangerouslySetInnerHTML={{ __html: insight.message }}></div>
                            </div>
                        </div>
                    )}

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>Supermercado/Local</label>
                        <select className="form-control" required value={selectedPlace} onChange={e => setSelectedPlace(e.target.value)}>
                            <option value="" disabled>Selecione o local...</option>
                            {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-row-responsive">
                        <div className="form-group flex-1">
                            <label>Preço Unit. (R$)</label>
                            <input type="number" step="0.01" min="0" className="form-control" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="form-group flex-1">
                            <label>Quantidade</label>
                            <div className="qty-picker">
                                <button type="button" className="qty-btn" 
                                    onClick={() => setQty(prev => Math.max(1, prev - 1))}>
                                     <span>−</span>
                                </button>
                                <input type="number" step="1" min="1" className="form-control qty-input" required value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} />
                                <button type="button" className="qty-btn" 
                                    onClick={() => setQty(prev => prev + 1)}>
                                    <span>+</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total do Item</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {formatCurrency((parseFloat(price) || 0) * (parseFloat(qty) || 0))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block">Adicionar Item</button>
                </form>
            </Modal>
        </div>
    );
}
