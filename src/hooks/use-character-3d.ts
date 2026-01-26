import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  Character3DConfig,
  CharacterImage,
  GenerationJob,
  CharacterTemplate,
  VisualStyle,
  MotionMode,
  ModelQuality,
  ImageRole,
  FixFlag,
} from '@/lib/character-3d-types';

interface UseCharacter3DReturn {
  config: Character3DConfig | null;
  images: CharacterImage[];
  latestJob: GenerationJob | null;
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  isGenerating: boolean;
  
  // Config operations
  updateConfig: (updates: Partial<Character3DConfig>) => Promise<void>;
  createConfig: () => Promise<Character3DConfig | null>;
  
  // Image operations
  uploadImage: (file: File, role: ImageRole) => Promise<CharacterImage | null>;
  deleteImage: (imageId: string) => Promise<void>;
  updateImageRole: (imageId: string, role: ImageRole) => Promise<void>;
  
  // Generation operations
  startGeneration: () => Promise<GenerationJob | null>;
  startGenerationWithFixPass: (fixFlags: FixFlag[], fixNotes: string) => Promise<GenerationJob | null>;
  triggerWorker: (jobId: string) => Promise<boolean>;
  pollJobStatus: (jobId: string) => Promise<GenerationJob | null>;
  
  // Model URL (with signed URL support for private bucket)
  getModelUrl: () => Promise<string | null>;
  
  // Refresh
  refresh: () => Promise<void>;
}

const POLL_INTERVAL = 2500; // 2.5 seconds

