# Xpand Learning - Deployment Guide 🚀

This guide will help you deploy the Xpand Learning platform to various hosting providers.

## 📋 Prerequisites

Before deploying, make sure you have:
- ✅ A Supabase account and project set up
- ✅ Environment variables configured
- ✅ All dependencies installed (`npm install`)
- ✅ Tested locally (`npm run dev`)

---

## 🌐 Deployment Options

### Option 1: Netlify (Recommended) ⭐

**Why Netlify?**
- Free tier with generous limits
- Automatic HTTPS
- Global CDN
- Instant rollbacks
- Environment variable management
- Deploy previews for PRs

#### **Step-by-Step Netlify Deployment:**

1. **Push to GitHub** (Already done!)
   ```bash
   git push origin claude/xpand-learning-website-GF1XC
   ```

2. **Create Netlify Account**
   - Go to https://netlify.com
   - Sign up with GitHub

3. **Import Your Repository**
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and authorize
   - Select your repository: `omdaintech/JobAssist`
   - Select branch: `claude/xpand-learning-website-GF1XC`

4. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

   *(These are already configured in `netlify.toml`)*

5. **Add Environment Variables**
   Go to Site settings → Environment variables and add:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
   VITE_APP_URL=https://your-site.netlify.app
   ```

6. **Deploy!**
   - Click "Deploy site"
   - Wait 2-3 minutes
   - Your site will be live at `https://your-site-name.netlify.app`

7. **Custom Domain (Optional)**
   - Go to Domain settings
   - Add your custom domain (e.g., `xpandlearning.com`)
   - Follow DNS configuration instructions

---

### Option 2: Vercel

**Why Vercel?**
- Created by Next.js team (but works with Vite!)
- Excellent performance
- Free tier
- Global edge network
- Automatic HTTPS

#### **Step-by-Step Vercel Deployment:**

1. **Install Vercel CLI** (Optional)
   ```bash
   npm install -g vercel
   ```

2. **Deploy via Web**
   - Go to https://vercel.com
   - Sign up with GitHub
   - Click "Add New Project"
   - Import `omdaintech/JobAssist` repository
   - Select branch: `claude/xpand-learning-website-GF1XC`

3. **Configure Project**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**
   Add the same environment variables as Netlify:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_STRIPE_PUBLISHABLE_KEY
   VITE_APP_URL
   ```

5. **Deploy!**
   - Click "Deploy"
   - Your site will be live at `https://your-project.vercel.app`

---

### Option 3: GitHub Pages

**Limitations:**
- No environment variables at build time (need to hardcode or use a different approach)
- Static hosting only
- Custom domain requires repo settings

#### **Step-by-Step GitHub Pages:**

1. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json**
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     },
     "homepage": "https://omdaintech.github.io/JobAssist"
   }
   ```

3. **Update vite.config.ts**
   ```typescript
   export default defineConfig({
     base: '/JobAssist/',
     // ... rest of config
   })
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` → `/ (root)`

**Note:** For Xpand Learning, I recommend Netlify or Vercel instead due to environment variable support.

---

### Option 4: Other Hosting Providers

The built website works on any static hosting provider:

#### **Cloudflare Pages**
1. Connect GitHub repository
2. Build command: `npm run build`
3. Build output: `dist`
4. Add environment variables

#### **Render**
1. Create new Static Site
2. Connect repository
3. Build command: `npm run build`
4. Publish directory: `dist`

#### **AWS Amplify**
1. Connect repository
2. Build settings: Auto-detected (Vite)
3. Add environment variables

#### **Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## 🔧 Build & Test Locally

Before deploying, test the production build locally:

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

This will:
1. Build optimized production files to `dist/` folder
2. Minify JavaScript and CSS
3. Optimize images
4. Generate sourcemaps
5. Start a local server to preview at `http://localhost:4173`

---

## 📁 Build Output Structure

