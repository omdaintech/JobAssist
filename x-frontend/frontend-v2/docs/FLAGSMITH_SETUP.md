# 🚀 Flagsmith Feature Flags - Complete Guide

**Status**: ✅ Fully integrated and working in dev & prod

## 🎯 Quick Start

**It just works!** No configuration needed.

- **Dev**: Uses `YOUR_FLAGSMITH_DEV_ID`
- **Prod**: Uses `YOUR_FLAGSMITH_PROD_ID`
- Automatically switches based on build mode

## 📖 Usage

```tsx
import { useFeatureFlag } from '@/hooks/useFlags';

function MyComponent() {
  const isEnabled = useFeatureFlag('nopayment');
  return isEnabled ? <BetaFlow /> : <NormalFlow />;
}
```

## ✅ Implemented Features

### `nopayment` Flag
- **Purpose**: Beta payment flow
- **Location**: `CheckoutView.tsx`  
- **Enabled**: Shows email form to configured email
- **Disabled**: Shows PayPal button

## 🚀 Production Ready

Yes! The config automatically uses the correct environment:
- `npm run dev` → dev environment
- `npm run build` → production environment

Toggle flags in [Flagsmith Dashboard](https://app.flagsmith.com/) per environment.

## 📝 Adding New Flags

1. **Add default** in `src/config/flagsmith.ts`:
```ts
defaultFlags: {
  nopayment: false,
  yourFlag: false, // ← Add here
}
```

2. **Create in Flagsmith**: Go to dashboard, create feature in both dev & prod

3. **Use in code**:
```tsx
const enabled = useFeatureFlag('yourFlag');
```

## 🔗 Resources

- [Flagsmith Dashboard](https://app.flagsmith.com/)
- [React SDK Docs](https://docs.flagsmith.com/clients/react)

## 📦 Installation

The Flagsmith package has been added to `package.json`. Install dependencies:

```bash
cd x-frontend/frontend-v2
npm install
```

Or with Docker:
```bash
# Rebuild the frontend container
docker-compose -f docker-compose.dev.yml build frontend-v2
```

## 🔧 Configuration

### 1. Get Flagsmith Environment ID

1. Sign up at [Flagsmith](https://app.flagsmith.com/) (free tier available)
2. Create a new project (e.g., "Lingali")
3. Copy your **Environment ID** from the dashboard

### 2. Configure Environment Variables

Update `.env.local`:

```bash
# Flagsmith Configuration
VITE_FLAGSMITH_ENVIRONMENT_ID=YOUR_ENVIRONMENT_ID_HERE
# Optional: Use self-hosted Flagsmith
# VITE_FLAGSMITH_API_URL=https://your-flagsmith-instance.com/api/v1/
```

### 3. Create Feature Flags in Flagsmith Dashboard

Create these flags in your Flagsmith project:
- `hearingExams` - Boolean flag for hearing exam feature
- Add more flags as needed

## 📘 Usage

### Basic Feature Flag Check

```tsx
import { useFeatureFlag } from '@/hooks/useFlags';

export default function MyComponent() {
  const hearingExamsEnabled = useFeatureFlag('hearingExams');
  
  return (
    <div>
      {hearingExamsEnabled && (
        <button>Start Hearing Exam</button>
      )}
    </div>
  );
}
```

### Get Feature Flag Value

For flags with values (not just enabled/disabled):

```tsx
import { useFlagValue } from '@/hooks/useFlags';

export default function ExamPage() {
  const maxAttempts = useFlagValue('maxExamAttempts', 3); // default: 3
  const theme = useFlagValue('uiTheme', 'light');
  
  return (
    <div>
      <p>You have {maxAttempts} attempts remaining</p>
    </div>
  );
}
```

### Use Multiple Flags

```tsx
import { useFlags } from 'flagsmith/react';

export default function Dashboard() {
  const flags = useFlags(['hearingExams', 'newDashboard', 'betaFeature']);
  
  const hearingExamsEnabled = flags.hearingExams?.enabled;
  const dashboardVersion = flags.newDashboard?.value;
  
  return (
    <div>
      {hearingExamsEnabled && <HearingExamCard />}
      {dashboardVersion === 'v2' && <NewDashboard />}
    </div>
  );
}
```

### Typed Hook for Common Flags

```tsx
import { useAppFeatureFlags } from '@/hooks/useFlags';

export default function App() {
  const { hearingExams } = useAppFeatureFlags();
  
  return (
    <div>
      {hearingExams && <HearingExamSection />}
    </div>
  );
}
```

### Check Flagsmith Status

```tsx
import { useFlagsmithContext } from '@/contexts/FlagsmithContext';

export default function StatusIndicator() {
  const { isReady, error } = useFlagsmithContext();
  
  if (error) {
    return <div>Feature flags unavailable: {error.message}</div>;
  }
  
  if (!isReady) {
    return <div>Loading feature flags...</div>;
  }
  
  return <div>✅ Feature flags loaded</div>;
}
```

## 🏗️ Architecture

### Files Created

```
x-frontend/frontend-v2/
├── src/
│   ├── config/
│   │   └── flagsmith.ts          # Flagsmith configuration
│   ├── contexts/
│   │   └── FlagsmithContext.tsx  # Provider wrapper
│   ├── hooks/
│   │   └── useFlags.ts           # Custom hooks
│   └── main.tsx                  # FlagsmithProvider integrated
└── .env.local                    # Environment variables
```

### Provider Hierarchy

```tsx
<StrictMode>
  <FlagsmithProvider>          {/* ✅ Flagsmith - Outermost */}
    <AuthProvider>             {/* Auth context */}
      <FirebaseAuthProvider>   {/* Firebase auth */}
        <App />
      </FirebaseAuthProvider>
    </AuthProvider>
  </FlagsmithProvider>
</StrictMode>
```

## 🎯 Features

### ✅ Graceful Fallbacks
- Works without Flagsmith environment ID (uses defaults)
- Fallback to default values on error
- No app crashes if Flagsmith is down

### ✅ Performance Optimized
- Client-side evaluation enabled
- Flag caching enabled
- Only re-renders when specified flags change

### ✅ TypeScript Support
- Fully typed hooks
- Type-safe flag access
- Autocomplete support

## 🧪 Testing

### Local Development Without Flagsmith

The app works without Flagsmith configuration. Default values are used from `src/config/flagsmith.ts`:

```typescript
defaultFlags: {
  hearingExams: true,
  // Add more defaults
}
```

### Testing with Flagsmith

1. Set `VITE_FLAGSMITH_ENVIRONMENT_ID` in `.env.local`
2. Create flags in Flagsmith dashboard
3. Run the app: `npm run dev`
4. Toggle flags in Flagsmith dashboard to see real-time updates

## 🚀 Deployment

### Docker

The `package.json` has been updated. Just rebuild:

```bash
docker-compose -f docker-compose.prod.yml build frontend-v2
```

### Environment Variables

Make sure to set in production:
```bash
VITE_FLAGSMITH_ENVIRONMENT_ID=your_production_environment_id
```

## 📊 Flagsmith CLI (Optional)

Install globally for command-line access:

```bash
npm i flagsmith-cli -g
export FLAGSMITH_ENVIRONMENT=YOUR_ENVIRONMENT_ID
flagsmith get
```

## 🔄 Migration from Old System

Old way (deprecated):
```tsx
import appConfig from '@/config/app';
const enabled = appConfig.features.hearingExams;
```

New way:
```tsx
import { useFeatureFlag } from '@/hooks/useFlags';
const enabled = useFeatureFlag('hearingExams');
```

## 📝 Best Practices

1. **Always provide defaults** - Add default values in `flagsmith.ts`
2. **Use typed hooks** - Extend `useAppFeatureFlags` for common flags
3. **Namespace flags** - Use prefixes like `feature_`, `ui_`, `experiment_`
4. **Document flags** - Add comments for each flag's purpose
5. **Test fallbacks** - Ensure app works without Flagsmith

## 🔗 Resources

- [Flagsmith Docs](https://docs.flagsmith.com/)
- [React SDK Guide](https://docs.flagsmith.com/clients/react)
- [Flagsmith Dashboard](https://app.flagsmith.com/)

## 🐛 Troubleshooting

### Flags not loading?
1. Check `VITE_FLAGSMITH_ENVIRONMENT_ID` is set
2. Verify environment ID is correct in Flagsmith dashboard
3. Check browser console for errors

### App crashes without Flagsmith?
- Should not happen! Fallbacks are implemented
- Check `defaultFlags` in `flagsmith.ts`

### Flags not updating in real-time?
- Flagsmith uses polling (default: every 60s)
- Or refresh the page to get latest flags
