import FriendsPanel from '@/components/friends/FriendsPanel';
import FriendSystemsViewer from '@/components/solar-system/FriendSystemsViewer';
import GalaxyCustomizer from '@/components/solar-system/GalaxyCustomizer';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Friends() {
  const navigate = useNavigate();

  const handleViewSystem = (systemId: string, ownerId: string) => {
    // Navigate to characters page with the system as a query param
    navigate(`/characters?system=${systemId}`);
    toast.info('Viewing friend\'s solar system');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent">
          Friends & Galaxy
        </h1>
        <p className="text-muted-foreground">
          Connect with players and customize your galaxy appearance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Friends Panel */}
        <FriendsPanel />
        
        {/* Galaxy Customization */}
        <div className="space-y-6">
          <GalaxyCustomizer />
          <FriendSystemsViewer onViewSystem={handleViewSystem} />
        </div>
      </div>
    </div>
  );
}
