import { ShoppingCartSimple, Trash, Storefront, Sparkle, Plus, CheckCircle, QrCode, CloudArrowUp, Selection, Keyboard, PencilSimple } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';

import GooglePlaceAutocomplete from '../components/GooglePlaceAutocomplete';


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

    const [isNewProductModalOpen, setNewProductModalOpen] = useState(false);
    const [newProductData, setNewProductData] = useState({ name: '', unit: 'un', category: 'Geral' });

    // Item Form State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState(1);
    const [insight, setInsight] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);

    // NFC-e Scanner State
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [isParsingReceipt, setIsParsingReceipt] = useState(false);
    const [scrapedItems, setScrapedItems] = useState(null);

    // Backup State
    const [isBackingUp, setIsBackingUp] = useState(false);

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
        if (pid === 'NEW') {
            setNewProductModalOpen(true);
            return;
        }
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

        const newItem = { 
            id: editingItemId || Math.random().toString(), 
            productId: product.id, 
            placeId: place.id, 
            productName: product.name,
            placeName: place.name,
            unit: product.unit,
            price: numPrice, 
            qty: numQty, 
            total: numPrice * numQty 
        };

        if (editingItemId) {
            setCart(cart.map(item => item.id === editingItemId ? newItem : item));
        } else {
            setCart([...cart, newItem]);
        }
        
        setModalOpen(false);
        setEditingItemId(null);
        setSelectedProduct('');
        setPrice('');
        setQty(1);
        setInsight(null);
    };

    const editCartItem = (item) => {
        setEditingItemId(item.id);
        setSelectedProduct(item.productId);
        setPrice(item.price);
        setQty(item.qty);
        setModalOpen(true);
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

    const handleCreateNewProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/products', newProductData);
            setProducts([...products, res.data]);
            setSelectedProduct(res.data.id);
            setNewProductModalOpen(false);
            setNewProductData({ name: '', unit: 'un', category: 'Geral' });
        } catch (err) {
            console.error(err);
            alert("Erro ao criar novo produto");
        }
    };

    const handleOcrAnalysis = async (file) => {
        if (!file) return;
        setIsParsingReceipt(true);
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await api.post('/receipts/ocr', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setScrapedItems(res.data.items);
            setScannerOpen(false);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Erro ao analisar a foto.");
        } finally {
            setIsParsingReceipt(false);
        }
    };


    const confirmReceiptImport = async () => {
        if (!scrapedItems) return;
        try {
            // Step 1: Tell backend to map/create products and give us final IDs
            const res = await api.post('/sessions/import', {
                items: scrapedItems
            });
            
            // Step 2: Add these processed items to our CURRENT cart
            const newCartItems = res.data.processedItems.map(item => ({
                id: Math.random().toString(),
                productId: item.productId,
                placeId: sessionPlaceId,
                productName: item.suggestedProductName || item.name,
                placeName: places.find(p => p.id === sessionPlaceId)?.name || 'Local',
                unit: item.unit || 'un',
                price: item.price,
                qty: item.qty,
                total: item.price * item.qty
            }));

            setCart([...cart, ...newCartItems]);
            setScrapedItems(null);
            alert(`${newCartItems.length} itens adicionados ao seu carrinho!`);
        } catch (err) {
            console.error(err);
            alert("Erro ao importar a nota fiscal.");
        }
    };


    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const res = await api.post('/backup');
            alert(res.data.message || "Backup sincronizado com sucesso!");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Erro ao sicronizar o backup.");
        } finally {
            setIsBackingUp(false);
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
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="icon-btn" style={{ color: 'var(--primary)' }} onClick={() => editCartItem(item)}>
                                    <PencilSimple weight="fill" />
                                </button>
                                <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => removeCartItem(item.id)}>
                                    <Trash weight="fill" />
                                </button>
                            </div>
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

            <button className="fab-backup" onClick={handleBackup} disabled={isBackingUp}>
                {isBackingUp ? (
                    <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                    <CloudArrowUp weight="bold" />
                )}
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

            <Modal isOpen={isModalOpen} onClose={() => { setModalOpen(false); setEditingItemId(null); }} title={editingItemId ? "Editar Item" : "Adicionar à Feira"}>
                <form onSubmit={handleAddItem}>
                    <div className="form-group">
                        <label>Produto</label>
                        <select className="form-control" required value={selectedProduct} onChange={handleProductChange}>
                            <option value="" disabled>Selecione um produto...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                            <option value="NEW" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>+ Adicionar Novo Produto</option>
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

            {/* Modal for Creating New Product Inline */}
            <Modal isOpen={isNewProductModalOpen} onClose={() => setNewProductModalOpen(false)} title="Adicionar Novo Produto">
                <form onSubmit={handleCreateNewProduct}>
                    <div className="form-group">
                        <label>Nome do Produto</label>
                        <input type="text" className="form-control" required style={{ textTransform: 'uppercase' }} value={newProductData.name} onChange={e => setNewProductData({ ...newProductData, name: e.target.value.toUpperCase() })} placeholder="Ex: MAÇÃ FUJI" />
                    </div>
                    <div className="form-group">
                        <label>Unidade de Medida</label>
                        <select className="form-control" required value={newProductData.unit} onChange={e => setNewProductData({ ...newProductData, unit: e.target.value })}>
                            <option value="un">un</option>
                            <option value="kg">kg</option>
                            <option value="pc">pc</option>
                            <option value="lt">lt</option>
                            <option value="dz">dz</option>
                            <option value="cx">cx</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Categoria</label>
                        <select className="form-control" required value={newProductData.category} onChange={e => setNewProductData({ ...newProductData, category: e.target.value })}>
                            <option value="Geral">Geral</option>
                            <option value="Hortifruti">Hortifruti</option>
                            <option value="Carnes">Carnes</option>
                            <option value="Laticínios">Laticínios</option>
                            <option value="Padaria">Padaria</option>
                            <option value="Limpeza">Limpeza</option>
                            <option value="Higiene">Higiene</option>
                            <option value="Bebidas">Bebidas</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Salvar Produto</button>
                </form>
            </Modal>

            <Modal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} title="Analisar Nota via Foto">
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                        Tire uma foto nítida da sua nota fiscal. Nossa IA irá identificar os produtos e preços automaticamente.
                    </p>
                    
                    <label style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '3rem 2rem', 
                        border: '3px dashed var(--primary)', 
                        borderRadius: '20px',
                        background: 'rgba(var(--primary-rgb), 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }} className="hover-scale">
                        <Sparkle size={64} color="var(--primary)" weight="duotone" />
                        <span style={{ marginTop: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            Tirar Foto ou Abrir Galeria
                        </span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            style={{ display: 'none' }} 
                            onChange={(e) => handleOcrAnalysis(e.target.files[0])} 
                        />
                    </label>

                    <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Dica: Enquadre bem a lista de produtos para melhor precisão.
                    </p>
                </div>
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
                
                <div style={{ maxHeight: 'max(40vh, 400px)', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
                    {scrapedItems && scrapedItems.map((item, idx) => (
                        <div className="card" key={idx} style={{ marginBottom: '1rem', border: item.isNew ? '1px dashed var(--primary)' : '1px solid var(--border)', padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        style={{ flex: 1, fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}
                                        value={item.suggestedProductName}
                                        onChange={(e) => {
                                            const newItems = [...scrapedItems];
                                            newItems[idx].suggestedProductName = e.target.value.toUpperCase();
                                            setScrapedItems(newItems);
                                        }}
                                    />
                                    <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => setScrapedItems(scrapedItems.filter((_, i) => i !== idx))}>
                                        <Trash />
                                    </button>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Qtd</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            value={item.qty}
                                            onChange={(e) => {
                                                const newItems = [...scrapedItems];
                                                newItems[idx].qty = parseFloat(e.target.value) || 0;
                                                newItems[idx].total = newItems[idx].qty * newItems[idx].price;
                                                setScrapedItems(newItems);
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Preço (R$)</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            value={item.price}
                                            onChange={(e) => {
                                                const newItems = [...scrapedItems];
                                                newItems[idx].price = parseFloat(e.target.value) || 0;
                                                newItems[idx].total = newItems[idx].qty * newItems[idx].price;
                                                setScrapedItems(newItems);
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'right' }}>
                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block' }}>Total</label>
                                        <div style={{ fontWeight: 'bold', padding: '6px 0' }}>{formatCurrency(item.total)}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Texto original: {item.name}</div>
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
