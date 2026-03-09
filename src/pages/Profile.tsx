import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
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
import { toast } from 'sonner';
import { User, Save, Camera, Trash2, EyeOff, Eye, Users, KeyRound, AtSign, Crown } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { founderStatus } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isPrivate, setIsPrivate] = useState(profile?.is_private || false);
  const [hideFriendsList, setHideFriendsList] = useState((profile as any)?.hide_friends_list || false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdateUsername = async () => {
    if (!user || !profile) return;
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (trimmed.length > 30) {
      toast.error('Username must be 30 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      toast.error('Username can only contain letters, numbers, hyphens, and underscores');
      return;
    }
    if (trimmed === profile.username) return;

    setIsUpdatingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', user.id);
      if (error) {
        if (error.message.includes('unique') || error.code === '23505') {
          toast.error('Username is already taken');
        } else {
          throw error;
        }
      } else {
        await refreshProfile();
        toast.success('Username updated!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update username');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setIsLoading(true);

    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          is_private: isPrivate,
          hide_friends_list: hideFriendsList,
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);

    try {
      // Delete user data in order (respecting foreign key constraints)
      // 1. Delete battle messages for user's characters
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id);

      if (userCharacters && userCharacters.length > 0) {
        const characterIds = userCharacters.map(c => c.id);
        
        await supabase
          .from('battle_messages')
          .delete()
          .in('character_id', characterIds);

        await supabase
          .from('battle_participants')
          .delete()
          .in('character_id', characterIds);
      }

      // 2. Delete characters
      await supabase
        .from('characters')
        .delete()
        .eq('user_id', user.id);

      // 3. Delete planet customizations
      await supabase
        .from('planet_customizations')
        .delete()
        .eq('user_id', user.id);

      // 4. Delete sun customizations
      await supabase
        .from('sun_customizations')
        .delete()
        .eq('user_id', user.id);

      // 5. Delete solar systems
      await supabase
        .from('solar_systems')
        .delete()
        .eq('user_id', user.id);

      // 6. Delete races
      await supabase
        .from('races')
        .delete()
        .eq('user_id', user.id);

      // 7. Delete friendships
      await supabase
        .from('friendships')
        .delete()
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      // 8. Delete galaxy customizations
      await supabase
        .from('galaxy_customizations')
        .delete()
        .eq('user_id', user.id);

      // 9. Delete user roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      // 8. Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      // 9. Sign out and navigate away
      await signOut();
      navigate('/');
      toast.success('Your account has been deleted.');
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(error.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
      }
      setAvatarFile(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="bg-card-gradient border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Your Profile
          </CardTitle>
          <CardDescription>
            Update your public profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/30">
                <AvatarImage 
                  src={avatarFile ? URL.createObjectURL(avatarFile) : (profile?.avatar_url || undefined)} 
                />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/80 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.username}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is how other players will see you
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </div>

          {/* Privacy Mode */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EyeOff className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="private-mode" className="font-semibold cursor-pointer">
                    Private Mode
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hide your profile and characters from public directories
                  </p>
                </div>
              </div>
              <Switch
                id="private-mode"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
            {isPrivate && (
              <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                ⚠️ Your profile and characters won't appear in search results or public listings
              </p>
            )}
          </div>

          {/* Friends List Privacy */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="hide-friends" className="font-semibold cursor-pointer">
                    Hide Friends List
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hide your friends and followers from other users
                  </p>
                </div>
              </div>
              <Switch
                id="hide-friends"
                checked={hideFriendsList}
                onCheckedChange={setHideFriendsList}
              />
            </div>
            {hideFriendsList && (
              <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                ⚠️ Your friends list won't be visible on your public profile
              </p>
            )}
          </div>

          {/* Change Username */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <AtSign className="w-5 h-5 text-primary" />
              <Label className="font-semibold">Change Username</Label>
            </div>
            <Input
              placeholder="New username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, hyphens, and underscores only. 3–30 characters.
            </p>
            <Button
              onClick={handleUpdateUsername}
              disabled={isUpdatingUsername || newUsername.trim() === profile?.username}
              size="sm"
              variant="outline"
            >
              {isUpdatingUsername ? 'Updating...' : 'Update Username'}
            </Button>
          </div>

          {/* Change Password */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <Label className="font-semibold">Change Password</Label>
            </div>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
              size="sm"
              variant="outline"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>

          <Button onClick={handleSave} className="w-full glow-primary" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers, including:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Your profile and avatar</li>
                    <li>All your characters</li>
                    <li>Your solar systems and planets</li>
                    <li>Your custom races</li>
                    <li>Your friends and connections</li>
                    <li>Battle history and messages</li>
                  </ul>
                  <div className="pt-2">
                    <Label htmlFor="delete-confirm" className="text-foreground">
                      Type <span className="font-bold text-destructive">DELETE</span> to confirm:
                    </Label>
                    <Input
                      id="delete-confirm"
                      className="mt-2"
                      placeholder="DELETE"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
