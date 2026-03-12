'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RecipeForm } from '@/components/recipe/recipe-form'
import { PhotoUpload } from '@/components/recipe/photo-upload'
import { UrlInput } from '@/components/recipe/url-input'
import { TextInput } from '@/components/recipe/text-input'
import { FileImport } from '@/components/recipe/file-import'
import { useRecipes } from '@/hooks/use-recipes'
import { toast } from 'sonner'
import type { AIRecipeExtraction } from '@/lib/validators/ai-response'
import type { RecipeForm as RecipeFormType } from '@/lib/validators/recipe'

export default function NewRecipePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { createRecipe, uploadRecipeImage, updateRecipe } = useRecipes()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'link')

  // Extracted data from AI
  const [extractedData, setExtractedData] = useState<AIRecipeExtraction | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | undefined>()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [showForm, setShowForm] = useState(true)

  const handleTextExtracted = useCallback((data: AIRecipeExtraction) => {
    setExtractedData(data)
    setShowForm(true)
  }, [])

  const handlePhotoExtracted = useCallback((data: AIRecipeExtraction, imageFile: File) => {
    setExtractedData(data)
    setPhotoFile(imageFile)
    setShowForm(true)
  }, [])

  const handleUrlExtracted = useCallback((data: AIRecipeExtraction, url: string) => {
    setSourceUrl(url)
    setExtractedData(data)
    setShowForm(true)
  }, [])

  const handleSubmit = useCallback(
    async (
      data: RecipeFormType,
      meta?: {
        sourceType?: 'manual' | 'link' | 'image'
        sourceUrl?: string
        sourceImagePath?: string
        originalText?: string
      }
    ) => {
      setIsLoading(true)
      try {
        // For image source type, we need to upload first then update with path
        // Create recipe with a placeholder path first, then upload and update
        if (meta?.sourceType === 'image' && photoFile) {
          // Create recipe as 'manual' first to avoid CHECK constraint,
          // then upload image and update to 'image' with path
          const recipe = await createRecipe({
            title: data.title,
            ingredients: data.ingredients,
            instructions: data.instructions,
            notes: data.notes || null,
            tags: data.tags,
            source_type: 'manual',
            original_text: meta?.originalText || null,
          })

          // Upload image and update recipe
          const imagePath = await uploadRecipeImage(recipe.user_id, recipe.id, photoFile)
          await updateRecipe(recipe.id, {
            source_type: 'image',
            source_image_path: imagePath,
          })

          router.push(`/recipes/${recipe.id}`)
        } else {
          const recipe = await createRecipe({
            title: data.title,
            ingredients: data.ingredients,
            instructions: data.instructions,
            notes: data.notes || null,
            tags: data.tags,
            source_type: meta?.sourceType || 'manual',
            source_url: meta?.sourceUrl || null,
            source_image_path: meta?.sourceImagePath || null,
            original_text: meta?.originalText || null,
          })
          router.push(`/recipes/${recipe.id}`)
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
        console.error('Failed to save recipe:', errMsg, error)
        toast.error(`שגיאה בשמירת המתכון: ${errMsg}`)
      } finally {
        setIsLoading(false)
      }
    },
    [createRecipe, uploadRecipeImage, updateRecipe, photoFile, router]
  )

  const defaultValues = extractedData
    ? {
        title: extractedData.title,
        ingredients: extractedData.ingredients,
        instructions: extractedData.instructions,
        notes: extractedData.notes,
        tags: extractedData.tags ?? [],
      }
    : undefined

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      <h1 className="text-2xl font-[var(--font-display)] text-primary">מתכון חדש</h1>

      <Tabs
        defaultValue="link"
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val)
          // Reset extracted data when switching tabs
          setExtractedData(null)
          setSourceUrl(undefined)
          setPhotoFile(null)
          setShowForm(false)
        }}
      >
        <TabsList>
          <TabsTrigger value="link">קישור</TabsTrigger>
          <TabsTrigger value="text">טקסט חופשי</TabsTrigger>
          <TabsTrigger value="photo">צילום</TabsTrigger>
          <TabsTrigger value="import">ייבוא</TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          {!showForm || !extractedData ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">הדביקו טקסט של מתכון והבינה המלאכותית תחלץ אותו לפורמט מסודר.</p>
              <TextInput onExtracted={handleTextExtracted} />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                המתכון חולץ בהצלחה. בדוק ותקן לפי הצורך:
              </p>
              <RecipeForm
                key={`text-${extractedData.title}`}
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
                isLoading={isLoading}
                sourceType="manual"
                originalText={extractedData.original_text}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="photo">
          {!showForm || !extractedData ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">צלמו או העלו תמונה של מתכון מספר בישול, מגזין או כל מקור אחר.</p>
              <PhotoUpload
                onExtracted={handlePhotoExtracted}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                המתכון חולץ בהצלחה. בדוק ותקן לפי הצורך:
              </p>
              <RecipeForm
                key={`photo-${extractedData.title}`}
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
                isLoading={isLoading}
                sourceType="image"
                originalText={extractedData.original_text}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="link">
          {!showForm || !extractedData ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">הדביקו קישור לאתר מתכונים והבינה המלאכותית תחלץ את המתכון אוטומטית.</p>
              <UrlInput
                onExtracted={handleUrlExtracted}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                המתכון חולץ בהצלחה. בדוק ותקן לפי הצורך:
              </p>
              <RecipeForm
                key={`link-${extractedData.title}`}
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
                isLoading={isLoading}
                sourceType="link"
                sourceUrl={sourceUrl}
                originalText={extractedData.original_text}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="import">
          <FileImport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
