import * as React from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorComponentProps {
  title?: string
  message?: string
  onRetry?: () => void
  showHomeButton?: boolean
}

const ErrorComponent = ({
  title = "Algo deu errado",
  message = "Ocorreu um erro inesperado. Tente novamente.",
  onRetry,
  showHomeButton = false,
}: ErrorComponentProps) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-2">
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        )}
        {showHomeButton && (
          <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"}>
            <Home className="mr-2 h-4 w-4" />
            Voltar ao Início
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Page-level error component
const PageError = ({ error, reset }: { error: Error; reset: () => void }) => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorComponent
        title="Erro na Página"
        message={error.message || "Não foi possível carregar esta página."}
        onRetry={reset}
        showHomeButton
      />
    </div>
  )
}

// Card-level error component
const CardError = ({ message, onRetry }: { message?: string; onRetry?: () => void }) => {
  return (
    <div className="flex h-32 items-center justify-center p-4">
      <div className="text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          {message || "Erro ao carregar dados"}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Tentar Novamente
          </Button>
        )}
      </div>
    </div>
  )
}

// 404 Not Found component
const NotFoundError = () => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorComponent
        title="Página Não Encontrada"
        message="A página que você está procurando não existe ou foi movida."
        showHomeButton
      />
    </div>
  )
}

// Network error component
const NetworkError = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <ErrorComponent
      title="Erro de Conexão"
      message="Verifique sua conexão com a internet e tente novamente."
      onRetry={onRetry}
    />
  )
}

export { ErrorComponent, PageError, CardError, NotFoundError, NetworkError }