/** Studio colours come from CSS variables (src/index.css), so dark and light mode share one set of class names. */
const v = name => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), raised: v('raised'), line: v('line'),
        ink: v('ink'), muted: v('muted'), faint: v('faint'),
        primary: v('primary'), onprimary: v('onprimary'), accent: v('accent'), teal: v('teal'),
        mark: v('mark'), red: v('red'), orange: v('orange'), green: v('green'), gold: v('gold'), lilac: v('lilac')
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],   // headings: change with the font link in index.html (BRANDING.md)
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      letterSpacing: { brand: '0.21em', sub: '0.05em' }
    }
  },
  safelist: [{ pattern: /^pill-(red|orange|green|gold|lilac|primary|accent|grey)$/ }],
  plugins: []
};
