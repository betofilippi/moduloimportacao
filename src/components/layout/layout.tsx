"use client"

import * as React from "react"
import { useState } from "react"

import { Header } from "./header"
import { Sidebar } from "./sidebar"

interface LayoutProps {
  children: React.ReactNode
  title: string
  user?: { name: string; email: string; }
}

export function Layout({ children, title, user }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header title={title} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}