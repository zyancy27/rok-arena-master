import PublicNav from '@/components/layout/PublicNav';
import RulesBook from '@/components/rules/RulesBook';

export default function Rules() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNav />
      <main className="flex-1">
        <RulesBook />
      </main>
    </div>
  );
}
