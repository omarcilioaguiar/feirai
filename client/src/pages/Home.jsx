import { ShoppingCartSimple, Trash, Storefront, Sparkle, Plus, CheckCircle, QrCode, CloudArrowUp, Selection, Keyboard, PencilSimple, Tag } from '@phosphor-icons/react';
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

    // Overall Discount State
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

    // NFC-e Scanner State
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [isSpeedDialOpen, setSpeedDialOpen] = useState(false);
    const [isParsingReceipt, setIsParsingReceipt] = useState(false);
    const [scrapedItems, setScrapedItems] = useState(null);

    // Backup State
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [openSessions, setOpenSessions] = useState([]); // List of sessions from DB


    // Searchable Drops State
    const [productSearch, setProductSearch] = useState('');
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [placeSearch, setPlaceSearch] = useState('');
    const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);
    const [paidAmount, setPaidAmount] = useState(''); // State for "Valor Pago" logic

    // Initial Load & Restore Persistent Cart and Session Place
    useEffect(() => {
        api.get('/products').then(res => setProducts(res.data)).catch(console.error);
        api.get('/places').then(res => setPlaces(res.data)).catch(console.error);

        // Fetch Open Sessions from DB for Multi-device resume
        api.get('/open-sessions').then(res => {
            if (res.data) setOpenSessions(res.data);
            if (res.data && res.data.length > 0) {
                const session = res.data[0];
                const savedCart = localStorage.getItem('feirai_active_cart');
                
                if (!savedCart || JSON.parse(savedCart).length === 0) {
                   if (confirm(`Você possui uma feira aberta em outro dispositivo (${session.placeName || 'Sem Local'}). Deseja retomar?`)) {
                       resumeSession(session);
                   }
                }
            }
        }).catch(console.error);

        const savedSessionPlace = localStorage.getItem('feirai_session_place');
        if (savedSessionPlace) setSessionPlaceId(savedSessionPlace);

        // Restore Cart and Overall Discount from LocalStorage
        const savedCart = localStorage.getItem('feirai_active_cart');
        const savedOverallDiscount = localStorage.getItem('feirai_active_discount');
        const skipConfirm = localStorage.getItem('feirai_skip_confirm');

        if (savedOverallDiscount) setOverallDiscount(parseFloat(savedOverallDiscount) || 0);

        const sanitizeCart = (items) => {
            if (!Array.isArray(items)) return [];
            return items.map(i => {
                const numPrice = Number(i.price || 0);
                const numQty = Number(i.qty || i.quantity || 0);
                const numDisc = Number(i.discount || 0);
                return {
                    ...i,
                    price: numPrice,
                    qty: numQty,
                    discount: numDisc,
                    total: (numPrice * numQty) - numDisc
                };
            });
        };

        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if (parsedCart.length > 0) {
                if (skipConfirm === 'true') {
                    setCart(sanitizeCart(parsedCart));
                    localStorage.removeItem('feirai_skip_confirm');
                } else if (confirm('Você possui uma feira em andamento. Deseja recuperar os itens no carrinho?')) {
                    setCart(sanitizeCart(parsedCart));
                } else {
                    localStorage.removeItem('feirai_active_cart');
                    localStorage.removeItem('feirai_session_place');
                    localStorage.removeItem('feirai_active_discount');
                    setSessionPlaceId('');
                    setOverallDiscount(0);
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

    // Persist Cart and Overall Discount to DB (Autosave with debounce)
    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('feirai_active_cart', JSON.stringify(cart));
            localStorage.setItem('feirai_session_place', sessionPlaceId);
            localStorage.setItem('feirai_active_discount', overallDiscount.toString());

            // Autosave to Server (Syncs to Cloud)
            const timeout = setTimeout(() => {
                api.post('/open-sessions', {
                    id: 'current_session', // Use a fixed ID for the active session to simplify
                    place_id: sessionPlaceId,
                    items: cart,
                    discount: overallDiscount
                }).catch(err => console.error("Autosave failed:", err));
            }, 2000); 

            return () => clearTimeout(timeout);
        } else {
            localStorage.removeItem('feirai_active_cart');
            localStorage.removeItem('feirai_session_place');
            localStorage.removeItem('feirai_active_discount');
            // Clean up server side if empty
            api.delete('/open-sessions/current_session').catch(() => {});
        }
    }, [cart, sessionPlaceId, overallDiscount]);

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
                    bestPrice: bestOption.price,
                    bestPlace: bestOption.placeName
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

        // Reset qty based on new unit
        const product = products.find(p => p.id === pid);
        if (product && product.unit === 'kg') {
            setQty(0);
        } else {
            setQty(1);
        }
    };

    const handleQuantityChange = (val) => {
        if (selectedProductUnit === 'kg') {
            // Remove non-digits and shift by 1000 for kg items
            const digits = val.replace(/\D/g, '');
            if (digits === '') return setQty(0);
            const num = parseInt(digits, 10);
            setQty(num / 1000);
        } else {
            setQty(parseFloat(val) || 0);
        }
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
            const oldItem = cart.find(i => i.id === editingItemId);
            setCart(cart.map(item => item.id === editingItemId ? { ...newItem, shoppingListId: oldItem?.shoppingListId } : item));
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

    const handleSaveToList = async () => {
        if (!selectedProduct) return;
        try {
            await api.post('/shopping-list', {
                productId: selectedProduct,
                quantity: qty
            });
            setModalOpen(false);
            alert("Item guardado na sua Lista de Economia!");
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar na lista");
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

    const totalCart = Math.max(0, cart.reduce((sum, item) => sum + item.total, 0) - overallDiscount);

    const finishShopping = async () => {
        if(confirm('Deseja finalizar esta feira e salvar no histórico?')) {
            try {
                await api.post('/sessions', {
                    total: totalCart,
                    discount: overallDiscount,
                    place_id: sessionPlaceId,
                    items: cart.map(i => ({ 
                        productId: i.productId, 
                        placeId: i.placeId, 
                        price: i.price, 
                        quantity: i.qty,
                        discount: i.discount || 0
                    }))
                });
                // Clear from economy list (it was finalized)
                for (const item of cart) {
                    if (item.shoppingListId) {
                        try {
                            await api.delete(`/shopping-list/${item.shoppingListId}`);
                        } catch (err) {
                            console.error("Erro ao remover item da lista de economia:", err);
                        }
                    }
                }
                
                setCart([]);
                setOverallDiscount(0);
                alert("Feira finalizada com sucesso!");
            } catch (e) {
                console.error(e);
                alert("Erro ao finalizar feira");
            }
        }
    };

    const selectedProductUnit = products.find(p => p.id === selectedProduct)?.unit;

    const resumeSession = (session) => {
        setCart(session.items.map(i => {
            const numPrice = Number(i.price || 0);
            const numQty = Number(i.quantity || 0);
            const numDisc = Number(i.discount || 0);
            return {
                id: i.id,
                productId: i.product_id,
                productName: i.productName,
                price: numPrice,
                qty: numQty,
                discount: numDisc,
                total: (numPrice * numQty) - numDisc,
                shoppingListId: i.shopping_list_id,
                unit: i.unit
            };
        }));
        setSessionPlaceId(session.place_id || '');
        setOverallDiscount(Number(session.discount || 0));
        setOpenSessions(prev => prev.filter(s => s.id !== session.id));
    };

    return (
        <div>
            {openSessions.length > 0 && cart.length === 0 && (
                <div style={{ backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', border: '1px dashed var(--secondary)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <CloudArrowUp size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                        Feiras em aberto na nuvem:
                    </div>
                    {openSessions.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '5px' }}>
                             <div style={{ fontSize: '0.9rem' }}>
                                <strong>{s.placeName || 'Supermercado'}</strong> - {new Date(s.date).toLocaleDateString('pt-BR')}
                             </div>
                             <button className="btn btn-secondary btn-sm" onClick={() => resumeSession(s)}>Retomar</button>
                        </div>
                    ))}
                </div>
            )}
            <div className="total-display">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div className="total-label">Subtotal da Feira</div>
                        <div className="total-amount">
                            <span className="currency">R$</span>
                            <span>{totalCart.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <button 
                            className="icon-btn" 
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', color: overallDiscount > 0 ? 'var(--primary)' : 'white' }}
                            onClick={() => setIsDiscountModalOpen(true)}
                        >
                            <Tag size={24} weight={overallDiscount > 0 ? "fill" : "regular"} />
                        </button>
                    )}
                </div>
                {overallDiscount > 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                        Desconto aplicado: {formatCurrency(overallDiscount)}
                    </div>
                )}
            </div>
            
            <div className="header-split" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Local da Compra Atual:</label>
                    <div className="searchable-select-container">
                        <input 
                            type="text"
                            className="form-control"
                            placeholder="Buscar ou selecionar local..."
                            value={isPlaceDropdownOpen ? placeSearch : (places.find(p => p.id === sessionPlaceId)?.name || '')}
                            onFocus={() => { setIsPlaceDropdownOpen(true); setPlaceSearch(''); }}
                            onBlur={() => setTimeout(() => setIsPlaceDropdownOpen(false), 200)}
                            onChange={(e) => setPlaceSearch(e.target.value)}
                            disabled={cart.length > 0}
                            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                        />
                        {isPlaceDropdownOpen && (
                            <div className="searchable-select-dropdown">
                                {places
                                    .filter(p => p.name.toUpperCase().includes(placeSearch.toUpperCase()))
                                    .slice()
                                    .sort((a,b) => a.name.localeCompare(b.name))
                                    .map(p => (
                                        <div 
                                            key={p.id} 
                                            className="searchable-select-item"
                                            onClick={() => { setSessionPlaceId(p.id); setPlaceSearch(p.name); setIsPlaceDropdownOpen(false); }}
                                        >
                                            {p.name}
                                        </div>
                                    ))
                                }
                                <div className="searchable-select-item new-item" onClick={() => { setNewPlaceModalOpen(true); setIsPlaceDropdownOpen(false); }}>
                                    + Adicionar Novo Local
                                </div>
                            </div>
                        )}
                    </div>
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
                    cart.slice().sort((a,b) => a.productName.localeCompare(b.productName)).map(item => (
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

            <div className="fab-container">
                <div className={`speed-dial-menu ${isSpeedDialOpen ? 'open' : ''}`}>
                    {/* Backup Action */}
                    <div className="speed-dial-item" onClick={() => { handleBackup(); setSpeedDialOpen(false); }}>
                        <span>Backup Nuvem</span>
                        <div className="speed-dial-btn" style={{ background: '#3b82f6' }}>
                            {isBackingUp ? (
                                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            ) : (
                                <CloudArrowUp weight="bold" />
                            )}
                        </div>
                    </div>

                    {/* Scan Action */}
                    <div className="speed-dial-item" onClick={() => {
                        if(places.length === 0) {
                            alert('Cadastre pelo menos 1 local para importar notas fiscais.');
                        } else if (!sessionPlaceId) {
                            alert('Por favor, selecione ou adicione o Local da Compra no topo da tela antes de digitalizar uma nota.');
                        } else {
                            setScannerOpen(true);
                        }
                        setSpeedDialOpen(false);
                    }}>
                        <span>Escanear Nota</span>
                        <div className="speed-dial-btn" style={{ background: '#a855f7' }}>
                            <QrCode weight="bold" />
                        </div>
                    </div>

                    {/* Add Item Action */}
                    <div className="speed-dial-item" onClick={() => {
                        if(products.length === 0 || places.length === 0) {
                            alert('Cadastre pelo menos 1 produto e 1 local para adicionar itens ao carrinho.');
                        } else if (!sessionPlaceId) {
                            alert('Por favor, selecione ou adicione o Local da Compra no topo da tela antes de começar a feira.');
                        } else {
                            setModalOpen(true);
                        }
                        setSpeedDialOpen(false);
                    }}>
                        <span>Novo Item</span>
                        <div className="speed-dial-btn" style={{ background: 'var(--primary)' }}>
                            <Plus weight="bold" />
                        </div>
                    </div>
                </div>

                <button 
                    className={`speed-dial-btn main-fab ${isSpeedDialOpen ? 'open' : ''}`} 
                    onClick={() => setSpeedDialOpen(!isSpeedDialOpen)}
                >
                    <Plus weight="bold" />
                </button>
            </div>
            
            {cart.length > 0 && (
                <button onClick={finishShopping} className="btn btn-primary btn-block" style={{ marginTop: '2rem' }}>
                    <CheckCircle weight="fill" style={{ marginRight: '8px' }} /> Finalizar Feira
                </button>
            )}

            <Modal isOpen={isModalOpen} onClose={() => { setModalOpen(false); setEditingItemId(null); }} title={editingItemId ? "Editar Item" : "Adicionar à Feira"}>
                <form onSubmit={handleAddItem}>
                    <div className="form-group">
                        <label>Produto</label>
                        <div className="searchable-select-container">
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Buscar produto..."
                                value={isProductDropdownOpen ? productSearch : (products.find(p => p.id === selectedProduct)?.name || '')}
                                onFocus={() => { setIsProductDropdownOpen(true); setProductSearch(''); }}
                                onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 200)}
                                onChange={(e) => setProductSearch(e.target.value)}
                                required
                            />
                            {isProductDropdownOpen && (
                                <div className="searchable-select-dropdown">
                                    {products
                                        .filter(p => p.name.toUpperCase().includes(productSearch.toUpperCase()))
                                        .slice()
                                        .sort((a,b) => a.name.localeCompare(b.name))
                                        .map(p => (
                                            <div 
                                                key={p.id} 
                                                className="searchable-select-item"
                                                onClick={() => { 
                                                    handleProductChange({ target: { value: p.id } }); 
                                                    setProductSearch(p.name); 
                                                    setIsProductDropdownOpen(false); 
                                                }}
                                            >
                                                <span>{p.name}</span>
                                                <span className="item-unit">{p.unit}</span>
                                            </div>
                                        ))
                                    }
                                    <div className="searchable-select-item new-item" onClick={() => { setNewProductModalOpen(true); setIsProductDropdownOpen(false); }}>
                                        + Adicionar Novo Produto
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {insight && (
                        <div className="ai-insight" style={{ 
                            borderLeft: parseFloat(price) > insight.bestPrice ? '4px solid var(--danger)' : '4px solid var(--primary)',
                            backgroundColor: parseFloat(price) > insight.bestPrice ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)'
                        }}>
                            <div className="ai-icon">
                                {parseFloat(price) > insight.bestPrice ? (
                                    <Tag weight="fill" style={{ color: 'var(--danger)' }} />
                                ) : (
                                    <Sparkle weight="fill" />
                                )}
                            </div>
                            <div className="ai-text">
                                <div className="ai-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{parseFloat(price) > insight.bestPrice ? 'Alerta de Preço' : 'Análise de Economia'}</span>
                                    {parseFloat(price) > insight.bestPrice && (
                                        <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                                            +{((parseFloat(price) / insight.bestPrice - 1) * 100).toFixed(0)}% caro
                                        </span>
                                    )}
                                </div>
                                <div className="ai-desc">
                                    <span dangerouslySetInnerHTML={{ __html: insight.message }}></span>
                                    {parseFloat(price) > insight.bestPrice && (
                                        <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                                            ⚠️ Este item está bem mais caro que o normal.<br/>
                                            Deseja jogar na Lista Inteligente para comprar depois no <b>{insight.bestPlace}</b>?
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-row-responsive" style={{ marginTop: '1rem' }}>
                        <div className="form-group flex-1">
                            <label>{selectedProductUnit === 'kg' ? 'Peso (kg)' : 'Quantidade'}</label>
                            <div className="qty-picker">
                                <button type="button" className="qty-btn" 
                                    onClick={() => setQty(prev => Math.max(selectedProductUnit === 'kg' ? 0.001 : 1, prev - (selectedProductUnit === 'kg' ? 0.1 : 1)))}>
                                     <span>−</span>
                                </button>
                                <input 
                                    type={selectedProductUnit === 'kg' ? "text" : "number"}
                                    inputMode={selectedProductUnit === 'kg' ? "numeric" : "decimal"}
                                    step={selectedProductUnit === 'kg' ? "0.001" : "1"} 
                                    min={selectedProductUnit === 'kg' ? "0.001" : "1"} 
                                    className="form-control qty-input" 
                                    required 
                                    value={selectedProductUnit === 'kg' ? qty.toFixed(3) : qty} 
                                    onChange={e => handleQuantityChange(e.target.value)} 
                                />
                                <button type="button" className="qty-btn" 
                                    onClick={() => setQty(prev => prev + (selectedProductUnit === 'kg' ? 0.1 : 1))}>
                                    <span>+</span>
                                </button>
                            </div>
                        </div>
                        <div className="form-group" style={{ flex: 1.5 }}>
                            <label>{selectedProductUnit === 'kg' ? 'Preço do kg (R$)' : 'Preço Unit. (R$)'}</label>
                            <input type="number" step="0.01" min="0" className="form-control" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{selectedProductUnit === 'kg' ? 'Preço que você pegou' : 'Total do Item'}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {formatCurrency((parseFloat(price) || 0) * (parseFloat(qty) || 0))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary flex-1">Adicionar Item</button>
                        {insight && insight.bestPrice < parseFloat(price) && (
                            <button 
                                type="button" 
                                className="btn btn-secondary flex-1" 
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                                onClick={handleSaveToList}
                            >
                                Guardar p/ Outro Local
                            </button>
                        )}
                    </div>
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
            {/* Modal for Overall Discount */}
            <Modal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} title="Desconto da Feira">
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Subtotal dos Itens</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalCart)}</div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Valor Total Pago (R$)</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        value={isDiscountModalOpen && paidAmount === '' ? (totalCart - overallDiscount).toFixed(2) : paidAmount}
                        onChange={e => {
                            const val = e.target.value;
                            setPaidAmount(val);
                            const numVal = parseFloat(val);
                            if (!isNaN(numVal)) {
                                const diff = totalCart - numVal;
                                setOverallDiscount(diff > 0 ? diff : 0);
                            }
                        }}
                        placeholder="Quanto você pagou no total?"
                    />
                    <small style={{ color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
                        Ajuste o valor final pago para calcular o desconto automaticamente.
                    </small>
                </div>

                <div className="form-group">
                    <label>Ou informe o Desconto Direto (R$)</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="form-control" 
                        value={overallDiscount} 
                        onChange={e => {
                            const disc = parseFloat(e.target.value) || 0;
                            setOverallDiscount(disc);
                            setPaidAmount((totalCart - disc).toFixed(2));
                        }} 
                        placeholder="0.00" 
                    />
                </div>
                
                <button className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={() => { setIsDiscountModalOpen(false); setPaidAmount(''); }}>
                    Confirmar Valores
                </button>
            </Modal>
        </div>
    );
}
