import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, Loader2 } from 'lucide-react';
import { useCharacter3D } from '@/hooks/use-character-3d';
import Character3DImageUploader from './Character3DImageUploader';
import Character3DOptions from './Character3DOptions';
import Character3DViewer from './Character3DViewer';
import Character3DGenerationStatus from './Character3DGenerationStatus';
import type { VisualStyle } from '@/lib/character-3d-types';

interface Character3DPanelProps {
  characterId: string;
}

export default function Character3DPanel({ characterId }: Character3DPanelProps) {
  const {
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
    refresh,
  } = useCharacter3D(characterId);

  // Auto-create config if none exists
  useEffect(() => {
    if (!isLoading && !config && characterId) {
      createConfig();
    }
  }, [isLoading, config, characterId, createConfig]);

  const handleStyleToggle = async () => {
    if (!config) return;
    const newStyle: VisualStyle = config.visual_style === 'toon' ? 'semi' : 'toon';
    await updateConfig({ visual_style: newStyle });
  };

  const handleGenerate = async () => {
    await startGeneration();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading 3D configuration...</span>
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <Box className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">3D Character Generation</h2>
          <p className="text-sm text-muted-foreground">
            Create a rigged 3D model from your character artwork
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upload & Options */}
        <div className="space-y-4">
          <Character3DImageUploader
            images={images}
            isUploading={isUploading}
            onUpload={uploadImage}
            onDelete={deleteImage}
            onUpdateRole={updateImageRole}
          />

          <Character3DOptions
            config={config}
            isLoading={isLoading}
            isSaving={isSaving}
            onUpdate={updateConfig}
          />
        </div>

        {/* Right Column: Generation & Viewer */}
        <div className="space-y-4">
          <Character3DGenerationStatus
            config={config}
            latestJob={latestJob}
            imagesCount={images.length}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onRefresh={refresh}
          />

          {config?.model_glb_url && (
            <Character3DViewer
              glbUrl={config.model_glb_url}
              visualStyle={config.visual_style}
              motionMode={config.motion_mode}
              onStyleToggle={handleStyleToggle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
