export function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export function likePattern(value: string): string {
  return `%${likeEscape(value)}%`
}
