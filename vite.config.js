import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { globSync } from 'fs'

function getStats() {
  try {
    const commits = parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10)
    const pages = execSync('find src/pages -name "*.jsx" | wc -l').toString().trim()
    return { commits, pages: parseInt(pages, 10) }
  } catch {
    return { commits: 232, pages: 77 }
  }
}

const stats = getStats()

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT_COUNT__: JSON.stringify(stats.commits),
    __APP_PAGE_COUNT__: JSON.stringify(stats.pages),
  },
})
