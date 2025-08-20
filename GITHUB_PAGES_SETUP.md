# GitHub Pages Setup Guide

Your Next.js project has been successfully configured for GitHub Pages deployment! Here's what was done and how to deploy:

## What Was Configured

1. **Next.js Static Export**: Modified [`next.config.ts`](next.config.ts) to enable static site generation
2. **Removed API Routes**: Deleted the `src/app/api` directory since GitHub Pages only supports static files
3. **GitHub Actions Workflow**: Created [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for automatic deployment

## How to Deploy to GitHub Pages

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

### Step 2: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically run and deploy your site

### Step 3: Access Your Site
Your site will be available at: `https://[your-username].github.io/[repository-name]`

## Important Notes

- **API Routes Removed**: Since GitHub Pages only serves static files, all API routes have been removed
- **Static Export**: The site is now completely static and will work without a server
- **Automatic Deployment**: Every push to the `main` branch will trigger a new deployment
- **Build Output**: The static files are generated in the `out/` directory

## Local Testing

To test the static export locally:
```bash
npm run build
# Then open entity/out/index.html in your browser
```

## Troubleshooting

If the deployment fails:
1. Check the **Actions** tab in your GitHub repository for error logs
2. Ensure your repository name matches the `basePath` configuration
3. Make sure GitHub Pages is enabled in repository settings

The site is now ready for GitHub Pages deployment!