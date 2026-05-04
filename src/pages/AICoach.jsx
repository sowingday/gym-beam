import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from '../components/BottomNav';
import { useState } from 'react';
import { useI18n } from '../lib/i18n';

export default function AICoach() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [question, setQuestion] = useState('');

  const features = language === 'en'
    ? [
      { icon: '?', title: 'Answer questions', desc: 'Ask anything about training, nutrition, and fitness.' },
      { icon: '!', title: 'Tips and tricks', desc: 'Get personalized suggestions to improve your training.' },
      { icon: '*', title: 'Tailored workouts', desc: 'Generate workouts that match your goals.' },
      { icon: '+', title: 'Training plans', desc: 'Receive a complete custom training plan.' },
    ]
    : [
      { icon: '?', title: 'Fragen beantworten', desc: 'Stelle Deine Fragen rund um Training, Ernaehrung und Fitness.' },
      { icon: '!', title: 'Tipps und Tricks', desc: 'Erhalte personalisierte Tipps zur Verbesserung Deines Trainings.' },
      { icon: '*', title: 'Massgeschneiderte Workouts', desc: 'Lasse Dir Workouts erstellen, die zu Dir passen.' },
      { icon: '+', title: 'Trainingsplan', desc: 'Erhalte einen kompletten, massgeschneiderten Trainingsplan.' },
    ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-body">{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="w-7 h-7 text-primary" />
          <h1 className="font-display text-4xl tracking-wide text-foreground">{language === 'en' ? 'AI coach' : 'KI-Coach'}</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-[0_4px_12px_0_rgba(0,0,0,0.18)]">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-body font-semibold text-sm text-foreground mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground font-body leading-snug">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
          <label className="block text-sm font-body font-semibold text-foreground mb-3">
            {language === 'en' ? 'Your question:' : 'Deine Frage:'}
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={language === 'en'
              ? "e.g. 'How can I improve my bench press strength?' or 'Create a 3-day training plan for me'"
              : "z. B. 'Wie kann ich meine Kraft im Bankdruecken verbessern?' oder 'Erstelle mir einen Trainingsplan fuer 3x Training pro Woche'"}
            className="w-full px-4 py-3 rounded-lg border border-input bg-transparent text-base font-body placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none h-24 mb-4"
          />
          <Button disabled className="w-full h-11 text-base font-body gap-2 opacity-50">
            <Sparkles className="w-4 h-4" />
            {language === 'en' ? 'AI answers will be available soon' : 'KI-Antwort wird in Kuerze verfuegbar sein'}
          </Button>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-border/50 bg-muted/30">
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            {language === 'en'
              ? 'The AI coach will answer questions, give personalized tips, create tailored workouts, and assemble full training plans. This feature will be unlocked soon.'
              : 'Der KI-Coach wird Fragen beantworten, personalisierte Tipps geben, massgeschneiderte Workouts erstellen und vollstaendige Trainingsplaene zusammenstellen. Diese Funktion wird in Kuerze freigeschaltet.'}
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
