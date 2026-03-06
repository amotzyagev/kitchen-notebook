"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("useTabs must be used within <Tabs>")
  return context
}

function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const activeTab = value ?? internalValue
  const setActiveTab = React.useCallback(
    (tab: string) => {
      setInternalValue(tab)
      onValueChange?.(tab)
    },
    [onValueChange]
  )

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full",
        className
      )}
      role="tablist"
      {...props}
    />
  )
}

function TabsTrigger({
  value,
  className,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const { activeTab, setActiveTab } = useTabs()
  const isActive = activeTab === value

  return (
    <button
      data-slot="tabs-trigger"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-background text-foreground shadow",
        className
      )}
      onClick={() => setActiveTab(value)}
      {...props}
    />
  )
}

function TabsContent({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const { activeTab } = useTabs()

  if (activeTab !== value) return null

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
