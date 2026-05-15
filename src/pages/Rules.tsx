import PublicNav from '@/components/layout/PublicNav';
import RulesBook from '@/components/rules/RulesBook';
import SEO from '@/components/SEO';

const rulesFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does character creation work in O.C.R.P.?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Players design original characters with a guided 6-step wizard, defining stats, abilities, personality, and backstory before entering the realm.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are the PvP combat rules?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PvP battles use a narrator-driven dice system with action rolls, momentum, and psychology mechanics. Players take turns describing moves while the Narrator resolves outcomes.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do power tiers work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Characters scale across 1-7 opponent tiers. Stats range 0-100 across 8 categories, with thresholds determining what techniques and feats are believable.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I run group or team battles?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Group PvP supports 1-2-3 turn cycles for up to 3 players, and team battles let coordinated squads clash with shared objectives.',
      },
    },
  ],
};

export default function Rules() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="The R.O.K. Living Rulebook — O.C.R.P."
        description="Read the official rules for O.C.R.P.: character creation, PvP combat, power tiers, group battles, and the narrator-driven roleplay system."
        path="/rules"
        jsonLd={rulesFaqJsonLd}
      />
      <PublicNav />
      <main className="flex-1">
        <RulesBook />
      </main>
    </div>
  );
}
