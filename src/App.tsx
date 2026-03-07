import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";

import Landing from "@/pages/Landing";
import ThroneRoom from "@/pages/ThroneRoom";
import Auth from "@/pages/Auth";
import Hub from "@/pages/Hub";
import CreateCharacter from "@/pages/CreateCharacter";
import EditCharacter from "@/pages/EditCharacter";
import CharacterDetail from "@/pages/CharacterDetail";
import CharacterDirectory from "@/pages/CharacterDirectory";
import CharacterList from "@/pages/CharacterList";
import Battles from "@/pages/Battles";
import BattleView from "@/pages/BattleView";
import MockBattle from "@/pages/MockBattle";
import EvEBattle from "@/pages/EvEBattle";
import GroupBattleCreate from "@/pages/GroupBattleCreate";
import Rules from "@/pages/Rules";
import Profile from "@/pages/Profile";
import UserProfile from "@/pages/UserProfile";
import Friends from "@/pages/Friends";
import Admin from "@/pages/Admin";
import Terms from "@/pages/Terms";
import Races from "@/pages/Races";
import Stories from "@/pages/Stories";
import Teams from "@/pages/Teams";
import Settings from "@/pages/Settings";
import Campaigns from "@/pages/Campaigns";
import CampaignView from "@/pages/CampaignView";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/throne-room" element={<ThroneRoom />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/hub" element={<Hub />} />
              <Route path="/characters" element={<CharacterDirectory />} />
              <Route path="/characters/list" element={<CharacterList />} />
              <Route path="/characters/new" element={<CreateCharacter />} />
              <Route path="/characters/:id" element={<CharacterDetail />} />
              <Route path="/characters/:id/edit" element={<EditCharacter />} />
              <Route path="/battles" element={<Battles />} />
              <Route path="/battles/group" element={<GroupBattleCreate />} />
              <Route path="/battles/practice" element={<MockBattle />} />
              <Route path="/battles/simulation" element={<EvEBattle />} />
              <Route path="/battles/:id" element={<BattleView />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:username" element={<UserProfile />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/races" element={<Races />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignView />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
