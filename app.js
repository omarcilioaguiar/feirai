// --- Database / LocalStorage Service ---
const DB_KEY = 'feirai_data';

const defaultDB = {
    products: [],      // { id, name, category, unit }
    places: [],        // { id, name, location }
    history: [],       // { id, date, total, items: [{ productId, placeId, price, qty, total }] }
    currentCart: [],   // { id, productId, placeId, price, qty, total }
    theme: 'light'
};

const DB = {
    load() {
        const data = localStorage.getItem(DB_KEY);
        if (!data) {
            this.save(defaultDB);
            return defaultDB;
        }
        return JSON.parse(data);
    },
    save(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    },
    get() {
        return this.load();
    },
    update(updater) {
        const data = this.load();
        updater(data);
        this.save(data);
        // Dispatch custom event to notify components
        window.dispatchEvent(new Event('db-updated'));
    }
};

// --- Utilities ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateStr) => new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr));

// --- State & App Core ---
const AppData = DB.get();

// Initialize Theme
if (AppData.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    DB.update(d => d.theme = newTheme);
});

// --- AI Service (Mock) ---
const AIService = {
    getInsightForProduct(productId, dbData) {
        const history = dbData.history;
        if (!history || history.length === 0) return null;

        // Find all purchases of this product
        const purchases = [];
        history.forEach(run => {
            run.items.forEach(item => {
                if (item.productId === productId) {
                    purchases.push({ ...item, date: run.date });
                }
            });
        });

        if (purchases.length === 0) return null;

        // Find cheapest ever
        const sorted = [...purchases].sort((a, b) => a.price - b.price);
        const cheapest = sorted[0];
        const place = dbData.places.find(p => p.id === cheapest.placeId);
        
        return {
            message: `A última vez mais em conta foi no <b>${place ? place.name : 'Desconhecido'}</b> por ${formatCurrency(cheapest.price)}.`,
            recommendedPlaceId: cheapest.placeId,
            suggestedPrice: cheapest.price
        };
    }
};

// --- Views Definitions ---
const Views = {
    home: `
        <div class="total-display">
            <div class="total-label">Subtotal da Feira</div>
            <div class="total-amount"><span class="currency">R$</span><span id="cart-total">0,00</span></div>
        </div>
        
        <div class="header-split" style="display:flex; justify-content:space-between; align-items:center;">
            <h3>Itens no Carrinho</h3>
        </div>

        <div id="cart-list" style="margin-top: 1rem;">
            <!-- Cart items injected here -->
        </div>

        <button class="fab" id="btn-add-item"><i class="ph ph-plus"></i></button>
        
        <button id="btn-finish-shopping" class="btn btn-primary btn-block" style="margin-top:2rem; display:none;">
            <i class="ph ph-check-circle"></i> Finalizar Feira
        </button>
    `,
    products: `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h2>Produtos</h2>
            <button class="btn btn-primary btn-icon" id="btn-add-product"><i class="ph ph-plus"></i></button>
        </div>
        <div id="products-list"></div>
    `,
    places: `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h2>Supermercados</h2>
            <button class="btn btn-primary btn-icon" id="btn-add-place"><i class="ph ph-plus"></i></button>
        </div>
        <div id="places-list"></div>
    `,
    reports: `
        <h2>Relatórios <small style="color:var(--primary); font-size:0.5em;"><i class="ph-fill ph-sparkle"></i> AI</small></h2>
        <div class="card" style="margin-top:1rem;">
            <h3 style="margin-bottom:1rem; font-size:1rem;">Gastos e Economia</h3>
            <div class="chart-container">
                <canvas id="expensesChart"></canvas>
            </div>
        </div>
        <div class="card" style="margin-top:1rem;">
            <h3 style="margin-bottom:1rem; font-size:1rem;">Locais mais Frequentes</h3>
            <div id="ai-report-summary" style="font-size:0.9rem; color:var(--text-secondary); line-height:1.5;"></div>
        </div>
    `,
    history: `
        <h2>Histórico de Feiras</h2>
        <div id="history-list" style="margin-top:1rem;"></div>
    `
};

