import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";

import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Hub from "@/pages/Hub";
import CreateCharacter from "@/pages/CreateCharacter";
import EditCharacter from "@/pages/EditCharacter";
import CharacterDetail from "@/pages/CharacterDetail";
import CharacterDirectory from "@/pages/CharacterDirectory";
import Battles from "@/pages/Battles";
import BattleView from "@/pages/BattleView";
import Rules from "@/pages/Rules";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/rules" element={<Rules />} />
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/hub" element={<Hub />} />
              <Route path="/characters" element={<CharacterDirectory />} />
              <Route path="/characters/new" element={<CreateCharacter />} />
              <Route path="/characters/:id" element={<CharacterDetail />} />
              <Route path="/characters/:id/edit" element={<EditCharacter />} />
              <Route path="/battles" element={<Battles />} />
              <Route path="/battles/:id" element={<BattleView />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<ProtectedRoute requireModerator><Admin /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
