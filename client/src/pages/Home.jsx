import { ShoppingCartSimple, Trash, Storefront, Sparkle, Plus, CheckCircle, QrCode } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';

import GooglePlaceAutocomplete from '../components/GooglePlaceAutocomplete';
import QrScanner from '../components/QrScanner';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Home() {
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [places, setPlaces] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    
    // Session State
    const [sessionPlaceId, setSessionPlaceId] = useState('');
    const [isNewPlaceModalOpen, setNewPlaceModalOpen] = useState(false);
    const [newPlaceData, setNewPlaceData] = useState({ name: '', location: '', lat: null, lng: null });

    // Item Form State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState(1);
    const [insight, setInsight] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // NFC-e Scanner State
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [isParsingReceipt, setIsParsingReceipt] = useState(false);
    const [scrapedItems, setScrapedItems] = useState(null);

        // Initial Load & Restore Persistent Cart and Session Place
    useEffect(() => {
        api.get('/products').then(res => setProducts(res.data)).catch(console.error);
        api.get('/places').then(res => setPlaces(res.data)).catch(console.error);

        const savedSessionPlace = localStorage.getItem('feirai_session_place');
        if (savedSessionPlace) setSessionPlaceId(savedSessionPlace);

        // Restore Cart from LocalStorage
        const savedCart = localStorage.getItem('feirai_active_cart');
        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if (parsedCart.length > 0) {
                if (confirm('Você possui uma feira em andamento. Deseja recuperar os itens no carrinho?')) {
                    setCart(parsedCart);
                } else {
                    localStorage.removeItem('feirai_active_cart');
                    localStorage.removeItem('feirai_session_place');
                    setSessionPlaceId('');
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
            localStorage.setItem('feirai_session_place', sessionPlaceId);
        } else {
            localStorage.removeItem('feirai_active_cart');
            localStorage.removeItem('feirai_session_place');
        }
    }, [cart, sessionPlaceId]);

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
        const place = places.find(p => p.id === sessionPlaceId);
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

    const handleCreateNewPlace = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/places', newPlaceData);
            setPlaces([...places, res.data]);
            setSessionPlaceId(res.data.id);
            setNewPlaceModalOpen(false);
            setNewPlaceData({ name: '', location: '', lat: null, lng: null });
        } catch (err) {
            console.error(err);
            alert("Erro ao criar novo local");
        }
    };

    const handleScanResult = async (url) => {
        setScannerOpen(false);
        setIsParsingReceipt(true);
        try {
            const res = await api.post('/receipts/parse', { url });
            setScrapedItems(res.data.items);
            // res.data.placeName is also available, but we use sessionPlaceId as required by user
        } catch (err) {
            console.error(err);
            alert("Erro ao ler nota fiscal. Verifique se a nota é compatível ou tente novamente.");
        } finally {
            setIsParsingReceipt(false);
        }
    };

    const confirmReceiptImport = async () => {
        if (!scrapedItems || !sessionPlaceId) return;
        try {
            await api.post('/sessions/import', {
                placeId: sessionPlaceId,
                items: scrapedItems
            });
            alert("Feira importada com sucesso!");
            setScrapedItems(null);
            // Optionally refresh history or UI if needed
        } catch (err) {
            console.error(err);
            alert("Erro ao importar a nota fiscal.");
        }
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
            
            <div className="header-split" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Local da Compra Atual:</label>
                    <select 
                        className="form-control" 
                        value={sessionPlaceId} 
                        onChange={(e) => {
                            if (e.target.value === 'NEW') setNewPlaceModalOpen(true);
                            else setSessionPlaceId(e.target.value);
                        }}
                        style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', appearance: 'none' }}
                        disabled={cart.length > 0} // Lock place if cart has items
                    >
                        <option value="" disabled>Selecione um local...</option>
                        {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="NEW" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>+ Adicionar Novo Local</option>
                    </select>
                </div>
                <Storefront size={28} weight="duotone" color="var(--primary)" />
            </div>

            <div className="header-split" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: '1.5rem' }}>
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

            <button className="fab-secondary" onClick={() => {
                if(places.length === 0) {
                    alert('Cadastre pelo menos 1 local para importar notas fiscais.');
                } else if (!sessionPlaceId) {
                    alert('Por favor, selecione ou adicione o Local da Compra no topo da tela antes de digitalizar uma nota.');
                } else setScannerOpen(true);
            }}>
                <QrCode weight="bold" />
            </button>

            <button className="fab" onClick={() => {
                if(products.length === 0 || places.length === 0) {
                    alert('Cadastre pelo menos 1 produto e 1 local para adicionar itens ao carrinho.');
                } else if (!sessionPlaceId) {
                    alert('Por favor, selecione ou adicione o Local da Compra no topo da tela antes de começar a feira.');
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

                    <div className="form-row-responsive" style={{ marginTop: '1rem' }}>
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

            {/* Modal for Creating New Place Inline */}
            <Modal isOpen={isNewPlaceModalOpen} onClose={() => setNewPlaceModalOpen(false)} title="Adicionar Novo Local">
                <form onSubmit={handleCreateNewPlace}>
                    <div className="form-group">
                        <label>Nome do Local</label>
                        <input type="text" className="form-control" required value={newPlaceData.name} onChange={e => setNewPlaceData({ ...newPlaceData, name: e.target.value })} placeholder="Ex: Carrefour" />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Busque o Endereço Automático</label>
                        <GooglePlaceAutocomplete 
                            onPlaceSelected={(place) => {
                                setNewPlaceData({
                                    ...newPlaceData,
                                    name: newPlaceData.name || place.name,
                                    location: place.address,
                                    lat: place.lat,
                                    lng: place.lng
                                });
                            }} 
                        />
                        {newPlaceData.location && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', padding: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginTop: '0.5rem' }}>
                                <strong>Endereço Selecionado:</strong><br/>
                                {newPlaceData.location}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Salvar Local</button>
                </form>
            </Modal>

            {/* QR Scanner Modal */}
            <Modal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} title="Escanear NFC-e">
                <p style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Aponte a câmera para o QR Code da nota fiscal eletrônica.</p>
                {isScannerOpen && (
                    <QrScanner 
                        onScan={handleScanResult} 
                        onError={(err) => console.log('QR Scan:', err)} 
                        onClose={() => setScannerOpen(false)} 
                    />
                )}
            </Modal>
            
            {/* Loading Overlay for Parsing */}
            {isParsingReceipt && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '1rem', color: 'white', fontWeight: 'bold' }}>Extraindo compras da nota...</p>
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Receipt Review Modal */}
            <Modal isOpen={scrapedItems !== null} onClose={() => setScrapedItems(null)} title="Revisão de Importação">
                <div style={{ padding: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Os produtos marcados como <strong>Novo (Genérico)</strong> serão cadastrados automaticamente no sistema. Demos o nosso melhor para associar itens existentes!
                </div>
                
                <div style={{ maxHeight: 'max(40vh, 300px)', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
                    {scrapedItems && scrapedItems.map((item, idx) => (
                        <div className="card" key={idx} style={{ marginBottom: '0.5rem', border: item.isNew ? '1px dashed var(--primary)' : '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <strong style={{ fontSize: '1rem', display: 'block', color: item.isNew ? 'var(--primary)' : 'var(--text-primary)' }}>
                                        {item.suggestedProductName} {item.isNew && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '6px' }}>NOVO (Genérico)</span>}
                                    </strong>
                                    <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Lido na nota: {item.name}</small>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(item.total)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {item.qty} {item.unit} x {formatCurrency(item.price)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary flex-1" onClick={() => setScrapedItems(null)}>Cancelar</button>
                    <button type="button" className="btn btn-primary flex-1" onClick={confirmReceiptImport}>
                        Importar {scrapedItems?.length} Itens
                    </button>
                </div>
            </Modal>
        </div>
    );
}
