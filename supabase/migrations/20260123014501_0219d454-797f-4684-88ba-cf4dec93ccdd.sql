-- Add location fields to battles table
ALTER TABLE public.battles 
ADD COLUMN location_1 text,
ADD COLUMN location_2 text,
ADD COLUMN chosen_location text,
ADD COLUMN coin_flip_winner_id uuid;