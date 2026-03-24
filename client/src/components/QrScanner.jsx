import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onScan, onError, onClose }) {
    const scannerRef = useRef(null);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("qr-reader");

        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                // Stop scanning once we get a result
                html5QrCode.stop().then(() => {
                    onScan(decodedText);
                }).catch(err => console.error(err));
            },
            (errorMessage) => {
                // Ignore frequent scan errors (expected while looking for a code)
                if (onError) onError(errorMessage);
            }
        ).catch((err) => {
            console.error("Camera start error:", err);
            alert("Não foi possível acessar a câmera: " + err);
            if (onClose) onClose();
        });

        // Cleanup
        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(console.error);
            }
            scannerRef.current = html5QrCode;
        };
    }, [onScan, onError, onClose]);

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <div id="qr-reader" style={{ width: '100%' }}></div>
            <button 
                type="button" 
                className="btn btn-secondary btn-block" 
                onClick={onClose}
                style={{ marginTop: '1rem' }}
            >
                Cancelar Câmera
            </button>
        </div>
    );
}
