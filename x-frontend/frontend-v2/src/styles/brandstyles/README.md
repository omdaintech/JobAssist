# Brand Theme Management System

This system provides dynamic brand styling based on the user's `school_id` to support white-label customization.

## Architecture

### Directory Structure
```
src/
├── styles/
│   └── brandstyles/
│       ├── default.css          # Default brand theme (One-CEFR)
│       ├── brand-overrides.css  # Common CSS overrides for all brands
│       ├── company1.css         # Example company theme
│       └── {school_id}.css      # School-specific themes
└── utils/
    └── brand-manager.ts         # Brand management utility

public/
└── src/
    └── styles/
        └── brandstyles/         # Runtime-accessible brand CSS files
            ├── default.css
            ├── brand-overrides.css
            ├── company1.css
            └── {school_id}.css
```

### Components
1. **BrandManager** (`src/utils/brand-manager.ts`)
   - Handles dynamic CSS loading based on school_id
   - Loads brand-specific CSS + common overrides
   - Manages fallback to default theme
   - Provides cleanup functionality

2. **Brand Overrides** (`brand-overrides.css`)
   - Common CSS overrides for all hardcoded colors
   - Targets both `eu-blue` and `blue-*` Tailwind classes
   - Uses CSS variables so works with any brand theme
   - Centralized maintenance - no duplication

3. **useBrandConfig Hook**
   - React hook to access current brand configuration
   - Automatically updates when brand changes

4. **Integration with AuthContext**
   - Loads brand theme on successful authentication
   - Clears brand styles on logout

## Brand Configuration

Each brand CSS file defines these key variables:

### Logo & Branding
- `--brand-logo-text`: Company/brand name text
- `--brand-logo-url`: Optional logo image URL
- `--brand-logo-avatar-text`: Fallback avatar text (1-2 characters)

### Color Theme
- `--brand-primary`: Primary brand color (HSL format)
- `--brand-primary-foreground`: Text color on primary background
- `--brand-primary-hover`: Hover state for primary color

### Typography
- `--brand-font-family`: Brand-specific font stack
- `--brand-font-weight-normal`: Normal text weight
- `--brand-font-weight-medium`: Medium text weight
- `--brand-font-weight-bold`: Bold text weight

## Usage Flow

1. **App Initialization**: Default brand theme + common overrides are loaded
2. **User Login**: API returns user info with `school_id`
3. **Brand Loading**: BrandManager loads `{school_id}.css` + `brand-overrides.css`
4. **Fallback**: If school-specific CSS not found, default theme + overrides remain
5. **Component Updates**: Components using `useBrandConfig` automatically reflect changes
6. **Logout**: Brand styles are cleared, reverting to default

## Color Override System

The `brand-overrides.css` file automatically converts hardcoded colors to brand colors:

### Supported Color Classes:
- **EU Blue classes**: `bg-eu-blue`, `text-eu-blue`, `border-eu-blue`, etc.
- **Tailwind Blue classes**: `bg-blue-600`, `bg-blue-500`, `text-blue-600`, etc.
- **Hover states**: `hover:bg-blue-700`, `hover:bg-eu-blue-700`, etc.
- **Focus states**: `focus:ring-blue-500`, `focus:border-blue-500`, etc.
- **Opacity variants**: `bg-blue-50`, `bg-eu-blue/90`, etc.

This means buttons like `<button class="bg-blue-600 hover:bg-blue-700">` will automatically use brand colors!

## API Integration

The system expects the user status API to return:
```json
{
  "user_info": {
    "school_id": "886eb0635e5a4825bc3323d0",
    "school_name": "Direct Students",
    // ... other user fields
  }
}
```

## Adding New Brand Themes

1. Create a new CSS file: `src/styles/brandstyles/{school_id}.css`
2. Define only the brand variables (see template below)
3. Copy to public directory: `public/src/styles/brandstyles/{school_id}.css`
4. The common overrides will automatically apply to your brand colors

## Brand CSS Template

```css
/**
 * Brand Styles - Company Name (school_id)
 */

:root {
  /* Brand Logo */
  --brand-logo-text: "Your Company";
  --brand-logo-url: "/logos/your-logo.png"; /* Optional */
  --brand-logo-avatar-text: "YC";
  
  /* Brand Colors - Only define these 3 colors */
  --brand-primary: 0 84% 45%; /* Your primary color in HSL */
  --brand-primary-foreground: 0 0% 100%; /* Text color on primary */
  --brand-primary-hover: 0 84% 40%; /* Darker shade for hover */
  
  /* Brand Typography */
  --brand-font-family: 'Your-Font', sans-serif;
  --brand-font-weight-normal: 400;
  --brand-font-weight-medium: 500;
  --brand-font-weight-bold: 700;
  
  /* System overrides */
  --primary: var(--brand-primary);
  --primary-foreground: var(--brand-primary-foreground);
}

/* Dark mode (optional) */
.dark {
  --brand-primary: 0 84% 55%; /* Lighter for dark mode */
  --primary: var(--brand-primary);
}

/* Company-specific customizations (optional) */
.brand-header {
  font-weight: var(--brand-font-weight-medium);
}
```

## CSS Classes

The system provides utility classes for consistent brand styling:

- `.brand-text`: Applies brand font family
- `.brand-primary-bg`: Brand primary background with proper text color
- `.brand-logo-text::before`: Dynamically displays brand logo text

Legacy EU Blue classes are maintained for backward compatibility:
- `.bg-eu-blue`, `.text-eu-blue`, `.border-eu-blue`

## Benefits

- **Clean Separation**: Brand-specific styles are isolated from core application CSS
- **Minimal Configuration**: Only logo, colors, and fonts need customization
- **Automatic Fallback**: Graceful degradation to default theme
- **Runtime Loading**: No build-time configuration required
- **Easy Maintenance**: Each brand is a single CSS file
