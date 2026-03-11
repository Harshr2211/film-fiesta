import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QUESTION_OPTIONS, getOptionBadge, saveRecommendationProfile } from '../utils/recommendations';
import useDynamicTitle from '../hooks/useDynamicTitle';

const fieldOrder = ['industry', 'mood', 'genre', 'pace', 'era', 'language', 'ending', 'watchtime', 'company', 'intensity'];

const RecommendationQuizPage = () => {
  useDynamicTitle('Your Taste Profile | FilmFiesta');
  const navigate = useNavigate();
  const auth = useAuth();
  const [answers, setAnswers] = useState({
    industry: 'Hollywood',
    mood: 'Exciting',
    genre: 'Action',
    pace: 'Balanced',
    era: 'Latest',
    language: 'English',
    ending: 'I am open',
    watchtime: 'Movie night length',
    company: 'Solo watch',
    intensity: 'Immersive',
  });

  const canSubmit = useMemo(() => fieldOrder.every((key) => answers[key]), [answers]);

  const setAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveRecommendationProfile({ ...answers, completedAt: new Date().toISOString() }, auth?.user?.name);
    navigate('/recommendations', { state: { fromQuiz: true } });
  };

  return (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(231,196,106,0.14),_transparent_24%),_radial-gradient(circle_at_top_right,_rgba(245,214,136,0.1),_transparent_24%),_linear-gradient(180deg,_#0a0712_0%,_#120c1d_45%,_#090612_100%)] px-6 py-10 text-white">
  <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[rgba(26,19,40,0.78)] p-8 shadow-2xl transition-all duration-500 animate-[fadeIn_.5s_ease] backdrop-blur-sm">
  <p className="text-sm uppercase tracking-[0.3em] text-amber-200 mb-3">Personalized picks</p>
        <h1 className="text-4xl font-bold mb-3">Your “For You Today” taste quiz</h1>
  <p className="mb-8 text-[#c8bedb]">Answer a few quick movie questions and we’ll build a deeper recommendation profile that you can revisit anytime from the top nav.</p>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <QuizPromo title="Editorial matches" copy="Recommendations feel curated, not random." />
          <QuizPromo title="Smarter details" copy="Watch trailer, check providers, and save it instantly." />
          <QuizPromo title="Premium control" copy="Refine your picks later with region and preference settings." />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {fieldOrder.map((field) => (
            <section key={field}>
              <h2 className="text-xl font-semibold capitalize mb-3">{field}</h2>
              {field === 'industry' ? (
                <p className="mb-3 text-sm leading-7 text-slate-300">
                  Pick a cinema lane directly — including dedicated options for <span className="font-semibold text-white">Bollywood</span> and <span className="font-semibold text-white">South Indian</span> titles.
                </p>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUESTION_OPTIONS[field].map((option) => {
                  const active = answers[field] === option;
                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setAnswer(field, option)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${active ? 'border-[#e7c46a]/40 bg-amber-300/12 text-white shadow-lg scale-[1.01]' : 'border-white/10 bg-black/30 text-gray-200 hover:border-amber-300/60 hover:translate-y-[-1px]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg">
                          {getOptionBadge(field, option)}
                        </span>
                        <div>
                          <div className="font-semibold">{option}</div>
                          <div className="mt-1 inline-flex rounded-full border border-white/10 px-2 py-1 text-xs text-[#c8bedb]">
                            {field.replace(/([A-Z])/g, ' $1')}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Show my recommendations
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-gray-200"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecommendationQuizPage;

function QuizPromo({ title, copy }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-300">{copy}</p>
    </div>
  );
}
