import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

function countFiles(dir, ext) {
  let count = 0
  try {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      const s = statSync(p)
      if (s.isDirectory()) count += countFiles(p, ext)
      else if (f.endsWith(ext)) count++
    }
  } catch {}
  return count
}

function getStats() {
  let commits = 233
  let pages = 77
  try { commits = parseInt(execSync('git rev-list --count HEAD 2>/dev/null').toString().trim(), 10) || commits } catch {}
  try { pages = countFiles('src/pages', '.jsx') } catch {}
  return { commits, pages }
}

const stats = getStats()
console.log(`[TimeBlast Build] commits=${stats.commits} pages=${stats.pages}`)

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_COMMIT_COUNT__: stats.commits,
    __APP_PAGE_COUNT__: stats.pages,
  },
})
