import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, Button, Badge, Accordion, AccordionItem } from '@/components/ui';
import { MarkdownContent } from '@/components/ui/markdown-content';

const FAQ_CONTENT = `# FAQ for Schools & Educational Institutions

**Last Updated:** October 17, 2025  
**Version:** Beta - School Features Planned for Later 2025

**Note:** School administration features are currently being developed and will be fully available later in 2025. This FAQ provides an overview of the planned school offering.

---

## 🏫 Overview

### What is the One-CEFR school offering?

One-CEFR for Schools is a B2B platform that enables language schools, universities, and corporate training programs to:

- **Assess students at scale** using AI-powered CEFR evaluations
- **Create bulk sessions** for entire classes
- **Track student progress** with analytics dashboards
- **Manage student accounts** centrally
- **Access volume pricing** (€0.10 per assessment vs. standard student rates)

**Target users:** Language schools, universities, corporate training programs, integration course providers.

### How do school accounts differ from individual accounts?

| Feature | Individual Account | School Account |
|---------|-------------------|----------------|
| **Registration** | Self-register | Created by school admin |
| **Credits** | Buy credit packs | Allocated by school |
| **Dashboard** | Personal results only | School-wide analytics |
| **Session creation** | Create your own | Admin assigns sessions |
| **Pricing** | €4.99-€49.99 per pack | €0.10 per assessment |
| **Billing** | PayPal per purchase | Monthly/quarterly invoicing |

### When will school features be available?

**Current status:** Limited beta testing with select partners  
**Full release:** Planned for **Q3-Q4 2025**

**Interested schools:** Contact us early to join the beta program or get notified at launch: [https://lingali.com/contact](https://lingali.com/contact)

---

## 💰 Pricing & Billing

### What does it cost?

**Base rate:** €0.10 per student assessment

**Volume discounts:**
- 100-500 students/month: €0.09 per assessment
- 500-1000 students/month: €0.08 per assessment
- 1000+ students/month: €0.07 per assessment (enterprise pricing)

**Billing cycles:**
- Monthly: Pay as you go
- Quarterly: 5% discount
- Annual: 10% discount

### How does pricing compare to traditional assessment?

**Traditional cost per class (30 students):**
- Teacher time: €30/hour × 2 hours = €60
- OR: External examiner: €200-300 per batch

**One-CEFR cost:**
- 30 students × €0.10 = **€3.00**
- Instant results + detailed analytics

**ROI:** 95% cost reduction + hours saved on grading and feedback generation.

### What's included in the school package?

- Unlimited session creation for enrolled students
- School admin dashboard
- Student management tools
- Class analytics and reports
- Bulk session assignment
- Template library (reusable exam structures)
- Email support
- Quarterly usage reports for billing

---

## 👨‍🎓 Student Management

### How are school students created?

**Process:**
1. School admin creates student accounts in bulk (CSV upload or manual entry)
2. Students receive an email with login credentials and instructions
3. Students log in and can immediately access assigned sessions
4. No payment required—credits managed by school

### Can school students buy their own credits?

**No.** School accounts are separate from individual accounts. Students use credits allocated by the school.

**Why?** This prevents budget confusion and ensures the school maintains full control over assessment usage.

---

## 📊 School Admin Features

### What can school administrators do?

**Student Management:**
- Create and manage student accounts
- View all student sessions and results
- Track progress across classes
- Export student data

**Session Management:**
- Create sessions for entire classes in bulk
- Assign specific templates (e.g., "A2 Grammar Focus")
- Set optional time limits
- Schedule sessions for specific dates

**Analytics:**
- Class performance metrics
- Student progress tracking
- Usage statistics
- Credit consumption reports
- Identify struggling students (low scores)
- Identify common error patterns across class

**Billing:**
- View usage logs
- Download invoices
- Track credit allocation vs. usage

### Can teachers create their own sessions?

**Yes!** Teachers with admin permissions can:
- Create custom session templates
- Assign sessions to specific students or classes
- View detailed results and feedback for each student
- Generate comparison reports

---

## 📋 Session & Template System

### What are templates?

Templates are reusable session structures that define:
- Which skills to test (Reading, Writing, Grammar, Listening)
- How many questions per skill
- CEFR level (A1, A2, B1)
- Optional time limits

**Example template:** "A2 Mixed Skills Assessment"
- 5 Reading questions
- 3 Writing questions
- 5 Grammar questions
- Total: 13 questions, ~45 minutes

### Can schools customize templates?

**Yes!** Schools can:
- Create custom templates for their curriculum
- Reuse templates across multiple classes
- Share templates between teachers
- Align assessments with course goals

---

## 🔗 Technical Integration

### Is there an API for school systems?

**Yes!** Schools can integrate One-CEFR with their existing:
- Learning Management Systems (LMS)
- Student Information Systems (SIS)
- Grade books

**Integration support:** Contact us for technical onboarding: [https://lingali.com/contact](https://lingali.com/contact)

### What data can schools export?

Schools can export:
- Student session results (CSV, JSON)
- Class analytics reports (PDF)
- Usage logs for billing reconciliation
- Individual student progress reports

**Data privacy:** All exports comply with GDPR and can be anonymized for institutional research.

---

## 📞 Getting Started

### How do we sign up?

**Step 1:** Contact us via [https://lingali.com/contact](https://lingali.com/contact) with:
- School name and location
- Estimated number of students
- Target CEFR levels and languages
- Desired start date

**Step 2:** We'll schedule a demo and discuss your needs

**Step 3:** Onboarding and admin account setup

**Step 4:** Upload students and start assessing!

**Timeline:** Onboarding typically takes 1-2 weeks.

### Is there a free trial for schools?

**Yes!** We offer:
- **Free demo account** with 50 assessment credits
- **1-month pilot program** for up to 30 students
- **Full feature access** during trial

**No commitment required.** Try before you buy.

---

## 📞 Contact Us

**Interested in One-CEFR for Schools?**

📧 **Contact:** [https://lingali.com/contact](https://lingali.com/contact)

Include:
- School/institution name
- Number of students
- Assessment needs
- Timeline

We'll respond within 24-48 hours with a customized proposal.

---

**Thank you for considering One-CEFR for your institution! We're committed to making CEFR assessment accessible, affordable, and scalable for language education. 🎓**
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

export const FAQSchoolsView: React.FC = () => {
  const navigate = useNavigate();
  
  const faqSections = useMemo(() => parseFAQContent(FAQ_CONTENT), []);

  // Set page title
  useEffect(() => {
    document.title = 'FAQ for Schools | One-CEFR';
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
          <span className="text-4xl">🏫</span>
          <h1 className="text-3xl font-bold text-gray-900">Schools FAQ</h1>
          <Badge variant="default" className="ml-2">Coming Q3-Q4 2025</Badge>
        </div>
        <p className="text-gray-600">
          Information for schools and educational institutions
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Click on any question to expand the answer
        </p>
      </div>

      {/* Beta Notice */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-900 mb-1">School Features In Development</p>
            <p className="text-sm text-amber-800">
              The school administration platform is currently in beta testing with select partners. 
              Full release planned for Q3-Q4 2025. Contact us to join the beta program or get early access.
            </p>
          </div>
        </div>
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

      {/* CTA Footer */}
      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Interested in One-CEFR for Your School?
          </h3>
          <p className="text-gray-700 mb-4">
            Join our beta program or get notified when school features launch
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://lingali.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-eu-blue hover:bg-eu-blue/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Contact Sales
            </a>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-block bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};




