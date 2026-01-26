import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the job exists and belongs to the user
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*, characters!inner(user_id)')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (job.characters.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not job owner' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get worker URL and API key from secrets
    const workerUrl = Deno.env.get('WORKER_RUN_ONCE_URL');
    const workerApiKey = Deno.env.get('WORKER_API_KEY');

    if (!workerUrl || !workerApiKey) {
      console.log('Worker not configured, running in demo mode');
      
      // Demo mode: simulate job progress
      // This will be replaced with actual worker call in production
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Worker not configured - running demo simulation',
          demo_mode: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the Railway worker
    console.log(`Triggering worker for job ${job_id}`);
    
    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': workerApiKey,
      },
      body: JSON.stringify({
        job_id,
        supabase_url: supabaseUrl,
        // Note: Worker will use service role key from its own env
      }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error('Worker error:', errorText);
      
      // Update job status to error
      await supabase
        .from('generation_jobs')
        .update({ 
          status: 'error', 
          error: `Worker trigger failed: ${workerResponse.status}` 
        })
        .eq('id', job_id);

      return new Response(
        JSON.stringify({ 
          error: 'Failed to trigger worker', 
          details: errorText 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await workerResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Worker triggered successfully',
        worker_response: result 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
