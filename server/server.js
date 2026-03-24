const express = require('express');
const cors = require('cors');
const { dbAll, dbRun, dbGet } = require('./db');
const { v4: uuidv4 } = require('uuid'); // fallback to simple generation if no uuid library
const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

const generateId = () => Math.random().toString(36).substr(2, 9); // Simple uuid

// --- Products Route ---
app.get('/api/products', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM Product');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, unit, brand } = req.body;
    try {
        await dbRun('UPDATE Product SET name = ?, category = ?, unit = ?, brand = ? WHERE id = ?', [name, category, unit, brand, id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun('DELETE FROM Product WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/products', async (req, res) => {
    const { name, category, unit, brand } = req.body;
    const id = generateId();
    try {
        await dbRun('INSERT INTO Product (id, name, category, unit, brand) VALUES (?, ?, ?, ?, ?)', [id, name, category, unit, brand || null]);
        res.json({ id, name, category, unit, brand });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Places Route ---
app.get('/api/places', async (req, res) => {
    try {
        const places = await dbAll('SELECT * FROM Place');
        res.json(places);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/places/:id', async (req, res) => {
    const { id } = req.params;
    const { name, location, lat, lng } = req.body;
    console.log('Atualizando local:', { id, name, location, lat, lng });
    try {
        await dbRun('UPDATE Place SET name = ?, location = ?, lat = ?, lng = ? WHERE id = ?', [name, location, lat, lng, id]);
        res.json({ success: true });
    } catch (e) {
        console.error('Erro ao atualizar local:', e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/places/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun('DELETE FROM Place WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/places', async (req, res) => {
    const { name, location, lat, lng } = req.body;
    console.log('Criando local:', { name, location, lat, lng });
    const id = generateId();
    try {
        await dbRun('INSERT INTO Place (id, name, location, lat, lng) VALUES (?, ?, ?, ?, ?)', [id, name, location, lat || null, lng || null]);
        res.json({ id, name, location, lat, lng });
    } catch (e) {
        console.error('Erro ao criar local:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- History / Sessions Route ---
app.get('/api/sessions', async (req, res) => {
    try {
        const runs = await dbAll('SELECT * FROM ShoppingRun ORDER BY date DESC');
        // We can fetch items or leave it for a detail route
        res.json(runs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/sessions', async (req, res) => {
    const { total, items } = req.body;
    // items: [{productId, placeId, price, quantity}]
    const runId = generateId();
    const date = new Date().toISOString();
    try {
        await dbRun('INSERT INTO ShoppingRun (id, date, total_amount) VALUES (?, ?, ?)', [runId, date, total]);
        
        for (const item of items) {
            const itemId = generateId();
            await dbRun(
                'INSERT INTO ShoppingItem (id, run_id, product_id, place_id, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                [itemId, runId, item.productId, item.placeId, item.price, item.quantity]
            );
        }
        res.json({ success: true, id: runId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Maps API Proxy ---
app.get('/api/maps/autocomplete', async (req, res) => {
    const { input } = req.query;
    if (!input) return res.json({ predictions: [] });
    
    // We can restrict search region or types here if needed (e.g. components=country:br)
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('Maps autocomplete error:', e);
        res.status(500).json({ error: 'Failed to fetch autocomplete predictions' });
    }
});

app.get('/api/maps/details', async (req, res) => {
    const { place_id } = req.query;
    if (!place_id) return res.status(400).json({ error: 'place_id is required' });
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,geometry&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('Maps details error:', e);
        res.status(500).json({ error: 'Failed to fetch place details' });
    }
});

// --- Insights & Reports ---
app.get('/api/insight/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
        // Find ALL past purchases of this product to let the frontend calculate the best trade-off
        const purchases = await dbAll(`
            SELECT i.price, i.place_id, p.name as placeName, p.lat, p.lng, r.date
            FROM ShoppingItem i
            JOIN Place p ON i.place_id = p.id
            JOIN ShoppingRun r ON i.run_id = r.id
            WHERE i.product_id = ?
            ORDER BY i.price ASC
        `, [productId]);

        if (purchases.length === 0) return res.json(null);
        res.json(purchases);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/reports/summary', async (req, res) => {
    try {
        const mostFrequentedPlace = await dbGet(`
            SELECT place_id, COUNT(*) as count, p.name
            FROM ShoppingItem i
            JOIN Place p ON i.place_id = p.id
            GROUP BY place_id
            ORDER BY count DESC
            LIMIT 1
        `);

        // History totals for chart
        const chartData = await dbAll('SELECT date, total_amount FROM ShoppingRun ORDER BY date ASC LIMIT 20');

        // Most consumed categories
        const categories = await dbAll(`
            SELECT pr.category, sum(i.quantity) as total_qty, sum(i.quantity * i.price) as total_spend
            FROM ShoppingItem i
            JOIN Product pr ON i.product_id = pr.id
            GROUP BY pr.category
            ORDER BY total_spend DESC
            LIMIT 5
        `);

        res.json({
            favPlace: mostFrequentedPlace,
            chartData,
            categories
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/optimize-list', async (req, res) => {
    const { desiredItems } = req.body; // Array of { productId, quantity }
    try {
        const result = [];
        for (const item of desiredItems) {
            // Find cheapest place for this product
            const bestPurchase = await dbGet(`
                SELECT i.price, i.place_id, p.name as placeName, pr.name as productName, pr.brand, pr.unit
                FROM ShoppingItem i
                JOIN Place p ON i.place_id = p.id
                JOIN Product pr ON i.product_id = pr.id
                WHERE i.product_id = ?
                ORDER BY i.price ASC
                LIMIT 1
            `, [item.productId]);

            if (bestPurchase) {
                result.push({
                    ...bestPurchase,
                    quantity: item.quantity,
                    estimatedTotal: bestPurchase.price * item.quantity
                });
            } else {
                // If never bought, get product info only
                const prodInfo = await dbGet('SELECT name, brand, unit FROM Product WHERE id = ?', [item.productId]);
                result.push({
                    productName: prodInfo.name,
                    brand: prodInfo.brand,
                    unit: prodInfo.unit,
                    quantity: item.quantity,
                    noHistory: true
                });
            }
        }
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server rodando em http://localhost:${PORT}`);
});
