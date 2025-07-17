// User and Authentication Types
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: "admin" | "user" | "manager"
  company?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: Date
}

// Import Process Types
export interface ImportProcess {
  id: string
  client: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  value: number
  currency: string
  date: Date
  documents: ImportDocument[]
  responsible: string
  responsibleId: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ImportDocument {
  id: string
  processId: string
  name: string
  type: DocumentType
  size: number
  url: string
  status: "uploading" | "uploaded" | "processed" | "error"
  uploadedAt: Date
  processedAt?: Date
  metadata?: Record<string, any>
}

export type DocumentType = 
  | "invoice"
  | "packing_list"
  | "bill_of_lading"
  | "certificate"
  | "customs_declaration"
  | "other"

// Client and Company Types
export interface Client {
  id: string
  name: string
  document: string // CPF/CNPJ
  email: string
  phone: string
  address: Address
  type: "individual" | "company"
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export interface Company {
  id: string
  name: string
  cnpj: string
  email: string
  phone: string
  address: Address
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export interface Address {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
}

// Product Types
export interface Product {
  id: string
  name: string
  code: string
  description?: string
  category: string
  ncm: string // Nomenclatura Comum do Mercosul
  unit: string
  weight?: number
  dimensions?: Dimensions
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export interface Dimensions {
  length: number
  width: number
  height: number
  unit: "cm" | "m"
}

// Supplier and Transport Types
export interface Supplier {
  id: string
  name: string
  document: string
  email: string
  phone: string
  address: Address
  country: string
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export interface Transporter {
  id: string
  name: string
  document: string
  email: string
  phone: string
  address: Address
  vehicleTypes: string[]
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

// Bank Types
export interface Bank {
  id: string
  name: string
  code: string
  swift?: string
  address: Address
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

// Report Types
export interface ReportData {
  period: {
    start: Date
    end: Date
  }
  metrics: {
    totalProcesses: number
    totalValue: number
    completedProcesses: number
    pendingProcesses: number
    totalDocuments: number
    activeClients: number
  }
  trends: {
    processesGrowth: number
    valueGrowth: number
    documentsGrowth: number
  }
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: "text" | "email" | "password" | "number" | "select" | "textarea" | "file"
  placeholder?: string
  required?: boolean
  validation?: any
  options?: { value: string; label: string }[]
}

// API Types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
  errors?: string[]
}

export interface PaginationParams {
  page: number
  limit: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Configuration Types
export interface SystemSettings {
  theme: "light" | "dark" | "system"
  language: string
  timezone: string
  currency: string
  dateFormat: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

// File Upload Types
export interface UploadConfig {
  maxSize: number // in MB
  maxFiles: number
  acceptedTypes: string[]
  multiple: boolean
}

export interface FileUploadProgress {
  file: File
  progress: number
  status: "uploading" | "success" | "error"
  error?: string
}

// Notification Types
export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  createdAt: Date
}