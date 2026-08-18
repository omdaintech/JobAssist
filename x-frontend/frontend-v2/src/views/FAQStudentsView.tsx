import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, Button, Accordion, AccordionItem } from '@/components/ui';
import { MarkdownContent } from '@/components/ui/markdown-content';

const FAQ_CONTENT = `# FAQ for Students & Individual Learners

**Last Updated:** October 17, 2025  
**Version:** Beta MVP

Welcome! This FAQ answers common questions about using Lingali for your German language practice and assessment.

---

## 📚 Getting Started

### What is Lingali?

Lingali is an AI-powered CEFR (Common European Framework of Reference) assessment platform for German language learners. We help you practice and evaluate your German skills across Reading, Writing, Grammar, and Listening (Hearing) at levels A1, A2, and B1.

**Think of us as:** Your personal AI examiner that gives you instant, detailed feedback on your German proficiency—just like preparing for a Goethe-Institut exam, but faster, cheaper, and available 24/7.

### Who is Lingali for?

- **Students** preparing for official German language exams (Goethe-Zertifikat, telc, TestDaF)
- **Professionals** who need German certification for work or immigration
- **Self-learners** who want honest feedback on their progress
- **Anyone** who wants to know their real CEFR level without taking an expensive official exam

### How is Lingali different from Duolingo or Babbel?

| Feature | Lingali | Duolingo/Babbel |
|---------|---------|-----------------|
| **Purpose** | Assessment & Testing | Learning & Teaching |
| **Focus** | Measure your level | Build your skills |
| **Feedback** | Detailed, examiner-style analysis | Correct/incorrect only |
| **Standards** | CEFR-aligned (Goethe rubrics) | Gamified, general |
| **Best for** | Exam preparation & progress tracking | Daily practice & vocabulary |

**Short answer:** We assess, they teach. Use both! Practice with Duolingo/Babbel, then test your progress with us.

### Do I need German knowledge to start?

Yes! Lingali is for learners who already have some German foundation:

- **A1 (Beginner):** You can introduce yourself, ask simple questions, understand basic sentences (~600-800 words)
- **A2 (Elementary):** You can talk about past events, write short emails, handle everyday situations (~1200-1500 words)
- **B1 (Intermediate):** You can express opinions, write formal letters, understand complex texts (~2500-3000 words)
- **B2 (Upper Intermediate):** You can understand abstract topics, write detailed essays, engage in professional discussions (~4000-5000 words)

**Not sure which level?** Start with A1. Our AI will tell you in the feedback if you're ready for the next level!

---

## 🔐 Account & Registration

### How do I sign up?

1. Go to [https://lingali.com](https://lingali.com) (or your school's custom link if provided)
2. Click **"Sign Up"**
3. Enter your email and create a password
4. **Verify your email** (check your inbox/spam folder)
5. Once verified, you'll automatically receive **10 free trial credits**!

**That's it!** You can start taking practice sessions immediately.

### What do I get with the free trial?

**10 free credits** upon email verification, which gives you:

- **Multiple Practice Sessions** (many are FREE or low-cost), OR
- **1-2 Full Exams** (6 credits each), OR
- **Mix and match!**

**No credit card required.** The trial credits have full functionality—you get the same AI feedback as paid users.

### Can I use the platform without payment?

**Yes!** Your 10 trial credits work exactly like paid credits. You can:
- Take practice sessions or exams
- Get full AI analysis and feedback
- View your results and session history
- Track your progress over time

When your trial credits run out, you'll need to purchase more credits to continue.

---

## 💳 Credits & Payment

### What are credits?

Credits are tokens you spend to take assessment sessions. Think of them like arcade tokens or gym class passes—you use them each time you want to analyze your German skills.

**How many credits per session?**
- **Practice Session** (single skill): **FREE to 2 credits** (depending on activity type)
- **Full Exam** (multiple skills): **6 credits**

Credits are deducted only after you complete and analyze a session.

### How do I buy credits?

**Step 1:** Click **"Buy Credits"** in your dashboard  
**Step 2:** Choose a credit pack (see pricing below)  
**Step 3:** Pay via **PayPal**  
**Step 4:** Our team confirms your payment within **24 hours** (usually much faster!)  
**Step 5:** Credits appear in your account automatically

**Why the wait?** We're a small team and manually verify each payment to ensure security and accuracy.

### What are the pricing packs?

| Pack | Credits | Price | Best For |
|------|---------|-------|----------|
| **Starter** | 50 | €4.99 | Trying out the platform |
| **Standard** ⭐ | 200 | €14.99 | Regular practice (most popular!) |
| **Premium** | 500 | €29.99 | Serious exam prep |
| **Professional** | 1000 | €49.99 | Intensive training |

**Value comparison:**
- **Starter (€4.99):** Multiple practice sessions + several full exams
- **Standard (€14.99):** Extensive practice + 33 full exams
- **Premium (€29.99):** Comprehensive practice + 83 full exams

**Compare to official exams:** One Goethe-Institut exam costs €150-200. Our Standard pack (€14.99) gives you 33 practice exams!

### Do credits expire?

**No! Credits never expire.** Buy during a sale, use whenever you're ready. Your credits remain in your account indefinitely.

---

## 📝 Sessions: Practice vs Exam

### What's the difference between Practice and Exam sessions?

| Feature | Practice Session | Full Exam |
|---------|------------------|-----------|
| **Cost** | FREE to 2 credits | 6 credits |
| **Focus** | Single skill (e.g., only Reading) | Multiple skills (Reading, Writing, Grammar) |
| **Questions** | ~5 questions | 10-15 questions |
| **Time** | ~15-20 minutes | ~45-60 minutes |
| **Feedback** | Detailed for that skill | Comprehensive across all skills |
| **Best for** | Targeted practice on weak areas | Overall level assessment |

**Pro tip:** Use Practice sessions to improve specific skills (e.g., "I struggle with Writing"), then take Full Exams to see your overall progress.

### Can I pause and resume a session?

**Yes!** Your progress is automatically saved every time you submit an answer. You can:
- Close your browser and come back later
- Resume from exactly where you left off
- Take breaks anytime

**How it works:** When you return, you'll see a "Resume Session" button that takes you to your next question.

---

## 🌍 Languages & Levels

### What languages are available?

**Currently:** Only **German** is fully functional.

**Coming soon:** French (planned for later in 2025).

### What CEFR levels does Lingali support?

We offer assessment for four levels:

#### **A1 - Absolute Beginner**
**Can you...**
- Introduce yourself? ("Ich heiße Anna, ich komme aus Spanien.")
- Ask for things in a shop? ("Ich möchte ein Brot, bitte.")
- Understand simple sentences?

**Grammar:** Present tense, basic vocabulary  
**Vocabulary:** ~600-800 words

---

#### **A2 - Elementary**
**Can you...**
- Talk about past events? ("Gestern war ich im Kino.")
- Handle everyday situations? (Doctor appointments, shopping)
- Write short emails?

**Grammar:** Past tense, modal verbs (müssen, können), Dativ case  
**Vocabulary:** ~1200-1500 words

---

#### **B1 - Intermediate**
**Can you...**
- Express opinions and justify them?
- Write formal letters and reports?
- Understand complex newspaper articles?

**Grammar:** All four cases, subjunctive, complex sentences  
**Vocabulary:** ~2500-3000 words

---

#### **B2 - Upper Intermediate**
**Can you...**
- Understand abstract and technical discussions?
- Write detailed essays with clear argumentation?
- Engage in professional conversations fluently?

**Grammar:** Advanced subjunctive (Konjunktiv I & II), extended participial constructions, nominalization  
**Vocabulary:** ~4000-5000 words

---

## 📊 Results & Feedback

### How long until I get results?

**Usually 60-90 seconds** after you click "Analyze Session."

### What's included in my results?

Your results include:

**1. Overall Score (0-100%)**
- Your performance across all questions
- CEFR level assessment (e.g., "Solid A2 level, approaching B1")

**2. Per-Question Feedback**
- Quality rating: Perfect, Good, Ok, Poor
- Score: 0-10 points
- Detailed explanation of what was right/wrong
- Error pattern analysis
- Focus area (what to study next)

**3. Section Summary**
- Strengths: What you're doing well
- Improvements: What needs work
- Study recommendations: Specific topics and methods

**4. Bilingual Explanations**
- Feedback in **English** (easy to understand)
- German examples where needed (see correct usage in context)

### Can I see past results?

**Yes!** All your session results are saved in your account. Go to **"My Sessions"** or **"History"** in your dashboard.

---

## 🎧 Audio/Hearing Sessions

### How do hearing sessions work?

**Hearing (Hörverstehen)** tests your ability to understand spoken German.

**Format:**
1. You listen to a German audio recording (announcement, conversation, news clip)
2. Answer comprehension questions about what you heard
3. Get feedback on your listening skills

### Can I replay the audio?

**Yes!** Our audio player includes full controls:
- ▶️ Play/Pause
- ⏪ Rewind/seek to specific parts
- 🔊 Volume control
- Unlimited replays

---

## 💻 Technical Requirements

### What devices work?

**Any device with a modern web browser:**

- **💻 Desktop/Laptop:** Best experience (recommended for Writing activities)
- **📱 Smartphone:** Works well for Reading, Grammar, Hearing
- **📱 Tablet:** Great for all activity types

### Do I need to download an app?

**No!** Lingali works entirely in your web browser. Just go to [https://lingali.com](https://lingali.com) and log in.

---

## 🔧 Troubleshooting

### My session won't start

**Check these first:**

1. **Do you have enough credits?**
   - Practice sessions: FREE to 2 credits (depending on activity)
   - Full exam: 6 credits
   - Check your balance in the dashboard

2. **Is your internet connection stable?**
   - Try refreshing the page
   - Check if other websites load normally

3. **Browser issues?**
   - Clear your browser cache
   - Try a different browser

**Still stuck?** Contact us at [https://lingali.com/contact](https://lingali.com/contact)

### I didn't get my results

**If it's been less than 2 minutes:** Wait a bit longer. AI analysis usually takes 60-90 seconds.

**If it's been more than 5 minutes:**
1. Refresh your browser
2. Check your session history—results may already be there

**Still missing?** Contact support: [https://lingali.com/contact](https://lingali.com/contact)

### Payment confirmed but no credits added

**Timeline:** Credits are added within **24 hours** of payment (usually much faster during business hours).

**After 24 hours?** Contact us with your PayPal transaction ID: [https://lingali.com/contact](https://lingali.com/contact)

---

## 📞 Need More Help?

**Can't find your answer here?**

📧 **Contact us:** [https://lingali.com/contact](https://lingali.com/contact)

We typically respond within 24 hours (faster during weekdays).

---

**Thank you for using Lingali! We're here to help you achieve your German language goals. 🇩🇪**
`;

