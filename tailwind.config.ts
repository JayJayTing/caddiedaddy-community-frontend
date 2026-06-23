import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  corePlugins: { preflight: false },  // design system owns resets
  theme: { extend: {} },
  plugins: [],
}
export default config
