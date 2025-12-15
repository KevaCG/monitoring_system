// File: src/components/monitoreo/MainContent/CorrectionModal.tsx

import React from 'react';
import { X, AlertTriangle, Calendar } from 'lucide-react';
import styles from './MainContent.module.css'; // Usamos los estilos existentes

interface CorrectionModalProps {
    selectedErrorToEdit: any;
    setSelectedErrorToEdit: (error: any | null) => void;
    correctionComment: string;
    setCorrectionComment: (comment: string) => void;
    isSavingCorrection: boolean;
    handleCorrection: () => Promise<void>;
}

const CorrectionModal: React.FC<CorrectionModalProps> = ({
    selectedErrorToEdit,
    setSelectedErrorToEdit,
    correctionComment,
    setCorrectionComment,
    isSavingCorrection,
    handleCorrection,
}) => {
    if (!selectedErrorToEdit) return null;

    return (
        <div className={styles.modalOverlay} onClick={() => setSelectedErrorToEdit(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>GESTIÓN DE ERROR</span>
                        <h2 className={styles.modalTitle}>Marcar como Corregido</h2>
                    </div>
                    <button className={styles.closeButton} onClick={() => setSelectedErrorToEdit(null)}><X size={24} /></button>
                </div>

                <div className={styles.detailRow} style={{ borderBottom: '1px solid #ffe9b8', paddingBottom: 15, marginBottom: 20 }}>
                    <div className={styles.detailItem}><AlertTriangle size={16} color="#d97706" /> **Flujo:** {selectedErrorToEdit.sistema}</div>
                    <div className={styles.detailItem}><Calendar size={16} /> **Fecha:** {new Date(selectedErrorToEdit.created_at).toLocaleDateString()}</div>
                </div>

                <label className={styles.formLabel}>
                    Comentario de la Solución:
                    <textarea
                        value={correctionComment}
                        onChange={(e) => setCorrectionComment(e.target.value)}
                        className={styles.textAreaInput}
                        rows={5}
                        placeholder="Describe brevemente la causa raíz y la solución aplicada (Ej: Error de ambiente en UAT, se reinició el servidor de servicios)."
                    />
                </label>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={() => setSelectedErrorToEdit(null)}>
                        Cancelar
                    </button>
                    <button
                        className={`${styles.saveBtn} ${styles.btnWarning}`}
                        onClick={handleCorrection}
                        disabled={isSavingCorrection || correctionComment.length < 5}
                    >
                        {isSavingCorrection ? 'Guardando...' : 'Aplicar Corrección (CORREGIDO)'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CorrectionModal;