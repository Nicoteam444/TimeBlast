export function logAudit(action, description, userId = null) {
  try {
    const existing = JSON.parse(localStorage.getItem('audit_log') || '[]')
    existing.unshift({ id: Date.now(), action, description, user_id: userId, date: new Date().toISOString() })
    localStorage.setItem('audit_log', JSON.stringify(existing.slice(0, 200)))
  } catch {}
}