interface FAQSection {
  title: string;
  emoji: string;
  questions: {
    question: string;
    answer: string;
  }[];
}

const parseFAQContent = (content: string): FAQSection[] => {
  const lines = content.split('\n');
  const sections: FAQSection[] = [];
  let currentSection: FAQSection | null = null;
  let currentQuestion: { question: string; answer: string } | null = null;
  let answerLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Section headers (##)
    if (line.startsWith('## ')) {
      // Save previous question if exists
      if (currentQuestion && currentSection) {
        currentQuestion.answer = answerLines.join('\n').trim();
        currentSection.questions.push(currentQuestion);
        currentQuestion = null;
        answerLines = [];
      }

      // Extract emoji and title from section header
      const sectionText = line.replace('## ', '').trim();
      const emojiMatch = sectionText.match(/^([\u{1F000}-\u{1F9FF}])\s*(.+)$/u);
      
      currentSection = {
        title: emojiMatch ? emojiMatch[2] : sectionText,
        emoji: emojiMatch ? emojiMatch[1] : '📝',
        questions: []
      };
      sections.push(currentSection);
    }
    // Question headers (###)
    else if (line.startsWith('### ')) {
      // Save previous question if exists
      if (currentQuestion && currentSection) {
        currentQuestion.answer = answerLines.join('\n').trim();
        currentSection.questions.push(currentQuestion);
        answerLines = [];
      }

      currentQuestion = {
        question: line.replace('### ', '').trim(),
        answer: ''
      };
    }
    // Content lines (part of answer)
    else if (currentQuestion) {
      answerLines.push(line);
    }
  }

  // Save last question
  if (currentQuestion && currentSection) {
    currentQuestion.answer = answerLines.join('\n').trim();
    currentSection.questions.push(currentQuestion);
  }

  return sections;
};

