import { useState, useEffect } from 'react';
import api from '../api';

export default function GooglePlaceAutocomplete({ onPlaceSelected, placeholder = "Digite o nome ou endereço..." }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    const handleSelectSuggestion = async (place_id, description, main_text) => {
        try {
            setSearchQuery(description);
            setSuggestions([]);
            
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

                if (onPlaceSelected) {
                    onPlaceSelected({ name, address, lat: latitude, lng: longitude });
                }
            }
        } catch (error) {
            console.error("Details fetch error:", error);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <input 
                type="text" 
                className="form-control" 
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {suggestions.length > 0 && (
                <ul className="autocomplete-dropdown" style={{
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
        </div>
    );
}
