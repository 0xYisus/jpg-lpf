#!/usr/bin/env node
/**
 * Refresh local CSV cache from football-data.co.uk
 * Usage: node scripts/fetch-data.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outRoot = join(__dirname, '..', 'public', 'data')

const LEAGUES = ['E0', 'SP1', 'I1', 'D1', 'F1']
const SEASONS = [
  '1516', '1617', '1718', '1819', '1920',
  '2021', '2122', '2223', '2324', '2425',
]

async function main() {
  for (const league of LEAGUES) {
    await mkdir(join(outRoot, league), { recursive: true })
    for (const season of SEASONS) {
      const url = `https://www.football-data.co.uk/mmz4281/${season}/${league}.csv`
      const out = join(outRoot, league, `${season}.csv`)
      process.stdout.write(`GET ${url} … `)
      const res = await fetch(url)
      if (!res.ok) {
        console.log(`FAIL ${res.status}`)
        continue
      }
      const text = await res.text()
      await writeFile(out, text)
      console.log(`ok (${text.length} bytes)`)
    }
  }
  const manifest = {
    source: 'https://www.football-data.co.uk',
    leagues: LEAGUES,
    seasons: SEASONS,
    generatedAt: new Date().toISOString(),
  }
  await writeFile(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log('Wrote manifesto.json')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
