# Template Loading Flow - Visual Diagram

## Before Fix ❌

```
┌─────────────────────────────────────────────────────────────┐
│ User Opens Practice Modal                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Templates Load Once (User's Current Level: B1)              │
│ Templates: [Reading Practice B1, Writing Practice B1, ...]  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User Changes Level to A1                                     │
│ ❌ NO RELOAD - Still showing B1 templates!                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User Clicks "Create Practice"                                │
│ template_id: "reading_only"  ❌ HARDCODED STRING            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: Error - Invalid template_id                         │
└─────────────────────────────────────────────────────────────┘
```

## After Fix ✅

```
┌─────────────────────────────────────────────────────────────┐
│ User Opens Practice Modal                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Templates Load for Current Level: B1                        │
│ Templates: [                                                 │
│   {template_id: "abc-123", name: "Reading B1", ...},       │
│   {template_id: "def-456", name: "Writing B1", ...}        │
│ ]                                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User Changes Level to A1                                     │
│ ✅ onChange Handler Triggered                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ onLevelChange("A1") Called                                   │
│ Loading Indicator Shows: "Loading templates for A1..."      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ API Call: GET /api/sessions/templates?level=A1              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Templates Updated for A1                                     │
│ Templates: [                                                 │
│   {template_id: "xyz-789", name: "Reading A1", ...},       │
│   {template_id: "mno-012", name: "Writing A1", ...}        │
│ ]                                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User Selects "Reading Practice"                              │
│ findTemplateForActivity("reading") → "xyz-789"              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User Clicks "Create Practice"                                │
│ template_id: "xyz-789"  ✅ REAL UUID FROM A1 TEMPLATE       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/sessions                                           │
│ {                                                            │
│   "language_id": "687b9e32...",                             │
│   "exam_name": "Practice 14 Oct 25",                        │
│   "level": "A1",                                            │
│   "template_id": "xyz-789",  ✅ CORRECT                     │
│   "activity_type": "reading",                               │
│   "session_type": "practice"                                │
│ }                                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: ✅ Session Created Successfully                     │
│ Returns session with correct template and questions         │
└─────────────────────────────────────────────────────────────┘
```

## Component Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        PracticeView                          │
│                                                              │
│  State:                                                      │
│  - practiceData.practiceTemplates: ExamTemplate[]           │
│                                                              │
│  Methods:                                                    │
│  - handleLevelChange(level: string)                         │
│    └─> practiceData.loadPracticeData(level, schoolId)      │
│                                                              │
│  - handleCreatePractice(formData)                           │
│    └─> api.sessions.create({...formData})                  │
│        ✅ Uses formData.template_id (not hardcoded)         │
└────────────────────┬─────────────────────────────────────────┘
                     │ Props passed down
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   CreatePracticeModal                        │
│                                                              │
│  Props:                                                      │
│  - practiceTemplates: ExamTemplate[]                        │
│  - onLevelChange: (level: string) => Promise<void>          │
│  - onCreate: (formData: SessionFormData) => Promise<void>   │
│                                                              │
│  State:                                                      │
│  - selectedLevel: string                                    │
│  - isLoadingTemplates: boolean                              │
│                                                              │
│  Methods:                                                    │
│  - findTemplateForActivity(activityType: string)            │
│    └─> Returns template UUID for activity                   │
│                                                              │
│  - handleLevelChange(e)                                     │
│    └─> Calls props.onLevelChange(newLevel)                 │
│                                                              │
│  - handleSubmit(e)                                          │
│    └─> Gets template_id via findTemplateForActivity()       │
│    └─> Calls props.onCreate({...formData, template_id})    │
└──────────────────────────────────────────────────────────────┘
```

## Template Matching Logic

```
practiceTemplates = [
  {
    template_id: "abc-123",
    template_name: "Reading Practice A1",
    breakdown: { reading: 10, writing: 0, grammar: 0 }
  },
  {
    template_id: "def-456", 
    template_name: "Writing Practice A1",
    breakdown: { reading: 0, writing: 10, grammar: 0 }
  },
  {
    template_id: "ghi-789",
    template_name: "Grammar Practice A1",
    breakdown: { reading: 0, writing: 0, grammar: 10 }
  }
]

User selects: activity_type = "reading"

findTemplateForActivity("reading"):
  1. Loop through practiceTemplates
  2. Check if template.breakdown.reading > 0
  3. Found: template_id = "abc-123" ✅
  4. Return "abc-123"

API Request:
  {
    "template_id": "abc-123",  ← Actual UUID!
    "activity_type": "reading"
  }
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│ usePracticeData Hook                                         │
│                                                              │
│ State:                                                       │
│  - practiceTemplates: ExamTemplate[] = []                   │
│  - sessions: PracticeSession[] = []                         │
│  - isLoading: boolean = false                               │
│                                                              │
│ Methods:                                                     │
│  loadPracticeData(level, schoolId)                          │
│    1. setIsLoading(true)                                    │
│    2. API call: GET /api/sessions/templates?level={level}   │
│    3. Parse response and setPracticeTemplates(...)          │
│    4. API call: GET /api/sessions?session_type=practice     │
│    5. Parse response and setSessions(...)                   │
│    6. setIsLoading(false)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

```
User Flow with Missing Template:

User selects: Level=A1, Activity=Reading
  ↓
findTemplateForActivity("reading")
  ↓
No template found with breakdown.reading > 0
  ↓
Returns null
  ↓
handleSubmit() checks if templateId is null
  ↓
Shows Alert:
"No template found for reading practice at level A1.
 Please try a different level or activity."
  ↓
Form submission cancelled ✅
```
