# How to Push CloudBrain to GitHub

Choose ONE of the methods below:

---

## Method 1: Via GitHub Web UI (Easiest - No Git Setup Needed)

### Step 1: Create Repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: **`cloudbrain`**
3. Owner: **`truehannan`** (your username)
4. Description: "AI agent on Cloudflare Workers, controlled via Telegram"
5. Visibility: **Public** ✓
6. **DO NOT** initialize with README (we have one)
7. Click **"Create repository"**

### Step 2: Upload Files via GitHub Web Interface

After creating the repo, you'll see instructions. Instead, let's upload the files:

1. In your new repo, click **"Add file"** → **"Upload files"**
2. Drag and drop all CloudBrain files to the upload area (or click to select)
3. Commit message: `docs: add comprehensive setup guide, license, and contributing guidelines`
4. Click **"Commit changes"**

**Files to upload:**
- All `.ts` files from `src/` folder
- `package.json`
- `tsconfig.json`
- `wrangler.toml`
- `schema.sql`
- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `SETUP.md`
- `.gitignore`
- `.github/workflows/deploy.yml`

### Done!

Your repo is now public on GitHub at: `https://github.com/truehannan/cloudbrain`

---

## Method 2: Via Git Command Line (More Control)

### Prerequisites

You need either:
- **GitHub Personal Access Token** (recommended), OR
- **GitHub SSH key** set up

### Step 2.1: Create Repository on GitHub Web

Follow **Method 1, Step 1** above (create empty repo).

### Step 2.2: Add Remote and Push

```bash
cd C:\Users\Microsoft\cloudbrain

# Add GitHub as remote origin
git remote add origin https://github.com/truehannan/cloudbrain.git

# Push to GitHub
git push -u origin main
```

When prompted for credentials:
- **Username**: `truehannan`
- **Password**: Use GitHub **Personal Access Token** (not your password)

### Get GitHub Personal Access Token

1. Go to GitHub Settings → [Developer settings](https://github.com/settings/tokens)
2. Click **"Tokens (classic)"** → **"Generate new token"** → **"Generate new token (classic)"**
3. Token name: `cloudbrain-push`
4. Expiration: **90 days** (or your preference)
5. Scopes: Select **`repo`** (all sub-options)
6. Click **"Generate token"**
7. **Copy the token** (you won't see it again!)

Use this token as your password when git prompts.

---

## Method 3: Via GitHub CLI (Fastest - If Installed)

### Prerequisites

- GitHub CLI installed (`gh`)
- Logged in to GitHub (`gh auth login`)

### Steps

```bash
cd C:\Users\Microsoft\cloudbrain

# Re-authenticate (if token is invalid)
gh auth logout -h github.com -u truehannan
gh auth login -h github.com

# Create public repo and push
gh repo create cloudbrain --public --source=. --push
```

---

## Verify It Worked

After pushing (any method), verify:

```bash
# Check remote
git remote -v

# Output should show:
# origin  https://github.com/truehannan/cloudbrain.git (fetch)
# origin  https://github.com/truehannan/cloudbrain.git (push)

# Check branch status
git status

# Output should show:
# On branch main
# Your branch is up to date with 'origin/main'.
```

Then visit: **https://github.com/truehannan/cloudbrain**

Should show all files including README.md with full documentation.

---

## After Push

### Enable GitHub Actions

1. Go to your repo → **Settings** → **Actions** → **General**
2. Allow GitHub Actions: **Enable**
3. Workflow permissions: **Read and write permissions** ✓

This enables auto-deployment on push.

### Set Up Deployment Secrets (For CI/CD)

1. Go to repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**

Add these secrets:
- **Name**: `CLOUDFLARE_API_TOKEN` | **Value**: Your API token
- **Name**: `CLOUDFLARE_ACCOUNT_ID` | **Value**: Your account ID

This allows the GitHub Actions workflow to auto-deploy on push.

---

## Final Setup Checklist

- [x] Code pushed to GitHub
- [ ] README.md visible on repo home page
- [ ] LICENSE file visible
- [ ] SETUP.md has clear instructions
- [ ] GitHub Actions enabled (optional, for auto-deploy)
- [ ] Secrets configured (optional, for auto-deploy)

---

## Troubleshooting

### "Repository not found"

This usually means:
- Repo doesn't exist yet (go create it at github.com/new)
- Typo in URL (check `truehannan/cloudbrain`)
- Not authenticated properly (check credentials/token)

### "Already exists"

Repo already created. Just push:

```bash
git push -u origin main
```

### "Rejected... non-fast-forward"

Remote has commits you don't have locally:

```bash
git pull origin main
git push origin main
```

### "Everything up-to-date"

All code already pushed. Verify at: https://github.com/truehannan/cloudbrain

---

## Next Steps

1. Copy the README setup guide and share with others
2. Stars ⭐ on GitHub help discoverability
3. Keep following the setup guide in README for actual deployment

---

**Your CloudBrain is now public on GitHub!** 🚀
