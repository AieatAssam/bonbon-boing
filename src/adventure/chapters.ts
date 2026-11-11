/** Stars earned in previous chapter required to open the next map. */
export const CHAPTER_STAR_GATES: Record<1 | 2 | 3 | 4, number> = {
  1: 0,
  2: 12,
  3: 30,
  4: 55,
}

export function chapterUnlocked(saveChapterStars: Record<string, number>, chapter: 1 | 2 | 3 | 4): boolean {
  if (chapter === 1) return true
  const prev = (chapter - 1) as 1 | 2 | 3
  const earned = saveChapterStars[String(prev)] ?? 0
  return earned >= CHAPTER_STAR_GATES[chapter]
}

export function starsNeededForChapter(saveChapterStars: Record<string, number>, chapter: 1 | 2 | 3 | 4): number {
  if (chapter === 1) return 0
  const need = CHAPTER_STAR_GATES[chapter]
  const prev = (chapter - 1) as 1 | 2 | 3
  const earned = saveChapterStars[String(prev)] ?? 0
  return Math.max(0, need - earned)
}