After running `npm run build`, you'll get:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Main app bundle
│   ├── index-[hash].css     # Styles
│   └── vendor-[hash].js     # Dependencies
└── [other static assets]
```

This `dist/` folder is what gets deployed to hosting platforms.

---

## 🔐 Environment Variables Checklist

Make sure these are set in your hosting platform:

### Required:
- ✅ `VITE_SUPABASE_URL` - Your Supabase project URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional (for full functionality):
- `VITE_STRIPE_PUBLISHABLE_KEY` - For payments
- `VITE_PAYMOB_API_KEY` - For Egypt payments
- `VITE_PAYMOB_INTEGRATION_ID` - For Egypt payments
- `VITE_APP_URL` - Your production URL
- `VITE_GA_MEASUREMENT_ID` - Google Analytics
- `VITE_SENTRY_DSN` - Error tracking

---

## 🗄️ Supabase Setup (Required!)

Your website won't work without Supabase. Here's the quick setup:

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Wait for database provisioning (~2 minutes)

### 2. Get Your Credentials
- Go to Project Settings → API
- Copy `Project URL` → This is `VITE_SUPABASE_URL`
- Copy `anon public` key → This is `VITE_SUPABASE_ANON_KEY`

### 3. Run Database Migrations
- Go to SQL Editor in Supabase dashboard
- Copy SQL from `XPAND_LEARNING_ARCHITECTURE.md`
- Run each migration (create tables, RLS policies, etc.)

### 4. Enable Authentication
- Go to Authentication → Providers
- Enable Email provider
- Configure email templates (optional)
- Enable OAuth providers if needed (Google, GitHub, etc.)

### 5. Set Up Storage (for course images/videos)
- Go to Storage
- Create bucket: `course-media` (public)
- Create bucket: `user-avatars` (public)
- Create bucket: `certificates` (private)

---

## 🧪 Deployment Checklist

Before going live:

### Pre-Deployment:
- [ ] All environment variables configured
- [ ] Supabase database tables created
- [ ] Supabase RLS policies enabled
- [ ] Test production build locally (`npm run build && npm run preview`)
- [ ] All links working
- [ ] Mobile responsive checked
- [ ] All 3 languages working (EN, AR, SE)
- [ ] Shopping cart persisting
- [ ] No console errors

### Post-Deployment:
- [ ] Website loads correctly
- [ ] HTTPS working
- [ ] Custom domain configured (if applicable)
- [ ] Environment variables working (check if Supabase connects)
- [ ] All routes working (test /courses, /about, etc.)
- [ ] Language switcher working
- [ ] Mobile menu working
- [ ] Cart functionality working

---

## 🔄 Continuous Deployment

Both Netlify and Vercel offer automatic deployments:

1. **Push to GitHub** → Automatic deployment
2. **Pull Request** → Preview deployment (test before merging)
3. **Merge to main** → Production deployment

Set this up by connecting your Git repository in the hosting dashboard.

---

## 🚨 Troubleshooting

### Build Fails
**Error:** `Module not found`
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working
- Make sure they start with `VITE_` prefix
- Rebuild after adding new variables
- Check they're set in hosting dashboard (not `.env.local`)

### Blank Page After Deployment
- Check browser console for errors
- Verify Supabase credentials are correct
- Check if base URL is configured correctly (for subdirectory hosting)

### Routes Not Working (404 on refresh)
- Netlify/Vercel: Should work automatically with provided configs
- Other hosts: Make sure SPA redirect rules are configured

### Supabase Connection Fails
- Verify environment variables are set
- Check Supabase project is active
- Verify API keys are correct
- Check network tab for CORS errors

---

## 📊 Performance Optimization

### Already Included:
- ✅ Code splitting
- ✅ Lazy loading
- ✅ CSS minification
- ✅ Image optimization ready
- ✅ CDN caching headers

### Recommended Next Steps:
1. **Image Optimization**: Use Cloudinary or Supabase Storage with transformations
2. **Analytics**: Add Google Analytics or Plausible
3. **Error Tracking**: Add Sentry
4. **Performance Monitoring**: Use Vercel Analytics or Lighthouse CI

---

## 🌍 Multi-Region Considerations

### For Global Performance:
- Use Netlify or Vercel (both have global CDN)
- Supabase offers multi-region databases
- Consider Cloudflare for additional caching

### Regional Deployments:
- **Europe** (Sweden): Deploy to EU region in Vercel/Netlify
- **Middle East** (Egypt): Use Cloudflare for lowest latency
- **Multi-Region**: Deploy multiple instances with geo-routing

---

## 🔗 Useful Links

- **Netlify Docs**: https://docs.netlify.com
- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/guide/build.html
- **Supabase Docs**: https://supabase.com/docs

---

## 📞 Need Help?

If you encounter issues:
1. Check build logs in your hosting dashboard
2. Review browser console for errors
3. Verify all environment variables
4. Test locally with `npm run build && npm run preview`
5. Check Supabase connection

---

## 🎉 Quick Start - Deploy in 5 Minutes

**Fastest way to get online:**

1. **Netlify Drop** (No GitHub needed)
   - Run `npm run build` locally
   - Go to https://app.netlify.com/drop
   - Drag & drop the `dist/` folder
   - Done! (But no env vars, so limited functionality)

2. **Netlify with GitHub** (Recommended)
   - Push code to GitHub ✅ (Already done!)
   - Import to Netlify
   - Add Supabase env vars
   - Deploy!

**Estimated Time**: 5-10 minutes for full deployment with Netlify + Supabase

---

Your Xpand Learning platform is ready to go live! 🚀
