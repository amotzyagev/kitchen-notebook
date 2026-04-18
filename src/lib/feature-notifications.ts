export interface FeatureNotification {
  id: string
  titleHe: string
  bodyHe: string
  date: string
}

/**
 * Feature notifications shown to users via the bell icon.
 * To announce a new feature: add an entry here with a unique id.
 * Users who haven't seen it yet will see a badge on the bell and the
 * announcement in the notifications dialog on next login.
 */
export const FEATURE_NOTIFICATIONS: FeatureNotification[] = [
  {
    id: 'family-sharing',
    titleHe: 'שיתוף משפחה',
    bodyHe: 'ניתן עכשיו לחבר בני משפחה לחשבון ולערוך מתכונים ביחד. לחץ על "משפחה" בתפריט המשתמש.',
    date: '2026-03-01',
  },
  {
    id: 'recipe-multiplier',
    titleHe: 'הכפלת מתכון',
    bodyHe: 'ניתן לשנות את כמות המנות ולהכפיל את הרכיבים אוטומטית בעזרת כפתור ה-× בדף המתכון.',
    date: '2026-03-06',
  },
]
