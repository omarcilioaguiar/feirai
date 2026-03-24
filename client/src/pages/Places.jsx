import { Plus, Storefront, Trash, PencilSimple, MapPin } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';

export default function Places() {
    const [places, setPlaces] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(null); // stores the ID of the place being edited
    const [formData, setFormData] = useState({ name: '', location: '', lat: null, lng: null });

    useEffect(() => {
        api.get('/places').then(res => setPlaces(res.data)).catch(console.error);
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Native debounced search for places using our new backend proxy
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length === 0) {
            setSuggestions([]);
            return;
        }

        const debounceTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get(`/maps/autocomplete?input=${encodeURIComponent(searchQuery)}`);
                if (res.data && res.data.predictions) {
                    setSuggestions(res.data.predictions);
                }
            } catch (err) {
                console.error("Autocomplete backend error:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    const handleSelectSuggestion = async (place_id, description, main_text) => {
        try {
            // Optimistic update of the input
            setSearchQuery(description);
            setSuggestions([]); // hide dropdown
            
            const res = await api.get(`/maps/details?place_id=${place_id}`);
            const details = res.data.result;
            
            if (details) {
                const address = details.formatted_address || description;
                const name = details.name || main_text || "";
                
                let latitude = null;
                let longitude = null;
                
                if (details.geometry && details.geometry.location) {
                    latitude = details.geometry.location.lat;
                    longitude = details.geometry.location.lng;
                }

                setFormData(prev => ({
                    ...prev,
                    name: prev.name || name, 
                    location: address,
                    lat: latitude,
                    lng: longitude
                }));
            }
        } catch (error) {
            console.error("Details fetch error:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/places/${isEditing}`, formData);
                setPlaces(places.map(p => p.id === isEditing ? { ...p, ...formData } : p));
            } else {
                const res = await api.post('/places', formData);
                setPlaces([...places, res.data]);
            }
            closeModal();
        } catch (error) {
            console.error(error);
        }
    };

    const deletePlace = async (id) => {
        if (confirm('Tem certeza que deseja excluir este local? Itens vinculados a ele no histórico podem ser afetados.')) {
            try {
                await api.delete(`/places/${id}`);
                setPlaces(places.filter(p => p.id !== id));
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleEdit = (place) => {
        setIsEditing(place.id);
        setFormData({ 
            name: place.name, 
            location: place.location, 
            lat: place.lat, 
            lng: place.lng 
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setIsEditing(null);
        setFormData({ name: '', location: '', lat: null, lng: null });
        setSearchQuery('');
        setSuggestions([]);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Locais</h2>
                <button className="btn btn-primary btn-icon" onClick={() => setModalOpen(true)}>
                    <Plus weight="bold" />
                </button>
            </div>
            
            <div id="places-list">
                {places.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhum supermercado cadastrado.</p>
                    </div>
                ) : (
                    places.map(place => (
                        <div className="card" key={place.id} style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>{place.name}</strong>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <MapPin size={14} weight="fill" style={{ color: place.location ? 'var(--primary)' : 'var(--text-tertiary)' }} />
                                    {place.location || 'Sem endereço cadastrado'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="icon-btn" onClick={() => handleEdit(place)} style={{ color: 'var(--primary)' }}>
                                    <PencilSimple weight="fill" />
                                </button>
                                <button className="icon-btn" onClick={() => deletePlace(place.id)} style={{ color: 'var(--danger)' }}>
                                    <Trash weight="fill" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? "Editar Local" : "Novo Local"}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome do Local</label>
                        <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Carrefour" />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Busque o Endereço (Google Maps)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Digite o nome ou endereço do local..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ marginBottom: '0.5rem' }}
                        />
                        {/* Native Custom Dropdown for Google Maps Suggestions */}
                        {suggestions.length > 0 && (
                            <ul style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                zIndex: 9999,
                                listStyle: 'none',
                                margin: 0,
                                padding: 0,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: 'var(--shadow-md)'
                            }}>
                                {suggestions.map((sug) => (
                                    <li 
                                        key={sug.place_id}
                                        onClick={() => handleSelectSuggestion(sug.place_id, sug.description, sug.structured_formatting?.main_text)}
                                        style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        <strong>{sug.structured_formatting?.main_text || sug.description}</strong><br/>
                                        <small style={{ color: 'var(--text-secondary)' }}>{sug.structured_formatting?.secondary_text || ''}</small>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {formData.location && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', padding: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginTop: '0.5rem' }}>
                                <strong>Endereço Selecionado:</strong><br/>
                                {formData.location}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Salvar Local</button>
                </form>
            </Modal>
        </div>
    );
}
