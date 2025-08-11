-- Add format field to categories table
ALTER TABLE public.categories 
ADD COLUMN format text DEFAULT 'text';