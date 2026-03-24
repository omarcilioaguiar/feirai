import { Plus, Package, Trash, PencilSimple } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', unit: 'kg' });

    useEffect(() => {
        api.get('/products').then(res => setProducts(res.data)).catch(console.error);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/products/${isEditing}`, formData);
                setProducts(products.map(p => p.id === isEditing ? { ...p, ...formData } : p));
            } else {
                const res = await api.post('/products', formData);
                setProducts([...products, res.data]);
            }
            closeModal();
        } catch (error) {
            console.error(error);
        }
    };

    const deleteProduct = async (id) => {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await api.delete(`/products/${id}`);
                setProducts(products.filter(p => p.id !== id));
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleEdit = (p) => {
        setIsEditing(p.id);
        setFormData({ name: p.name, unit: p.unit });
        setModalOpen(true);
    };

    const closeModal = () => {
        setIsEditing(null);
        setFormData({ name: '', unit: 'kg' });
        setModalOpen(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Produtos</h2>
                <button className="btn btn-primary btn-icon" onClick={() => setModalOpen(true)}>
                    <Plus weight="bold" />
                </button>
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Pesquisar produto..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div id="products-list">
                {products.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhum produto cadastrado.</p>
                    </div>
                ) : (
                    products
                        .filter(p => p.name.toUpperCase().includes(searchTerm.toUpperCase()))
                        .slice()
                        .sort((a,b) => a.name.localeCompare(b.name))
                        .map(p => (
                        <div className="card" key={p.id} style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>{p.name}</strong>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                    Unidade: {p.unit}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="icon-btn" onClick={() => handleEdit(p)} style={{ color: 'var(--primary)' }}>
                                    <PencilSimple weight="fill" />
                                </button>
                                <button className="icon-btn" onClick={() => deleteProduct(p.id)} style={{ color: 'var(--danger)' }}>
                                    <Trash weight="fill" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? "Editar Produto" : "Novo Produto"}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome do Produto</label>
                        <input type="text" className="form-control" required style={{ textTransform: 'uppercase' }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} placeholder="Ex: ARROZ BRANCO" />
                    </div>
                    <div className="form-group">
                        <label>Unidade de Medida</label>
                        <select className="form-control" required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                            <option value="kg">Quilo (kg)</option>
                            <option value="g">Grama (g)</option>
                            <option value="un">Unidade (un)</option>
                            <option value="l">Litro (l)</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Salvar Produto</button>
                </form>
            </Modal>
        </div>
    );
}