export const FAQStudentsView: React.FC = () => {
  const navigate = useNavigate();
  
  const faqSections = useMemo(() => parseFAQContent(FAQ_CONTENT), []);

  // Set page title
  useEffect(() => {
    document.title = 'FAQ for Students | Lingali';
  }, []);

  return (
    <PageContainer className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">❓</span>
          <h1 className="text-3xl font-bold text-gray-900">Student FAQ</h1>
        </div>
        <p className="text-gray-600">
          Everything you need to know about using Lingali
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Click on any question to expand the answer
        </p>
      </div>

      {/* FAQ Content */}
      {faqSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{section.emoji}</span>
            <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Accordion>
                {section.questions.map((item, questionIndex) => (
                  <AccordionItem
                    key={questionIndex}
                    title={item.question}
                    defaultOpen={sectionIndex === 0 && questionIndex === 0}
                  >
                    <MarkdownContent content={item.answer} />
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Quick Links Footer */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Quick Links:</strong>
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://lingali.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-eu-blue hover:underline"
          >
            Contact Support
          </a>
          <span className="text-gray-400">•</span>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-eu-blue hover:underline"
          >
            Dashboard
          </button>
          <span className="text-gray-400">•</span>
          <button
            onClick={() => navigate('/practice')}
            className="text-sm text-eu-blue hover:underline"
          >
            Start Practice
          </button>
          <span className="text-gray-400">•</span>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm text-eu-blue hover:underline"
          >
            Settings
          </button>
        </div>
      </div>
    </PageContainer>
  );
};




