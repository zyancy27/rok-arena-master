-- Add typing indicator and read receipt tracking to battle_participants
ALTER TABLE public.battle_participants
ADD COLUMN is_typing boolean NOT NULL DEFAULT false,
ADD COLUMN last_typed_at timestamp with time zone,
ADD COLUMN last_read_message_id uuid,
ADD COLUMN last_read_at timestamp with time zone;

-- Add character snapshot to store character data at battle start
-- This prevents mid-battle stat/ability changes from affecting the current match
ALTER TABLE public.battle_participants
ADD COLUMN character_snapshot jsonb;