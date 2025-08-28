-- Add 3 image fields to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN image_url_1 TEXT,
ADD COLUMN image_url_2 TEXT,
ADD COLUMN image_url_3 TEXT;

-- Update existing posts to move current image_url to image_url_1
UPDATE public.social_media_posts 
SET image_url_1 = image_url 
WHERE image_url IS NOT NULL AND image_url != '';

-- Create media storage bucket for organized media management
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-gallery', 'media-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for media gallery
CREATE POLICY "Media gallery images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media-gallery');

CREATE POLICY "Users can upload to media gallery" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'media-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their media gallery files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'media-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their media gallery files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'media-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Restore old plan data with Czech content
-- First, let's create a function to restore the old data structure
CREATE OR REPLACE FUNCTION restore_old_plan_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    september_section JSONB;
    october_section JSONB;
BEGIN
    -- Create September (Září) section with original data
    september_section := '{
        "month": "Září",
        "weeks": [
            {
                "title": "Kolekce",
                "pillar": "Produkty",
                "url": "/kolekce",
                "notes": "Prezentace nové kolekce čajů"
            },
            {
                "title": "Soutěž",
                "pillar": "Marketing",
                "url": "/soutez",
                "notes": "Soutěž o čajové balíčky"
            },
            {
                "title": "Puerh",
                "pillar": "Produkty",
                "url": "/puerh",
                "notes": "Speciální Puerh čaje"
            },
            {
                "title": "Video",
                "pillar": "Obsah",
                "url": "/video",
                "notes": "Video obsah o čajích"
            }
        ]
    }';

    -- Create October (Říjen) section with original data
    october_section := '{
        "month": "Říjen",
        "weeks": [
            {
                "title": "Fafuk",
                "pillar": "Produkty",
                "url": "/fafuk",
                "notes": "Fafuk produktová řada"
            },
            {
                "title": "Video Cahlikova",
                "pillar": "Obsah",
                "url": "/video-cahlikova",
                "notes": "Video obsah s Cahlikovou"
            },
            {
                "title": "Dětské čaje",
                "pillar": "Produkty",
                "url": "/detske-caje",
                "notes": "Speciální čaje pro děti"
            },
            {
                "title": "Zimní čaje",
                "pillar": "Produkty",
                "url": "/zimni-caje",
                "notes": "Zimní čajová kolekce"
            },
            {
                "title": "Doplňky stravy",
                "pillar": "Produkty",
                "url": "/doplnky-stravy",
                "notes": "Čajové doplňky stravy"
            }
        ]
    }';

    -- Insert or update September section
    INSERT INTO public.plan_sections (user_id, section_data, section_order)
    VALUES (p_user_id, september_section, 1)
    ON CONFLICT ON CONSTRAINT plan_sections_pkey 
    DO UPDATE SET 
        section_data = september_section,
        updated_at = now();

    -- Insert or update October section
    INSERT INTO public.plan_sections (user_id, section_data, section_order)
    VALUES (p_user_id, october_section, 2)
    ON CONFLICT ON CONSTRAINT plan_sections_pkey
    DO UPDATE SET 
        section_data = october_section,
        updated_at = now();

END;
$$;