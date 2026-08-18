import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';
import { PageContainer } from '@/components/layout/PageContainer';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Take the Assessment',
    description: 'Complete a structured English assessment covering multiple language skills.',
  },
  {
    step: '02',
    title: 'Get Evaluated',
    description: 'Your responses are analyzed using structured assessment and AI evaluation.',
  },
  {
    step: '03',
    title: 'Understand Your Level',
    description: 'Receive your overall CEFR level, skill breakdown, strengths and areas for improvement.',
  },
];

const SKILLS = [
  { icon: '📝', name: 'Grammar', description: 'Measure grammatical accuracy and understanding.' },
  { icon: '🔤', name: 'Vocabulary', description: 'Measure vocabulary range and appropriate usage.' },
  { icon: '📖', name: 'Reading', description: 'Measure comprehension of written English.' },
  { icon: '🎧', name: 'Listening', description: 'Measure comprehension of spoken English.' },
  { icon: '✍️', name: 'Writing', description: 'Evaluate written communication, grammar, vocabulary and coherence.' },
  { icon: '🎤', name: 'Speaking', description: 'Evaluate spoken communication, fluency, vocabulary and grammatical performance.' },
];

const TRUST_INDICATORS = ['CEFR-aligned', 'AI-powered', 'Multi-skill assessment'];

export const LandingView: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'One-CEFR Placement Test | Know your English level';
  }, []);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gradient-to-b from-eu-blue-50 to-white">
        <PageContainer className="py-16 md:py-24 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Know your English level.
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            One-CEFR uses AI-powered assessment to evaluate your English across six core skills
            and provide an overall CEFR proficiency level.
          </p>
          <p className="mt-3 text-base font-medium text-gray-500">
            One assessment. Six skills. One clear English level.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-eu-blue hover:bg-eu-blue/90 text-white px-8"
            >
              Start Free Assessment
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How It Works
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            {TRUST_INDICATORS.map((label) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-eu-blue" />
                {label}
              </span>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-20 border-b border-gray-200">
        <PageContainer className="max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <span className="text-sm font-semibold text-eu-blue tracking-widest">
                  {item.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* What We Assess */}
      <section className="py-16 md:py-20 bg-gray-50">
        <PageContainer className="max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">
            What We Assess
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Six core skills, one comprehensive CEFR result.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SKILLS.map((skill) => (
              <Card key={skill.name} className="border-gray-200 shadow-none">
                <CardContent className="p-5">
                  <div className="text-2xl mb-2" aria-hidden="true">{skill.icon}</div>
                  <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{skill.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Closing CTA */}
      <section className="py-16 md:py-20">
        <PageContainer className="max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Ready to know your English level?
          </h2>
          <p className="mt-3 text-gray-600">
            AI-powered English placement assessment aligned with the CEFR framework.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-eu-blue hover:bg-eu-blue/90 text-white px-8"
            >
              Start Free Assessment
            </Button>
          </div>
          <p className="mt-6 text-xs text-gray-400 max-w-md mx-auto">
            One-CEFR provides a CEFR-aligned indication of English proficiency. It is not an
            official IELTS, TOEFL, Cambridge, or government certification.
          </p>
        </PageContainer>
      </section>
    </div>
  );
};

export default LandingView;
