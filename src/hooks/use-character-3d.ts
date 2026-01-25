import { useState, useEffect, useCallback } from 'react';
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
  DEFAULT_3D_CONFIG,
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
  pollJobStatus: (jobId: string) => Promise<GenerationJob | null>;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useCharacter3D(characterId: string | undefined): UseCharacter3DReturn {
  const { user } = useAuth();
  const [config, setConfig] = useState<Character3DConfig | null>(null);
  const [images, setImages] = useState<CharacterImage[]>([]);
  const [latestJob, setLatestJob] = useState<GenerationJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
      setLatestJob(jobData as GenerationJob | null);

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

  const startGeneration = useCallback(async (): Promise<GenerationJob | null> => {
    if (!config || !characterId) {
      toast.error('Please configure 3D settings first');
      return null;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one reference image');
      return null;
    }

    setIsGenerating(true);
    try {
      // Create job record
      const jobData = {
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
      
      toast.success('Generation job queued');
      
      // Note: In production, this would trigger an edge function or external service
      // For now, we simulate the job completing after a delay
      simulateJobProgress(job.id);
      
      return job;
    } catch (error: any) {
      console.error('Error starting generation:', error);
      toast.error('Failed to start generation');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [config, characterId, images.length]);

  // Simulated job progress for demo (replace with real polling)
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

      if (config) {
        await supabase
          .from('character_3d_configs')
          .update({ 
            current_status: status,
            model_glb_url: result_glb_url,
          })
          .eq('id', config.id);
      }

      // Refresh state
      await fetchData();
    }
  };

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
    pollJobStatus,
    refresh: fetchData,
  };
}
