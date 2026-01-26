import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Settings, ArrowLeft, Trash2, Loader2, Merge, Moon, Eye, EyeOff } from 'lucide-react';

interface PlanetMenuProps {
  planetName: string;
  characterCount: number;
  onViewCharacters: () => void;
  onEditPlanet: () => void;
  onDeletePlanet?: () => Promise<void>;
  onMergePlanet?: () => void;
  onConvertToMoon?: () => void;
  onBack: () => void;
  canDelete?: boolean;
  canMerge?: boolean;
  canConvertToMoon?: boolean;
}

export default function PlanetMenu({
  planetName,
  characterCount,
  onViewCharacters,
  onEditPlanet,
  onDeletePlanet,
  onMergePlanet,
  onConvertToMoon,
  onBack,
  canDelete = false,
  canMerge = false,
  canConvertToMoon = false,
}: PlanetMenuProps) {
  const [deleting, setDeleting] = useState(false);
  const [menuHidden, setMenuHidden] = useState(false);

  const handleDelete = async () => {
    if (!onDeletePlanet) return;
    setDeleting(true);
    try {
      await onDeletePlanet();
    } finally {
      setDeleting(false);
    }
  };

  // When menu is hidden, show a small button to bring it back
  if (menuHidden) {
    return (
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMenuHidden(false)}
          className="gap-2 shadow-lg"
        >
          <Eye className="w-4 h-4" />
          Show Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <Card className="bg-card/95 backdrop-blur-md border-primary/30 w-80 pointer-events-auto animate-scale-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuHidden(true)}
              title="Hide menu to interact with planet"
            >
              <EyeOff className="w-4 h-4 mr-1" />
              Hide
            </Button>
          </div>
          <CardTitle className="text-center pt-2 text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {planetName}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            {characterCount} character{characterCount !== 1 ? 's' : ''} residing here
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Button
            className="w-full h-14 text-lg gap-3"
            onClick={onViewCharacters}
          >
            <Users className="w-5 h-5" />
            View Characters
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 gap-3"
            onClick={onEditPlanet}
          >
            <Settings className="w-4 h-4" />
            Edit Planet Info
          </Button>

          {/* Merge Planet Button */}
          {canMerge && onMergePlanet && (
            <Button
              variant="secondary"
              className="w-full h-10 gap-2"
              onClick={onMergePlanet}
            >
              <Merge className="w-4 h-4" />
              Merge Into Another Planet
            </Button>
          )}

          {/* Convert to Moon Button */}
          {canConvertToMoon && onConvertToMoon && (
            <Button
              variant="secondary"
              className="w-full h-10 gap-2"
              onClick={onConvertToMoon}
            >
              <Moon className="w-4 h-4" />
              Convert to Moon
            </Button>
          )}
          
          {canDelete && onDeletePlanet && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full h-10 gap-2"
                  disabled={characterCount > 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Planet
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {planetName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this planet and all its customizations.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {canDelete && characterCount > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Move or delete all characters before deleting this planet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
