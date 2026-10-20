import { copyFile, mkdir } from 'node:fs/promises'

const outputDirectory = new URL('../dist/game-based-learning/', import.meta.url)
const sourceFile = new URL('../game-based-learning/index.html', import.meta.url)
const outputFile = new URL('../dist/game-based-learning/index.html', import.meta.url)

await mkdir(outputDirectory, { recursive: true })
await copyFile(sourceFile, outputFile)
