-- Add personality and mentality fields to characters table
ALTER TABLE public.characters 
ADD COLUMN personality text,
ADD COLUMN mentality text;