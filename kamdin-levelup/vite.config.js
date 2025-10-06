import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
# 0) From your project folder
cd ~/WEB422-Lab3-Final/kamdin-levelup

# 1) (One time) login to GitHub CLI if you haven’t before
gh auth login

# 2) Initialize git (safe to run even if already in a repo)
git init
git add -A
git commit -m "Initial commit: Kamdin Level-Up Dashboard"

# 3) Create a PRIVATE repo on your GitHub named kamdin-levelup
gh repo create kamdin-levelup --private --source=. --remote=origin --push