export function useCharacter3D(characterId: string | undefined): UseCharacter3DReturn {
  const { user } = useAuth();
  const [config, setConfig] = useState<Character3DConfig | null>(null);
  const [images, setImages] = useState<CharacterImage[]>([]);
  const [latestJob, setLatestJob] = useState<GenerationJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!characterId || !user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch 3D config
      const { data: configData, error: configError } = await supabase
        .from('character_3d_configs')
        .select('*')
        .eq('character_id', characterId)
        .maybeSingle();

      if (configError) throw configError;
      setConfig(configData as Character3DConfig | null);

      // Fetch reference images
      const { data: imagesData, error: imagesError } = await supabase
        .from('character_images')
        .select('*')
        .eq('character_id', characterId)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;
      setImages((imagesData || []) as CharacterImage[]);

      // Fetch latest job
      const { data: jobData, error: jobError } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (jobError) throw jobError;
      
      const job = jobData as GenerationJob | null;
      setLatestJob(job);
      
      // Start polling if job is in progress
      if (job && (job.status === 'queued' || job.status === 'processing')) {
        startPolling(job.id);
      }

    } catch (error: any) {
      console.error('Error fetching 3D data:', error);
      toast.error('Failed to load 3D configuration');
    } finally {
      setIsLoading(false);
    }
  }, [characterId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startPolling = useCallback((jobId: string) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data: jobData, error } = await supabase
          .from('generation_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        const job = jobData as GenerationJob;
        setLatestJob(job);

        // Update config status
        if (config) {
          setConfig(prev => prev ? { 
            ...prev, 
            current_status: job.status,
            model_glb_url: job.result_glb_url || prev.model_glb_url,
          } : null);
        }

        // Stop polling if job is complete or errored
        if (job.status === 'done' || job.status === 'error') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          if (job.status === 'done') {
            toast.success('3D model generated successfully!');
            // Update config with result
            if (config && job.result_glb_url) {
              await supabase
                .from('character_3d_configs')
                .update({ 
                  current_status: 'done',
                  model_glb_url: job.result_glb_url,
                  preview_url: job.result_preview_url,
                })
                .eq('id', config.id);
            }
          } else if (job.status === 'error') {
            toast.error(`Generation failed: ${job.error || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, POLL_INTERVAL);
  }, [config]);

  const createConfig = useCallback(async (): Promise<Character3DConfig | null> => {
    if (!characterId || !user) return null;

    setIsSaving(true);
    try {
      const newConfig = {
        character_id: characterId,
        template: 'adult_basic' as CharacterTemplate,
        visual_style: 'toon' as VisualStyle,
        motion_mode: 'static' as MotionMode,
        quality: 'mobile_med' as ModelQuality,
        height_morph: 1.0,
        shoulders_morph: 1.0,
        current_status: 'none' as const,
      };

      const { data, error } = await supabase
        .from('character_3d_configs')
        .insert(newConfig)
        .select()
        .single();

      if (error) throw error;
      
      const created = data as Character3DConfig;
      setConfig(created);
      return created;
    } catch (error: any) {
      console.error('Error creating 3D config:', error);
      toast.error('Failed to create 3D configuration');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [characterId, user]);

  const updateConfig = useCallback(async (updates: Partial<Character3DConfig>): Promise<void> => {
    if (!config) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('character_3d_configs')
        .update(updates)
        .eq('id', config.id);

      if (error) throw error;
      
      setConfig(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      console.error('Error updating 3D config:', error);
      toast.error('Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const uploadImage = useCallback(async (file: File, role: ImageRole): Promise<CharacterImage | null> => {
    if (!characterId || !user) return null;

    if (images.length >= 8) {
      toast.error('Maximum 8 reference images allowed');
      return null;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${characterId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('character-reference-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('character-reference-images')
        .getPublicUrl(filePath);

      // Create database record
      const { data, error } = await supabase
        .from('character_images')
        .insert({
          character_id: characterId,
          storage_path: filePath,
          image_url: urlData.publicUrl,
          role,
          display_order: images.length,
        })
        .select()
        .single();

      if (error) throw error;

      const newImage = data as CharacterImage;
      setImages(prev => [...prev, newImage]);
      toast.success('Image uploaded');
      return newImage;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [characterId, user, images.length]);

  const deleteImage = useCallback(async (imageId: string): Promise<void> => {
    const image = images.find(i => i.id === imageId);
    if (!image) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('character-reference-images')
        .remove([image.storage_path]);

      // Delete from database
      const { error } = await supabase
        .from('character_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(i => i.id !== imageId));
      toast.success('Image deleted');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  }, [images]);

  const updateImageRole = useCallback(async (imageId: string, role: ImageRole): Promise<void> => {
    try {
      const { error } = await supabase
        .from('character_images')
        .update({ role })
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.map(i => i.id === imageId ? { ...i, role } : i));
    } catch (error: any) {
      console.error('Error updating image role:', error);
      toast.error('Failed to update image');
    }
  }, []);

  const createJob = useCallback(async (fixFlags?: FixFlag[], fixNotes?: string): Promise<GenerationJob | null> => {
    if (!config || !characterId) {
      toast.error('Please configure 3D settings first');
      return null;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one reference image');
      return null;
    }

    try {
      // Create job record
      const jobData: any = {
        character_id: characterId,
        config_id: config.id,
        status: 'queued' as const,
        progress: 0,
        logs: JSON.stringify(['Job created, waiting for processing...']),
        template: config.template,
        height_morph: config.height_morph,
        shoulders_morph: config.shoulders_morph,
        visual_style: config.visual_style,
        motion_mode: config.motion_mode,
        quality: config.quality,
      };

      // Add fix pass fields if provided
      if (fixFlags && fixFlags.length > 0) {
        jobData.fix_flags = fixFlags;
      }
      if (fixNotes) {
        jobData.fix_notes = fixNotes;
      }

      const { data, error } = await supabase
        .from('generation_jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) throw error;

      // Update config status
      await supabase
        .from('character_3d_configs')
        .update({ current_status: 'queued' })
        .eq('id', config.id);

      const job = data as GenerationJob;
      setLatestJob(job);
      setConfig(prev => prev ? { ...prev, current_status: 'queued' } : null);

      return job;
    } catch (error: any) {
      console.error('Error creating job:', error);
      throw error;
    }
  }, [config, characterId, images.length]);

  const triggerWorker = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to generate models');
        return false;
      }

      const response = await supabase.functions.invoke('trigger-3d-generation', {
        body: { job_id: jobId },
      });

      if (response.error) {
        console.error('Worker trigger error:', response.error);
        // Don't fail completely - the job is queued, just couldn't trigger worker
        toast.info('Job queued - worker will process it automatically');
        return false;
      }

      const result = response.data;
      if (result.demo_mode) {
        // Run demo simulation for development
        simulateJobProgress(jobId);
      }

      return true;
    } catch (error: any) {
      console.error('Error triggering worker:', error);
      toast.error('Failed to trigger worker');
      return false;
    }
  }, []);

  // Simulated job progress for demo mode
  const simulateJobProgress = async (jobId: string) => {
    const steps = [
      { progress: 10, log: 'Loading template...' },
      { progress: 30, log: 'Applying morphs...' },
      { progress: 50, log: 'Setting up armature...' },
      { progress: 70, log: 'Applying materials...' },
      { progress: 90, log: 'Exporting GLB...' },
      { progress: 100, log: 'Complete!' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const logs = steps.filter(s => s.progress <= step.progress).map(s => s.log);
      
      const isComplete = step.progress === 100;
      const status = isComplete ? 'done' : 'processing';
      
      // For demo, use a placeholder GLB URL when complete
      const result_glb_url = isComplete 
        ? 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'
        : null;
      
      await supabase
        .from('generation_jobs')
        .update({
          progress: step.progress,
          status,
          logs: JSON.stringify(logs),
          result_glb_url,
        })
        .eq('id', jobId);
    }
  };

  const startGeneration = useCallback(async (): Promise<GenerationJob | null> => {
    setIsGenerating(true);
    try {
      const job = await createJob();
      if (!job) return null;
      
      toast.success('Generation job queued');
      
      // Try to trigger the worker
      await triggerWorker(job.id);
      
      // Start polling
      startPolling(job.id);
      
      return job;
    } catch (error: any) {
      console.error('Error starting generation:', error);
      toast.error('Failed to start generation');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [createJob, triggerWorker, startPolling]);

  const startGenerationWithFixPass = useCallback(async (
    fixFlags: FixFlag[], 
    fixNotes: string
  ): Promise<GenerationJob | null> => {
    setIsGenerating(true);
    try {
      const job = await createJob(fixFlags, fixNotes);
      if (!job) return null;
      
      toast.success('Fix pass job queued');
      
      // Try to trigger the worker
      await triggerWorker(job.id);
      
      // Start polling
      startPolling(job.id);
      
      return job;
    } catch (error: any) {
      console.error('Error starting fix pass:', error);
      toast.error('Failed to start fix pass');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [createJob, triggerWorker, startPolling]);

  const pollJobStatus = useCallback(async (jobId: string): Promise<GenerationJob | null> => {
    try {
      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      const job = data as GenerationJob;
      setLatestJob(job);
      return job;
    } catch (error: any) {
      console.error('Error polling job:', error);
      return null;
    }
  }, []);

  // Get model URL - handles both public URLs and private bucket signed URLs
  const getModelUrl = useCallback(async (): Promise<string | null> => {
    const modelPath = config?.model_glb_url || latestJob?.result_glb_url;
    if (!modelPath) return null;

    // If it's already a full URL (e.g., public or demo), return as-is
    if (modelPath.startsWith('http://') || modelPath.startsWith('https://')) {
      return modelPath;
    }

    // Otherwise, it's a storage path - create a signed URL
    try {
      const { data, error } = await supabase.storage
        .from('character-models')
        .createSignedUrl(modelPath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }, [config?.model_glb_url, latestJob?.result_glb_url]);

  return {
    config,
    images,
    latestJob,
    isLoading,
    isSaving,
    isUploading,
    isGenerating,
    updateConfig,
    createConfig,
    uploadImage,
    deleteImage,
    updateImageRole,
    startGeneration,
    startGenerationWithFixPass,
    triggerWorker,
    pollJobStatus,
    getModelUrl,
    refresh: fetchData,
  };
}
