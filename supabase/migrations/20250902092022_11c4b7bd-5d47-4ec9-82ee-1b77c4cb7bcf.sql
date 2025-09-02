-- Add email field to authors table for notifications
ALTER TABLE public.authors 
ADD COLUMN email TEXT;