const EXCLUDED_EXTENSIONS = new Set([
  '.md', '.txt', '.html', '.css', '.scss',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.tif', '.tiff', '.avif', '.mp3', '.mp4', '.mov', '.avi', '.webm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.zip', '.gz', '.tar',
  '.lock', '.pem', '.key', '.crt', '.map', '.tsbuildinfo'
])

const EXCLUDED_FILENAMES = new Set([
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  '.gitignore', '.eslintignore', '.prettierignore', '.env', '.env.local'
])

const EXCLUDED_DIRECTORIES = new Set([
  'node_modules', '.pnpm-store', 'vendor', 'dist', 'build', 'out',
  'coverage', '.cache', '.next', 'docs', 'examples', 'benchmarks',
  'spec', '.github', '.git', '.idea', '.vscode'
])

function pathParts(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').filter(Boolean)
}

export function isExcludedFile(path: string): boolean {
  const parts = pathParts(path)
  const filename = parts[parts.length - 1] || ''
  const extension = filename.includes('.') ? `.${filename.split('.').pop()?.toLowerCase()}` : ''

  if (EXCLUDED_FILENAMES.has(filename) || filename.startsWith('.env.')) return true
  if (EXCLUDED_EXTENSIONS.has(extension)) return true
  if (parts.slice(0, -1).some((part) => EXCLUDED_DIRECTORIES.has(part))) return true

  return false
}

export function isExcludedDirectory(name: string): boolean {
  return name.startsWith('.') || EXCLUDED_DIRECTORIES.has(name)
}