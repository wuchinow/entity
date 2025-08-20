# Final Deployment Steps

Your code has been successfully pushed to GitHub! Now follow these steps to enable your live Entity v1.0 application:

## Step 1: Enable GitHub Pages
1. Go to your repository: https://github.com/wuchinow/entity
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch
6. Choose **/ (root)** folder
7. Click **Save**

## Step 2: Create GitHub Actions Workflow (Manual)
Since we couldn't push the workflow file due to permissions, you need to create it manually:

1. In your GitHub repository, click **Actions** tab
2. Click **New workflow**
3. Click **set up a workflow yourself**
4. Replace the default content with:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      env:
        NODE_ENV: production
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./out
```

5. Name the file `deploy.yml`
6. Click **Commit changes**

## Step 3: Update Pages Source
After the workflow runs:
1. Go back to **Settings** → **Pages**
2. Change source to **GitHub Actions**
3. The workflow will automatically deploy your site

## Expected Result
Your site at https://wuchinow.github.io/entity/ will show the Entity v1.0 application with:
- Dark themed interface
- "Entity" branding
- Interactive navigation
- Gallery and admin sections

The deployment should complete within 5-10 minutes after setting up the workflow.