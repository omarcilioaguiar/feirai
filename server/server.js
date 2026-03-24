const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Tesseract = require('tesseract.js');
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
    const { name, category = 'Geral', unit = 'un', brand = null } = req.body;
    const upperName = (name || '').toUpperCase();
    try {
        await dbRun('UPDATE Product SET name = ?, category = ?, unit = ?, brand = ? WHERE id = ?', [upperName, category, unit, brand, id]);
        res.json({ success: true, name: upperName });
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
    const { name, category = 'Geral', unit = 'un', brand = null } = req.body;
    const upperName = (name || '').toUpperCase();
    const id = generateId();
    try {
        await dbRun('INSERT INTO Product (id, name, category, unit, brand) VALUES (?, ?, ?, ?, ?)', [id, upperName, category, unit, brand]);
        res.json({ id, name: upperName, category, unit, brand });
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

app.get('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const run = await dbGet('SELECT * FROM ShoppingRun WHERE id = ?', [id]);
        if (!run) return res.status(404).json({ error: 'Session not found' });
        
        const items = await dbAll(`
            SELECT i.*, p.name as productName, p.unit, pl.name as placeName
            FROM ShoppingItem i
            JOIN Product p ON i.product_id = p.id
            JOIN Place pl ON i.place_id = pl.id
            WHERE i.run_id = ?
        `, [id]);
        
        res.json({ ...run, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    const { total, items, date } = req.body;
    try {
        await dbRun('UPDATE ShoppingRun SET total_amount = ?, date = ? WHERE id = ?', [total, date, id]);
        
        // Simpler to delete and re-insert items for the session
        await dbRun('DELETE FROM ShoppingItem WHERE run_id = ?', [id]);
        for (const item of items) {
            const itemId = generateId();
            await dbRun(
                'INSERT INTO ShoppingItem (id, run_id, product_id, place_id, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                [itemId, id, item.productId, item.placeId, item.price, item.quantity]
            );
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- AI Receipt Analysis (OCR) ---
const upload = multer({ dest: '/tmp/' });

const NOISE_WORDS = ['TOTAL', 'PAGAR', 'VALOR', 'DINHEIRO', 'CARTAO', 'TROCO', 'DESCONTO', 'TRIBUTOS', 'CARTEIRA', 'VOLTE', 'SEMPRE', 'ICMS', 'CHAVE', 'NFC-e', 'NFE'];

const parseReceiptText = (text) => {
    const items = [];
    const lines = text.split('\n');
    
    // Pattern: [NAME] [QTY] [UNIT] [PRICE] [TOTAL]
    const itemRegex = /^(.+?)\s+(\d+[\d,.]*)\s+(UN|KG|PC|LT|DZ|FD|CX|UNID|G|MG|ML)\b\b.*?(\d+[\d,.]*)$/i;
    
    for (const line of lines) {
        const cleanLine = line.trim().replace(/\s+/g, ' ');
        // Check for noise
        const isNoise = NOISE_WORDS.some(word => cleanLine.toUpperCase().includes(word));
        if (isNoise) continue;

        const match = cleanLine.match(itemRegex);
        if (match) {
            const name = match[1].trim().toUpperCase();
            const qty = parseFloat(match[2].replace(',', '.'));
            const unit = match[3].toLowerCase();
            const price = parseFloat(match[4].replace(',', '.'));
            if (!isNaN(qty) && !isNaN(price)) {
                items.push({ name, qty, unit, price, total: qty * price });
            }
        } else {
            // Fallback for lines like "PRODUTO 10,00"
            const priceMatches = cleanLine.match(/\d+,\d{2}$/);
            if (priceMatches && cleanLine.length > 5) {
                const price = parseFloat(priceMatches[0].replace(',', '.'));
                const name = cleanLine.replace(/[0-9,]+|KG|UN|PC|CX/gi, '').trim().toUpperCase();
                if (name.length > 3) {
                    items.push({ name, qty: 1, unit: 'un', price, total: price });
                }
            }
        }
    }
    return items;
};

app.post('/api/receipts/ocr', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada para análise.' });
    
    try {
        console.log(`[AI-Analysis] Processando foto: ${req.file.path}`);
        const result = await Tesseract.recognize(req.file.path, 'por');
        const text = result.data.text;
        fs.unlinkSync(req.file.path);

        const items = parseReceiptText(text);
        
        const existingProducts = await dbAll('SELECT * FROM Product');
        const findSimilarProduct = (scrapedName) => {
            const words = scrapedName.toLowerCase().split(' ').filter(w => w.length > 2);
            let bestMatch = null; let maxScore = 0;
            for (const p of existingProducts) {
                let score = 0;
                for (const w of words) if (p.name.toLowerCase().includes(w)) score++;
                if (score > maxScore) { maxScore = score; bestMatch = p; }
            }
            return maxScore > 0 ? bestMatch : null;
        };

        const mappedItems = items.map(item => {
            const match = findSimilarProduct(item.name);
            return {
                ...item,
                suggestedProductId: match ? match.id : null,
                suggestedProductName: match ? match.name : item.name,
                isNew: !match
            };
        });
        
        res.json({ placeName: 'Importado via Foto', items: mappedItems });
    } catch (err) {
        console.error("AI Analysis Error:", err);
        res.status(500).json({ error: 'Erro ao analisar imagem: ' + err.message });
    }
});


app.post('/api/sessions/import', async (req, res) => {
    const { items } = req.body;
    try {
        const processedItems = [];
        for (const item of items) {
            let prodId = item.suggestedProductId;
            const upperName = (item.suggestedProductName || item.name || '').toUpperCase();
            if (!prodId || item.isNew) {
                prodId = generateId();
                await dbRun('INSERT INTO Product (id, name, category, unit, brand) VALUES (?, ?, ?, ?, ?)', 
                    [prodId, upperName, 'Geral', item.unit || 'un', null]);
            }
            processedItems.push({ ...item, productId: prodId, suggestedProductName: upperName });
        }
        res.json({ success: true, processedItems });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun('DELETE FROM ShoppingItem WHERE run_id = ?', [id]);
        await dbRun('DELETE FROM ShoppingRun WHERE id = ?', [id]);
        res.json({ success: true });
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

// --- Local Backups ---
app.post('/api/backup', async (req, res) => {
    try {
        const backupDir = '/app/backups';
        const dbSource = process.env.DB_PATH || '/app/feirai.sqlite';
        
        // Ensure the backup directory exists (in case the mount is absent temporarily)
        if (!fs.existsSync(backupDir)) {
            return res.status(500).json({ error: 'Diretório de backup não está acessível no container (/app/backups)' });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const backupFilename = `feirai_${year}_${month}_${day}_${hours}_${minutes}_${seconds}.sqlite`;
        const backupDest = path.join(backupDir, backupFilename);

        fs.copyFileSync(dbSource, backupDest);

        // Rotation logic: keep only 3 backups
        const files = fs.readdirSync(backupDir).filter(f => f.startsWith('feirai_') && f.endsWith('.sqlite'));
        
        // Map with stats to sort strictly by time
        const mappedFiles = files.map(file => {
            const filepath = path.join(backupDir, file);
            return {
                name: file,
                filepath,
                time: fs.statSync(filepath).mtime.getTime()
            };
        });

        // Sort descending (newest first)
        mappedFiles.sort((a, b) => b.time - a.time);

        // If more than 3, delete oldest
        if (mappedFiles.length > 3) {
            const filesToDelete = mappedFiles.slice(3);
            for (const f of filesToDelete) {
                fs.unlinkSync(f.filepath);
            }
        }

        res.json({ success: true, message: `Backup ${backupFilename} criado com sucesso. Mantendo apenas os 3 mais recentes.` });
    } catch (e) {
        console.error('Backup Erro:', e);
        res.status(500).json({ error: 'Falha ao sincronizar o backup: ' + e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server rodando em http://localhost:${PORT}`);
});
