import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2, Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import type { GenerationJob, GenerationStatus, Character3DConfig } from '@/lib/character-3d-types';

interface Character3DGenerationStatusProps {
  config: Character3DConfig | null;
  latestJob: GenerationJob | null;
  imagesCount: number;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  onTriggerWorker?: () => Promise<void>;
}

export default function Character3DGenerationStatus({
  config,
  latestJob,
  imagesCount,
  isGenerating,
  onGenerate,
  onRefresh,
  onTriggerWorker,
}: Character3DGenerationStatusProps) {
  const [logs, setLogs] = useState<string[]>([]);
  
  const status = config?.current_status || 'none';
  const canGenerate = config && imagesCount >= 1 && status !== 'processing' && status !== 'queued';
  
  // Parse logs from job
  useEffect(() => {
    if (latestJob?.logs) {
      try {
        const parsed = typeof latestJob.logs === 'string' 
          ? JSON.parse(latestJob.logs)
          : latestJob.logs;
        setLogs(Array.isArray(parsed) ? parsed : []);
      } catch {
        setLogs([]);
      }
    } else {
      setLogs([]);
    }
  }, [latestJob?.logs]);

  const getStatusBadge = (status: GenerationStatus) => {
    switch (status) {
      case 'none':
        return <Badge variant="outline">Not Generated</Badge>;
      case 'queued':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Queued</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
      case 'done':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: GenerationStatus) => {
    switch (status) {
      case 'none':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Generate 3D Model
            </CardTitle>
          </div>
          {getStatusBadge(status)}
        </div>
        <CardDescription>
          {status === 'none' && 'Ready to generate a rigged 3D model from your character'}
          {status === 'queued' && 'Job queued, waiting for processing...'}
          {status === 'processing' && 'Generating your 3D model...'}
          {status === 'done' && 'Model generated successfully!'}
          {status === 'error' && 'Generation failed. Please try again.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(status === 'queued' || status === 'processing') && latestJob && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{latestJob.progress}%</span>
            </div>
            <Progress value={latestJob.progress} className="h-2" />
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (status === 'processing' || status === 'done') && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Activity Log</span>
            <ScrollArea className="h-24 rounded-md border border-border bg-muted/30 p-2">
              <div className="space-y-1 text-xs font-mono">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i === logs.length - 1 && status === 'processing' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    )}
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && latestJob?.error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {latestJob.error}
          </div>
        )}

        {/* Requirements */}
        {!config && (
          <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground">
            Configure 3D options above to enable generation.
          </div>
        )}
        
        {config && imagesCount === 0 && (
          <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground">
            Upload at least 1 reference image to generate a 3D model.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : status === 'done' ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Rigged Model
              </>
            )}
          </Button>

          {onRefresh && (status === 'processing' || status === 'queued') && (
            <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh status">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}

          {onTriggerWorker && (status === 'queued') && (
            <Button variant="outline" onClick={onTriggerWorker} title="Manually trigger worker">
              <Wand2 className="w-4 h-4 mr-2" />
              Trigger
            </Button>
          )}
        </div>

        {/* Info Note */}
        <p className="text-xs text-muted-foreground text-center">
          Generation uses template-based rigging. Full image→3D coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
