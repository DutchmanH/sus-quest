const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(): string {
  const part1 = Array.from({ length: 2 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  const part2 = Array.from({ length: 1 }, () => Math.floor(Math.random() * 10)).join('')
  const part3 = Array.from({ length: 1 }, () => CHARS.slice(0, 24)[Math.floor(Math.random() * 24)]).join('')
  const part4 = Array.from({ length: 2 }, () => Math.floor(Math.random() * 10)).join('')
  return `${part1}${part2}-${part3}${part4}${Math.floor(Math.random() * 10)}`
}
