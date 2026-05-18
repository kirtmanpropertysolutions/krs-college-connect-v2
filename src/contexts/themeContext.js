import { createContext, useContext } from 'react'

/**
 * Shared theme context — provider lives in `ThemeContext.jsx`. Splitting the
 * context object + the consumer hook into this .js file lets the .jsx
 * file export only the React component (react-refresh requirement).
 */
export const ThemeContext = createContext(null)

/** Consumer hook for the theme provider. */
export const useTheme = () => useContext(ThemeContext)
