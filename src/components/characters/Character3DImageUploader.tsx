import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, X, ImagePlus, Loader2 } from 'lucide-react';
import type { CharacterImage, ImageRole } from '@/lib/character-3d-types';
import { IMAGE_ROLE_OPTIONS } from '@/lib/character-3d-types';

interface Character3DImageUploaderProps {
  images: CharacterImage[];
  isUploading: boolean;
  onUpload: (file: File, role: ImageRole) => Promise<CharacterImage | null>;
  onDelete: (imageId: string) => Promise<void>;
  onUpdateRole: (imageId: string, role: ImageRole) => Promise<void>;
}

export default function Character3DImageUploader({
  images,
  isUploading,
  onUpload,
  onDelete,
  onUpdateRole,
}: Character3DImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRole, setSelectedRole] = useState<ImageRole>('front');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    await onUpload(file, selectedRole);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload, selectedRole]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const getRoleBadgeColor = (role: ImageRole) => {
    switch (role) {
      case 'front': return 'bg-primary/20 text-primary';
      case 'side': return 'bg-blue-500/20 text-blue-400';
      case 'back': return 'bg-purple-500/20 text-purple-400';
      case 'three_quarter': return 'bg-green-500/20 text-green-400';
      case 'detail': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ImagePlus className="w-5 h-5 text-primary" />
          Reference Images
        </CardTitle>
        <CardDescription>
          Upload 1-8 character drawings for 3D model reference
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={isUploading || images.length >= 8}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {images.length >= 8 ? 'Maximum images reached' : 'Drop image here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 5MB • {images.length}/8 uploaded
              </p>
            </>
          )}
        </div>

        {/* Role Selection */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Upload as:</span>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ImageRole)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_ROLE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border border-border bg-card"
              >
                <img
                  src={image.image_url}
                  alt={`Reference ${image.role}`}
                  className="w-full aspect-square object-cover"
                />
                
                {/* Role Badge */}
                <Badge 
                  className={`absolute top-2 left-2 text-xs ${getRoleBadgeColor(image.role)}`}
                >
                  {IMAGE_ROLE_OPTIONS.find(r => r.value === image.role)?.label || image.role}
                </Badge>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {/* Role Dropdown */}
                  <Select 
                    value={image.role} 
                    onValueChange={(v) => onUpdateRole(image.id, v as ImageRole)}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs bg-background/90">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_ROLE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Delete Button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(image.id);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reference images yet. Upload at least one front-facing character drawing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
