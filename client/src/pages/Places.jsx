import { Plus, Storefront, Trash, PencilSimple } from '@phosphor-icons/react';
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

    // Whenever modal opens, try initializing new PlaceAutocompleteElement
    useEffect(() => {
        if (isModalOpen) {
            const initAutocomplete = async () => {
                const container = document.getElementById('autocomplete-container');
                if (!container || !window.google) return;
                
                try {
                    // Use new importLibrary if available, otherwise fallback to existing places library
                    const { PlaceAutocompleteElement } = window.google.maps.importLibrary ? 
                        await window.google.maps.importLibrary("places") : 
                        window.google.maps.places;
                    
                    if (!PlaceAutocompleteElement) return;

                    // Clear previous instances
                    container.innerHTML = '';
                    
                    const autocomplete = new PlaceAutocompleteElement();
                    
                    // Add listener for the new API
                    autocomplete.addEventListener('gmp-placeselect', async (event) => {
                        const place = event.place;
                        if (!place) return;
                        
                        await place.fetchFields({ fields: ['formattedAddress', 'displayName', 'location'] });

                        setFormData(prev => ({
                            ...prev,
                            location: place.formattedAddress || place.displayName,
                            lat: place.location ? place.location.lat() : null,
                            lng: place.location ? place.location.lng() : null
                        }));
                    });

                    // Styling to match the app
                    autocomplete.style.width = "100%";
                    autocomplete.style.backgroundColor = "transparent";
                    autocomplete.style.color = "var(--text-primary)";

                    container.appendChild(autocomplete);
                } catch (e) {
                    console.error("Autocomplete error:", e);
                }
            };
            setTimeout(initAutocomplete, 100);
        }
    }, [isModalOpen]);

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
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{place.location}</div>
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
                    <div className="form-group">
                        <label>Endereço/Detalhes (Busque pelo Google Maps)</label>
                        <div id="autocomplete-container" style={{ 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            border: '1px solid var(--border)', 
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px',
                            minHeight: '45px'
                        }}></div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Salvar Local</button>
                </form>
            </Modal>
        </div>
    );
}
