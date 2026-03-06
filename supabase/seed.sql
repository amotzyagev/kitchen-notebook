-- NOTE: These recipes use a placeholder user_id.
-- Replace 'YOUR_USER_ID' with an actual user UUID after signing up.

-- Manual recipe
INSERT INTO recipes (user_id, title, ingredients, instructions, notes, source_type, tags)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'חומוס ביתי',
  ARRAY['400 גרם חומוס מבושל', '3 כפות טחינה גולמית', 'מיץ מחצי לימון', 'שן שום אחת', 'מלח לפי הטעם', 'שמן זית'],
  ARRAY['סננו את החומוס ושמרו מעט מהמים', 'הכניסו למעבד מזון עם טחינה, לימון ושום', 'טחנו עד לקבלת מרקם חלק', 'הוסיפו מלח ושמן זית', 'הגישו עם שמן זית ופטרוזיליה'],
  'ניתן להוסיף כמון או פפריקה מעושנת',
  'manual',
  ARRAY['מנה ראשונה', 'טבעוני', 'קל']
);

-- Link recipe
INSERT INTO recipes (user_id, title, ingredients, instructions, notes, source_type, source_url, original_text, tags)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'עוגת שוקולד',
  ARRAY['200 גרם שוקולד מריר', '150 גרם חמאה', '4 ביצים', '200 גרם סוכר', '100 גרם קמח'],
  ARRAY['חממו תנור ל-180 מעלות', 'המיסו שוקולד עם חמאה', 'הקציפו ביצים עם סוכר', 'קפלו את תערובת השוקולד לביצים', 'הוסיפו קמח וערבבו בעדינות', 'אפו 25 דקות'],
  'ניתן להוסיף אגוזים או פירות יער',
  'link',
  'https://example.com/chocolate-cake',
  'Chocolate Cake Recipe: 200g dark chocolate, 150g butter...',
  ARRAY['אפייה', 'קינוח']
);

-- Image recipe
INSERT INTO recipes (user_id, title, ingredients, instructions, notes, source_type, source_image_path, original_text, tags)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'סלט ירקות קיצי',
  ARRAY['3 עגבניות', '2 מלפפונים', 'בצל סגול אחד', 'פטרוזיליה', 'שמן זית', 'מיץ לימון', 'מלח ופלפל'],
  ARRAY['קצצו את כל הירקות לקוביות קטנות', 'ערבבו בקערה גדולה', 'הוסיפו שמן זית ומיץ לימון', 'תבלו במלח ופלפל', 'הגישו מיד'],
  'סלט קלאסי ישראלי',
  'image',
  'placeholder/image/path.jpg',
  'Israeli Salad - tomatoes, cucumbers, onion, parsley, olive oil, lemon',
  ARRAY['סלט', 'טבעוני', 'קל']
);