// --- Modal System ---
window.Modal = {
    open(contentHTML) {
        const container = document.getElementById('modal-container');
        container.innerHTML = `
            <div class="modal-overlay active" id="modal-overlay">
                <div class="modal-content" onclick="event.stopPropagation()">
                    ${contentHTML}
                </div>
            </div>
        `;
        document.getElementById('modal-overlay').addEventListener('click', window.Modal.close);
    },
    close() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                document.getElementById('modal-container').innerHTML = '';
            }, 300);
        }
    }
};

const Modal = window.Modal;

// --- View Renderers ---
const ViewRenderers = {
    home() {
        const data = DB.get();
        const list = document.getElementById('cart-list');
        const totalEl = document.getElementById('cart-total');
        const finishBtn = document.getElementById('btn-finish-shopping');
        
        let total = 0;
        list.innerHTML = '';
        
        if (data.currentCart.length === 0) {
            list.innerHTML = \`
                <div class="empty-state">
                    <i class="ph ph-shopping-cart-simple"></i>
                    <h3>Carrinho Vazio</h3>
                    <p>Adicione itens para começar a feira.</p>
                </div>
            \`;
            finishBtn.style.display = 'none';
        } else {
            finishBtn.style.display = 'flex';
            data.currentCart.forEach(item => {
                const product = data.products.find(p => p.id === item.productId);
                const place = data.places.find(p => p.id === item.placeId);
                total += item.total;
                
                list.innerHTML += \`
                    <div class="list-item">
                        <div class="item-main">
                            <span class="item-name">\${product ? product.name : 'Desconhecido'}</span>
                            <span class="item-meta">
                                <i class="ph ph-storefront"></i> \${place ? place.name : 'Nenhum local'}
                            </span>
                        </div>
                        <div style="text-align:right;">
                            <div class="item-price">\${formatCurrency(item.total)}</div>
                            <div class="item-qty">\${item.qty} \${product ? product.unit : 'un'} x \${formatCurrency(item.price)}</div>
                        </div>
                        <button class="icon-btn" style="color:var(--danger);" onclick="window.removeCartItem('\${item.id}')">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                \`;
            });
        }
        
        totalEl.textContent = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        document.getElementById('btn-add-item').onclick = () => {
            const d = DB.get();
            if (d.products.length === 0 || d.places.length === 0) {
                alert('Cadastre pelo menos 1 produto e 1 local para adicionar itens ao carrinho.');
                return;
            }
            showAddItemModal();
        };

        finishBtn.onclick = () => {
            if(confirm('Deseja finalizar esta feira e salvar no histórico?')) {
                DB.update(d => {
                    const runTotal = d.currentCart.reduce((sum, item) => sum + item.total, 0);
                    d.history.push({
                        id: generateId(),
                        date: new Date().toISOString(),
                        total: runTotal,
                        items: [...d.currentCart]
                    });
                    d.currentCart = [];
                });
                renderView('home');
            }
        };
    },
    products() {
        const data = DB.get();
        const list = document.getElementById('products-list');
        list.innerHTML = '';
        
        if (data.products.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>Nenhum produto cadastrado.</p></div>';
        } else {
            data.products.forEach(p => {
                list.innerHTML += \`
                    <div class="card" style="margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>\${p.name}</strong>
                            <div style="font-size:0.8rem; color:var(--text-tertiary);">Categoria: \${p.category} | \${p.unit}</div>
                        </div>
                    </div>
                \`;
            });
        }
        
        document.getElementById('btn-add-product').onclick = () => {
            Modal.open(\`
                <div class="modal-header">
                    <h3>Novo Produto</h3>
                    <button class="modal-close" onclick="Modal.close()"><i class="ph ph-x"></i></button>
                </div>
                <form id="form-product">
                    <div class="form-group">
                        <label>Nome do Produto</label>
                        <input type="text" id="p-name" class="form-control" required placeholder="Ex: Arroz Branco">
                    </div>
                    <div class="form-group">
                        <label>Categoria</label>
                        <input type="text" id="p-category" class="form-control" required placeholder="Ex: Grãos">
                    </div>
                    <div class="form-group">
                        <label>Unidade de Medida</label>
                        <select id="p-unit" class="form-control" required>
                            <option value="kg">Quilo (kg)</option>
                            <option value="g">Grama (g)</option>
                            <option value="un">Unidade (un)</option>
                            <option value="l">Litro (L)</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Salvar Produto</button>
                </form>
            \`);
            
            document.getElementById('form-product').onsubmit = (e) => {
                e.preventDefault();
                DB.update(d => {
                    d.products.push({
                        id: generateId(),
                        name: document.getElementById('p-name').value,
                        category: document.getElementById('p-category').value,
                        unit: document.getElementById('p-unit').value
                    });
                });
                Modal.close();
                renderView('products');
            };
        };
    },
    places() {
        const data = DB.get();
        const list = document.getElementById('places-list');
        list.innerHTML = '';
        
        if (data.places.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>Nenhum supermercado cadastrado.</p></div>';
        } else {
            data.places.forEach(p => {
                list.innerHTML += \`
                    <div class="card premium-card" style="margin-bottom:0.75rem;">
                        <strong><i class="ph ph-storefront" style="color:var(--primary);"></i> \${p.name}</strong>
                        <div style="font-size:0.8rem; color:var(--text-tertiary); margin-top:0.25rem;">\${p.location}</div>
                    </div>
                \`;
            });
        }
        
        document.getElementById('btn-add-place').onclick = () => {
            Modal.open(\`
                <div class="modal-header">
                    <h3>Novo Supermercado/Local</h3>
                    <button class="modal-close" onclick="Modal.close()"><i class="ph ph-x"></i></button>
                </div>
                <form id="form-place">
                    <div class="form-group">
                        <label>Nome do Local</label>
                        <input type="text" id="pl-name" class="form-control" required placeholder="Ex: Carrefour">
                    </div>
                    <div class="form-group">
                        <label>Endereço/Detalhes</label>
                        <input type="text" id="pl-loc" class="form-control" placeholder="Ex: Centro">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Salvar Local</button>
                </form>
            \`);
            
            document.getElementById('form-place').onsubmit = (e) => {
                e.preventDefault();
                DB.update(d => {
                    d.places.push({
                        id: generateId(),
                        name: document.getElementById('pl-name').value,
                        location: document.getElementById('pl-loc').value
                    });
                });
                Modal.close();
                renderView('places');
            };
        };
    },
    reports() {
        const data = DB.get();
        if(data.history.length === 0) {
            document.getElementById('ai-report-summary').innerHTML = 'Dados insuficientes. Finalize algumas feiras para ver os relatórios.';
            return;
        }

        // Draw Chart
        const ctx = document.getElementById('expensesChart').getContext('2d');
        const labels = data.history.map(h => new Intl.DateTimeFormat('pt-BR', {day:'2-digit', month:'short'}).format(new Date(h.date)));
        const values = data.history.map(h => h.total);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gasto por Feira (R$)',
                    data: values,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // AI Summary Info
        const placeCounts = {};
        data.history.forEach(run => {
            run.items.forEach(it => {
                placeCounts[it.placeId] = (placeCounts[it.placeId] || 0) + 1;
            });
        });
        
        let mostFrequentPlaceId = Object.keys(placeCounts).sort((a,b)=>placeCounts[b]-placeCounts[a])[0];
        const favPlace = data.places.find(p=>p.id===mostFrequentPlaceId);

        document.getElementById('ai-report-summary').innerHTML = \`
            <div style="display:flex; justify-content:center; align-items:center; flex-direction:column; padding:1rem; background:var(--bg-main); border-radius:var(--radius-md);">
                <i class="ph-fill ph-storefront" style="font-size:3rem; color:var(--secondary); margin-bottom:0.5rem;"></i>
                <strong style="font-size:1.2rem; color:var(--text-primary);">\${favPlace ? favPlace.name : 'Vários'}</strong>
                <span>Local com mais itens comprados nas feiras.</span>
            </div>
        \`;
    },
    history() {
        const data = DB.get();
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        
        if (data.history.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>Nenhum histórico disponível.</p></div>';
        } else {
            // Sort by latest
            [...data.history].reverse().forEach(h => {
                list.innerHTML += \`
                    <div class="card premium-card" style="margin-bottom:1rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                            <strong>\${formatDate(h.date)}</strong>
                            <strong style="color:var(--primary); font-size:1.2rem;">\${formatCurrency(h.total)}</strong>
                        </div>
                        <div style="font-size:0.85rem; color:var(--text-secondary);">
                            <i class="ph ph-shopping-bag"></i> \${h.items.length} itens comprados
                        </div>
                    </div>
                \`;
            });
        }
    }
};

// --- Add Item to Cart Modal Logic ---
function showAddItemModal() {
    const data = DB.get();
    
    let prodOptions = data.products.map(p => \`<option value="\${p.id}">\${p.name} (\${p.unit})</option>\`).join('');
    let placeOptions = data.places.map(p => \`<option value="\${p.id}">\${p.name}</option>\`).join('');
    
    Modal.open(\`
        <div class="modal-header">
            <h3>Adicionar à Feira</h3>
            <button class="modal-close" onclick="Modal.close()"><i class="ph ph-x"></i></button>
        </div>
        <form id="form-add-cart">
            <div class="form-group">
                <label>Produto</label>
                <select id="c-product" class="form-control" required>
                    <option value="" disabled selected>Selecione um produto...</option>
                    \${prodOptions}
                </select>
            </div>
            
            <div id="ai-insight-container"></div>

            <div class="form-group">
                <label>Supermercado/Local</label>
                <select id="c-place" class="form-control" required>
                    \${placeOptions}
                </select>
            </div>
            <div style="display:flex; gap:1rem;">
                <div class="form-group" style="flex:1;">
                    <label>Preço Unit. (R$)</label>
                    <input type="number" id="c-price" step="0.01" min="0" class="form-control" required placeholder="0.00">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Quantidade</label>
                    <input type="number" id="c-qty" step="0.01" min="0.01" class="form-control" required value="1">
                </div>
            </div>
            
            <div style="text-align:center; padding:1rem 0;">
                <div style="font-size:0.8rem; color:var(--text-secondary); text-transform:uppercase;">Total do Item</div>
                <div id="c-total" style="font-size:2rem; font-weight:700; color:var(--primary);">R$ 0,00</div>
            </div>

            <button type="submit" class="btn btn-primary btn-block">Adicionar Item</button>
        </form>
    \`);
    
    // Live Total Calc
    const pEl = document.getElementById('c-price');
    const qEl = document.getElementById('c-qty');
    const tEl = document.getElementById('c-total');
    
    const calcTotal = () => {
        const p = parseFloat(pEl.value) || 0;
        const q = parseFloat(qEl.value) || 0;
        tEl.textContent = formatCurrency(p * q);
    };
    
    pEl.addEventListener('input', calcTotal);
    qEl.addEventListener('input', calcTotal);

    // AI Insight Trigger on Product Select
    document.getElementById('c-product').addEventListener('change', (e) => {
        const productId = e.target.value;
        const insight = AIService.getInsightForProduct(productId, DB.get());
        const insightContainer = document.getElementById('ai-insight-container');
        
        if (insight) {
            insightContainer.innerHTML = \`
                <div class="ai-insight">
                    <div class="ai-icon"><i class="ph-fill ph-sparkle"></i></div>
                    <div class="ai-text">
                        <div class="ai-title">Dica Inteligente</div>
                        <div class="ai-desc">\${insight.message}</div>
                    </div>
                </div>
            \`;
            // Auto-select recommended place
            if(insight.recommendedPlaceId) {
                document.getElementById('c-place').value = insight.recommendedPlaceId;
            }
        } else {
            insightContainer.innerHTML = '';
        }
    });

    document.getElementById('form-add-cart').onsubmit = (e) => {
        e.preventDefault();
        const price = parseFloat(document.getElementById('c-price').value) || 0;
        const qty = parseFloat(document.getElementById('c-qty').value) || 0;
        
        DB.update(d => {
            d.currentCart.push({
                id: generateId(),
                productId: document.getElementById('c-product').value,
                placeId: document.getElementById('c-place').value,
                price: price,
                qty: qty,
                total: price * qty
            });
        });
        Modal.close();
        renderView('home');
    };
}

// Global action for deleting items
window.removeCartItem = (id) => {
    DB.update(d => {
        d.currentCart = d.currentCart.filter(i => i.id !== id);
    });
    renderView('home');
};

// --- Navigation/Routing ---
function renderView(viewName) {
    const container = document.getElementById('view-container');
    container.innerHTML = Views[viewName] || '<p>View Not Found</p>';
    
    if (ViewRenderers[viewName]) {
        // Slight delay for animations/rendering in some cases, but synchronous is fine for MVP
        ViewRenderers[viewName]();
    }
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active class
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        
        // Render View
        const viewName = targetBtn.getAttribute('data-view');
        renderView(viewName);
    });
});

// Init
const initApp = () => {
    renderView('home');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
