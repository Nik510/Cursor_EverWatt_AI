# Simple Instructions to Upload Code to GitHub

## Step-by-Step Guide

### Step 1: Find the Upload File
- Open File Explorer (Windows key + E)
- Navigate to: `C:\everwatt-engine`
- Look for the file: `upload-to-github.bat`

### Step 2: Run the Upload File
- **Double-click** `upload-to-github.bat`
- A black command window will open
- It will automatically:
  - Initialize Git
  - Add all your files
  - Commit them
  - Try to push to GitHub

### Step 3: If You Get an Authentication Prompt
When it asks for your username:
- Type: `Nik510`
- Press Enter

When it asks for your password:
- **DO NOT use your regular GitHub password**
- You need a **Personal Access Token**

### Step 4: Get a Personal Access Token (if needed)

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name like "EverWatt Upload"
4. Check the box for **"repo"** (this gives full repository access)
5. Scroll down and click **"Generate token"**
6. **Copy the token** (it looks like: `ghp_xxxxxxxxxxxxx`)
   - ⚠️ You can only see it once, so copy it immediately!
7. Paste this token as your password when prompted

### Step 5: Wait for Success
- The script will show "SUCCESS! Code uploaded to GitHub!"
- Your code is now on GitHub at: https://github.com/Nik510/Cursor_EverWatt_AI

---

## Alternative: If the batch file doesn't work

Open a **NEW** Command Prompt or PowerShell window (Windows key → type "cmd" or "PowerShell" → press Enter)

Then type these commands one by one:

```
cd C:\everwatt-engine
git init
git remote add origin https://github.com/Nik510/Cursor_EverWatt_AI.git
git add .
git commit -m "Initial commit: EverWatt Engine"
git branch -M main
git push -u origin main
```

You'll still need the Personal Access Token as your password.

---

## Need Help?
If you get stuck, share the error message and I'll help you fix it!




