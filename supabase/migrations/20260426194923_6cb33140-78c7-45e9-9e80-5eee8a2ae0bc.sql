DO $$
DECLARE
  v_campaign_id uuid := '055fa64c-9988-426e-80bd-f6673ff8bd04';
  v_turn_group  text := 'turn-1777231935867-j9tcy1';
  v_payload     text;
  v_narration   text;
  v_first_created timestamptz;
BEGIN
  SELECT
    metadata->>'structuredOriginalNarration',
    MIN(created_at) OVER ()
  INTO v_payload, v_first_created
  FROM public.campaign_messages
  WHERE campaign_id = v_campaign_id
    AND metadata->>'structuredTurnGroupId' = v_turn_group
    AND metadata->>'structuredOriginalNarration' IS NOT NULL
  LIMIT 1;

  IF v_payload IS NOT NULL THEN
    v_narration := substring(v_payload FROM '"narration"\s*:\s*"((?:[^"\\]|\\.)*)"');
    IF v_narration IS NOT NULL THEN
      v_narration := replace(replace(v_narration, '\"', '"'), '\n', E'\n');
    END IF;
  END IF;

  DELETE FROM public.campaign_messages
  WHERE campaign_id = v_campaign_id
    AND metadata->>'structuredTurnGroupId' = v_turn_group;

  IF v_narration IS NOT NULL AND length(trim(v_narration)) > 20 THEN
    INSERT INTO public.campaign_messages (
      campaign_id,
      character_id,
      sender_type,
      channel,
      content,
      metadata,
      created_at
    ) VALUES (
      v_campaign_id,
      NULL,
      'narrator',
      'in_universe',
      v_narration,
      jsonb_build_object(
        'structuredTurnGroupId', v_turn_group,
        'structuredTurnSequence', 0,
        'structuredMessageKind', 'narration',
        'recoveredFromCorruption', true
      ),
      COALESCE(v_first_created, now())
    );
  END IF;
END $$;