import { Modal } from "@/components/ui/Modal";
import { Summons, Case } from "@/lib/types";
import { StrictSummonForm, StrictSummonFormData } from "@/components/forms/StrictSummonForm";

interface EditSummonModalProps {
    isOpen: boolean;
    onClose: () => void;
    summons: Summons;
    cases: Case[];
    allSummons: Summons[]; // Keep for compatibility if needed, though StrictSummonForm might not use it yet
    onSave: (id: string, data: StrictSummonFormData) => Promise<void>;
}

export function EditSummonModal({ isOpen, onClose, summons, cases, onSave }: EditSummonModalProps) {
    const handleSave = async (data: StrictSummonFormData) => {
        await onSave(summons.id, data);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Summons: ${summons.person_name}`}>
            <div className="max-h-[85vh] overflow-y-auto px-1">
                <StrictSummonForm
                    initialData={summons}
                    cases={cases}
                    onSubmit={handleSave}
                    onCancel={onClose}
                />
            </div>
        </Modal>
    );
}
