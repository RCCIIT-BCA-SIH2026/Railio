-- ============================================================================
-- RailSathi (Smart Rail AI) - Storage Buckets & Realtime Publications
-- Migration 03: Storage Bucket Security Policies & Realtime Setup
-- ============================================================================

-- 1. Create Supabase Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('documents', 'documents', false),
    ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Security Policies for 'avatars' (Public Read, Owner Write)
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar access"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 3. Storage Security Policies for 'documents' (Owner Access Only or Admin)
DROP POLICY IF EXISTS "Owner or Admin document access" ON storage.objects;
CREATE POLICY "Owner or Admin document access"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
    );

DROP POLICY IF EXISTS "Users can upload own document" ON storage.objects;
CREATE POLICY "Users can upload own document"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Enable Supabase Realtime for Selective Tables
-- Realtime is enabled selectively for low-latency live operations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.train_live_state;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crowd_observations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.railway_alerts;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
