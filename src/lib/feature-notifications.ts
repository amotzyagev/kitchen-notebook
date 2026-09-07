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
    id: 'shopping-list',
    titleHe: 'רשימת קניות מהמתכונים שלכם',
    bodyHe: 'בחרו מתכונים או מצרכים בודדים, אספו אותם לרשימה שנשמרת בחשבון, ושלחו ב-WhatsApp, בתפריט השיתוף או בהדפסה ושמירה כ-PDF. רשימת הקניות זמינה בכפתור הסל בראש המסך.',
    date: '2026-09-06',
  },
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
  {
    id: 'keep-screen-awake',
    titleHe: 'המסך נשאר דולק',
    bodyHe: 'בזמן צפייה במתכון המסך לא ייכבה מעצמו, כדי שלא תצטרכו לגעת בו עם ידיים מלוכלכות. ניתן לכבות את זה בכפתור "מסך דולק" שליד שם המתכון.',
    date: '2026-08-29',
  },
]
