module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}", // Adjusted to include .scss
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')], // Added forms plugin
}
