# GitHub Safety Checklist

## ✅ Pre-Commit Verification

### 1. Check .gitignore Protection
Your `.gitignore` already protects:
- ✅ `.env` files
- ✅ `service-account.json` files
- ✅ `node_modules/`, `.venv/`, `.next/`
- ✅ `__pycache__/`, `*.pyc`

### 2. Verify No Secrets Will Be Committed
```bash
# Check what will be committed
git status

# Search for potential secrets in tracked files
git grep -i "api.key\|secret\|password\|token" 
```

## 📝 Safe Commit Process

### Step 1: Add Files
```bash
git add .
```

### Step 2: Review What's Staged
```bash
git status
git diff --cached
```

### Step 3: Commit
```bash
git commit -m "Initial commit: Bacon FPL Dashboard"
```

### Step 4: Push to GitHub
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/fpl_draft_dashboard.git
git branch -M main
git push -u origin main
```

## 🔐 Files That Should NEVER Be Committed
- `.env` - Contains credentials
- `backend/service-account.json` - GCP service account key
- Any `*service-account.json` files

## ⚠️ If You Accidentally Commit Secrets

1. **Immediately rotate credentials** (create new service account key)
2. **Remove from history**:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/service-account.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push**:
   ```bash
   git push origin --force --all
   ```

## ✅ You're Ready!

Your `.gitignore` is properly configured. Just follow the commit process above and you're good to go!
