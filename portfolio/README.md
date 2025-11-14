# Ahmed - Portfolio Website

Professional portfolio website showcasing strategic business leadership, market entry expertise, and proven results across MENA, Nordics, and UK markets.

## Features

- **6 Detailed Case Studies** with measurable results
- **Responsive Design** - Mobile-first, works on all devices
- **Fast Loading** - Pure HTML/CSS, no frameworks
- **SEO Optimized** - Proper meta tags and semantic HTML
- **Print-Friendly** - Optimized for PDF export
- **Accessible** - WCAG compliant with keyboard navigation

## Deployment

### Quick Deploy (Recommended)

**Netlify:**
1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag and drop the `portfolio` folder
3. Your site is live!

**Vercel:**
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to portfolio folder: `cd portfolio`
3. Run: `vercel`
4. Follow prompts

**GitHub Pages:**
1. Create new repository
2. Upload `index.html` and `styles.css`
3. Go to Settings → Pages
4. Select main branch
5. Your site will be available at `https://yourusername.github.io/repo-name`

### Local Testing

Simply open `index.html` in any web browser:
```bash
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

Or use a local server:
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server
```

Then visit `http://localhost:8000`

## Customization

### Update Contact Information

In `index.html`, find and replace:
- `your-email@example.com` with your actual email
- `https://linkedin.com/in/your-profile` with your LinkedIn URL

### Update Colors

Primary brand color is set in `styles.css`:
- Search for `#0066cc` (deep blue) to change primary color
- Search for `#1a252f` to change dark text color

### Add Your Photo (Optional)

To add a profile photo to the About section:
1. Add image to portfolio folder (e.g., `photo.jpg`)
2. In `index.html`, add after `<div class="about-content">`:
```html
<img src="photo.jpg" alt="Ahmed" style="max-width: 200px; border-radius: 50%; margin: 0 auto 2rem; display: block;">
```

## File Structure

```
portfolio/
├── index.html      # Main HTML file
├── styles.css      # All styling
└── README.md       # This file
```

## Technologies Used

- HTML5
- CSS3 (Grid, Flexbox)
- Vanilla JavaScript (navigation, smooth scrolling)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Performance

- No external dependencies
- No build process required
- Fast first paint (<1 second)
- Optimized for Core Web Vitals

## SEO

The site includes:
- Semantic HTML5 elements
- Proper meta descriptions
- Keyword optimization
- Mobile-friendly design
- Fast loading times

## License

© 2025 Ahmed. All rights reserved.

---

## Support

For questions or issues with deployment, consult:
- [Netlify Documentation](https://docs.netlify.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

Built with focus on professional presentation, strategic positioning, and measurable results.
