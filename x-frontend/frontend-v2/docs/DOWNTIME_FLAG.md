# 🚧 Downtime Feature Flag

## Overview

The `downtime` feature flag allows you to instantly enable/disable a maintenance page across your entire application **without deploying new code**. Simply toggle the flag in Flagsmith dashboard.

## How It Works

- **Flag OFF (default)**: Normal app operation
- **Flag ON**: Shows maintenance page to all users, app auto-refreshes every 30 seconds

## Usage

### 1. Enable Downtime Mode

1. Go to [Flagsmith Dashboard](https://app.flagsmith.com/)
2. Select your environment:
   - **Production**: `YOUR_FLAGSMITH_PROD_ID`
   - **Development**: `YOUR_FLAGSMITH_DEV_ID`
3. Find the `downtime` flag
4. Toggle it **ON**
5. Changes apply instantly (no deployment needed!)

### 2. Disable Downtime Mode

1. Go back to Flagsmith dashboard
2. Toggle the `downtime` flag **OFF**
3. Users will automatically see the app again on next refresh

## Features

✅ **Instant activation** - No code deployment needed  
✅ **Auto-refresh** - Users see the app again within 30 seconds after you disable the flag  
✅ **Beautiful UI** - Professional maintenance page with animations  
✅ **Per-environment** - Different settings for dev/prod  
✅ **No data loss** - User sessions remain active  

## Technical Details

### Files Modified

- `src/config/flagsmith.ts` - Added `downtime` flag default
- `src/components/shared/DowntimeView.tsx` - Maintenance page component
- `src/App.tsx` - Flag check at app entry point
- `src/hooks/useFlags.ts` - Added to typed flags

### Default Value

```typescript
defaultFlags: {
  downtime: false, // App runs normally by default
}
```

### Implementation

```typescript
function App() {
  const isDowntime = useFeatureFlag('downtime');

  if (isDowntime) {
    return <DowntimeView />;
  }

  return <NormalApp />;
}
```

## When to Use

- **Scheduled maintenance** - Database migrations, server updates
- **Emergency fixes** - Critical bugs requiring immediate attention
- **Major deployments** - Multi-step deployments that need coordination
- **Infrastructure changes** - DNS changes, CDN updates, etc.

## Best Practices

1. **Announce in advance** - Inform users via email/social media
2. **Off-peak hours** - Enable during low-traffic periods
3. **Quick toggles** - Can enable/disable multiple times if needed
4. **Test first** - Try in dev environment before production

## Comparison with Old Scripts

| Feature | Old Scripts | New Flag System |
|---------|------------|-----------------|
| Works in prod | ❌ No (Docker issue) | ✅ Yes |
| Deployment needed | ❌ Yes | ✅ No |
| Instant toggle | ❌ No | ✅ Yes |
| Per-environment | ❌ No | ✅ Yes |
| Remote control | ❌ No | ✅ Yes |

## Support

For issues or questions:
- Check [Flagsmith Dashboard](https://app.flagsmith.com/)
- Review [Flagsmith Setup Guide](./FLAGSMITH_SETUP.md)
- Contact dev team

---

**Pro Tip**: Bookmark your Flagsmith dashboard for quick access during emergencies! 🚀
