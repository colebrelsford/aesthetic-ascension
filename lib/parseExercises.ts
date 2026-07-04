export function parseExercisesFromHtml(html: string): string[] {
  if (!html) return []

  // Strip HTML tags to get plain text
  const text = html.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ')

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const exercises: string[] = []

  for (const line of lines) {
    // Skip day headers, short labels, and lines that are just numbers
    if (line.length < 4) continue
    if (/^(day|week|phase|block|push|pull|legs|upper|lower|full body|rest|off)/i.test(line)) continue
    if (/^\d+[\.\)]\s*$/.test(line)) continue

    // Clean up common prefixes like "1. ", "- ", "• "
    const cleaned = line.replace(/^[\d]+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').trim()

    if (cleaned.length >= 4 && !exercises.includes(cleaned)) {
      exercises.push(cleaned)
    }
  }

  return exercises.slice(0, 50)
}
