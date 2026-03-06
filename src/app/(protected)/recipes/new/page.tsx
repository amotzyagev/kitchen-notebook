'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RecipeForm } from '@/components/recipe/recipe-form'
import { PhotoUpload } from '@/components/recipe/photo-upload'
import { UrlInput } from '@/components/recipe/url-input'
import { TextInput } from '@/components/recipe/text-input'
import { FileImport } from '@/components/recipe/file-import'
import { useRecipes } from '@/hooks/use-recipes'
import type { AIRecipeExtraction } from '@/lib/validators/ai-response'
import type { RecipeForm as RecipeFormType } from '@/lib/validators/recipe'

export default function NewRecipePage() {
  const router = useRouter()
  const { createRecipe } = useRecipes()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('manual')

  // Extracted data from AI
  const [extractedData, setExtractedData] = useState<AIRecipeExtraction | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | undefined>()
  const [showForm, setShowForm] = useState(true)

  const handleTextExtracted = useCallback((data: AIRecipeExtraction) => {
    setExtractedData(data)
    setShowForm(true)
  }, [])

  const handlePhotoExtracted = useCallback((data: AIRecipeExtraction) => {
    setExtractedData(data)
    setShowForm(true)
  }, [])

  const handleUrlExtracted = useCallback((data: AIRecipeExtraction) => {
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
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
        console.error('Failed to save recipe:', errMsg, error)
        alert(`שגיאה בשמירת המתכון: ${errMsg}`)
      } finally {
        setIsLoading(false)
      }
    },
    [createRecipe, router]
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
      <h1 className="text-2xl font-bold">מתכון חדש</h1>

      <Tabs
        defaultValue="manual"
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val)
          // Reset extracted data when switching tabs
          setExtractedData(null)
          setSourceUrl(undefined)
          if (val === 'manual') {
            setShowForm(true)
          } else {
            setShowForm(false)
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="manual">ידני</TabsTrigger>
          <TabsTrigger value="text">טקסט חופשי</TabsTrigger>
          <TabsTrigger value="photo">צילום</TabsTrigger>
          <TabsTrigger value="link">קישור</TabsTrigger>
          <TabsTrigger value="import">ייבוא</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <RecipeForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            sourceType="manual"
          />
        </TabsContent>

        <TabsContent value="text">
          {!showForm || !extractedData ? (
            <TextInput onExtracted={handleTextExtracted} />
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
            <PhotoUpload
              onExtracted={handlePhotoExtracted}
            />
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
            <UrlInput
              onExtracted={(data) => {
                // Capture the URL from the input before it gets cleared
                const urlInput = document.querySelector<HTMLInputElement>('input[type="url"]')
                if (urlInput) {
                  setSourceUrl(urlInput.value)
                }
                handleUrlExtracted(data)
              }}
            />
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
