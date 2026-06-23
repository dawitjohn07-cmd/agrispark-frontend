import { supabase } from './supabaseClient';

const DISPUTE_EVIDENCE_BUCKET = 'dispute-evidence';

export async function uploadDisputeEvidence(file: File, prefix: string) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'evidence.jpg';
    const path = `disputes/${prefix}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
        .from(DISPUTE_EVIDENCE_BUCKET)
        .upload(path, file, {
            upsert: true,
            contentType: file.type || 'image/jpeg',
        });

    if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload evidence image');
    }

    return supabase.storage.from(DISPUTE_EVIDENCE_BUCKET).getPublicUrl(path).data.publicUrl;
}
