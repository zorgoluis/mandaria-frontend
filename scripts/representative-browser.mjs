import { access, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

// Explicit installed browser, never a personal profile or an automatic retry chain.
export const representativeBrowserPath =
  process.env.REPRESENTATIVE_BROWSER_EXE ||
  process.env.REPRESENTATIVE_CHROMIUM ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe'

export async function launchRepresentativeBrowser(directory) {
  const temporary = resolve(directory, 'browser-temporary')
  await access(representativeBrowserPath)
  await mkdir(temporary, { recursive: true })
  const original = { TEMP: process.env.TEMP, TMP: process.env.TMP }
  process.env.TEMP = temporary
  process.env.TMP = temporary
  try {
    return await chromium.launch({
      executablePath: representativeBrowserPath,
      headless: true,
      chromiumSandbox: true,
      timeout: 15000,
      downloadsPath: temporary,
    })
  } finally {
    for (const key of ['TEMP', 'TMP']) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  }
}
