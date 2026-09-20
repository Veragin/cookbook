import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; }

  html {
    /* Themes native UI: form controls, scrollbars, the overscroll gutter. */
    color-scheme: ${({ theme }) => theme.mode};
    background: ${({ theme }) => theme.color.bg};
  }

  body {
    margin: 0;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
    font-family: ${({ theme }) => theme.font.body};
    font-size: ${({ theme }) => theme.font.size.md};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior-y: none;
  }

  h1, h2, h3, h4, p, figure, ul, ol { margin: 0; }
  ul, ol { padding: 0; list-style: none; }

  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }

  button { cursor: pointer; }

  img { max-width: 100%; display: block; }

  a { color: ${({ theme }) => theme.color.primary}; }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focus};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`
