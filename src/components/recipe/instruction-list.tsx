interface InstructionListProps {
  instructions: string[]
}

const hebrewNumbers = [
  '\u05D0','\u05D1','\u05D2','\u05D3','\u05D4','\u05D5','\u05D6','\u05D7','\u05D8','\u05D9',
  '\u05D9\u05D0','\u05D9\u05D1','\u05D9\u05D2','\u05D9\u05D3','\u05D8\u05D5','\u05D8\u05D6',
  '\u05D9\u05D6','\u05D9\u05D7','\u05D9\u05D8','\u05DB',
]

function getHebrewNumber(n: number): string {
  if (n >= 1 && n <= hebrewNumbers.length) {
    return hebrewNumbers[n - 1]
  }
  return String(n)
}

export function InstructionList({ instructions }: InstructionListProps) {
  return (
    <ol className="space-y-3" dir="rtl">
      {instructions.map((instruction, index) => (
        <li key={index} className="flex gap-3">
          <span className="flex items-center justify-center size-8 rounded-full bg-muted text-sm font-medium shrink-0">
            {getHebrewNumber(index + 1)}
          </span>
          <p className="pt-1">{instruction}</p>
        </li>
      ))}
    </ol>
  )
}
