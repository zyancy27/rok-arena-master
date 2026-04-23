import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PublicNav from '@/components/layout/PublicNav';
import { Shield, FileText, User, Scale, Mail } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-nebula-gradient bg-stars">
      <PublicNav />
      <div className="container mx-auto px-4 py-12 max-w-4xl">

        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Scale className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Terms of Service & Ownership Rights</h1>
            <p className="text-muted-foreground text-lg">
              Your creative rights are important to us
            </p>
          </div>

          <Card className="bg-card-gradient border-primary/30 glow-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="w-6 h-6" />
                Character Ownership & Intellectual Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p className="text-lg font-medium text-foreground">
                Your characters belong to YOU. Period.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  All original characters, concepts, backstories, powers, and designs that you create 
                  and upload to O.C.R.P. remain your exclusive intellectual property.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  You retain full legal ownership and all rights (including copyright, trademark potential, 
                  and commercial rights) to your original creations.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  O.C.R.P. does not claim any ownership, licensing rights, or creative control 
                  over your characters or ideas.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  You may remove your characters at any time, and you may use your characters 
                  in any other projects, publications, or platforms freely.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Limited License for Platform Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <p>
                By uploading content to O.C.R.P., you grant us only the minimal license necessary 
                to display your characters within the platform. This includes:
              </p>
              <ul className="space-y-2 ml-4">
                <li>• Displaying your character profiles to other users</li>
                <li>• Storing character data for battle functionality</li>
                <li>• Showing character images in battle logs and directories</li>
              </ul>
              <p className="font-medium text-foreground">
                This license is non-exclusive, revocable (when you delete your content), and 
                limited solely to operating the O.C.R.P. platform.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <ul className="space-y-2">
                <li>• You confirm that characters you create are your original work or that you have 
                    the rights to use any referenced material</li>
                <li>• You will not upload content that infringes on others' intellectual property</li>
                <li>• You are responsible for maintaining your own records of your character concepts</li>
                <li>• Battle transcripts are stored for gameplay purposes but remain linked to your 
                    ownership of the participating characters</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact & Disputes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <p>
                If you have any questions about these terms or believe your intellectual property 
                rights have been infringed upon within our platform, please contact us immediately. 
                We take ownership rights seriously and will work to resolve any disputes promptly.
              </p>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>Last updated: January 2026</p>
            <p className="mt-2">
              By using O.C.R.P., you agree to these terms while retaining full ownership 
              of your creative works.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
