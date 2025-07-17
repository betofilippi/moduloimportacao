"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Upload, X, File, FileText, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileUploadProps {
  onUpload?: (files: File[]) => void
  onRemove?: (file: File) => void
  acceptedTypes?: string[]
  maxSize?: number // em MB
  maxFiles?: number
  multiple?: boolean
  className?: string
}

interface UploadedFile extends File {
  id: string
  status: "uploading" | "success" | "error"
  progress?: number
  error?: string
}

const FileUpload = ({
  onUpload,
  onRemove,
  acceptedTypes = [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
  maxSize = 10, // 10MB
  maxFiles = 5,
  multiple = true,
  className,
}: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(Array.from(e.dataTransfer.files))
      }
    },
    [maxFiles, maxSize, acceptedTypes]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault()
      if (e.target.files && e.target.files[0]) {
        handleFiles(Array.from(e.target.files))
      }
    },
    [maxFiles, maxSize, acceptedTypes]
  )

  const handleFiles = useCallback(
    (fileList: File[]) => {
      const validFiles: UploadedFile[] = []
      
      fileList.forEach((file) => {
        // Check file count
        if (!multiple && files.length >= 1) {
          return
        }
        if (files.length + validFiles.length >= maxFiles) {
          return
        }

        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
          return
        }

        // Check file type
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
        if (!acceptedTypes.includes(fileExtension || "")) {
          return
        }

        const uploadFile: UploadedFile = {
          ...file,
          id: Math.random().toString(36).substr(2, 9),
          status: "uploading",
          progress: 0,
        }

        validFiles.push(uploadFile)
      })

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles])
        
        // Simulate upload progress
        validFiles.forEach((file) => {
          simulateUpload(file)
        })

        onUpload?.(validFiles)
      }
    },
    [files, maxFiles, maxSize, acceptedTypes, multiple, onUpload]
  )

  const simulateUpload = (file: UploadedFile) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success", progress: 100 } : f
          )
        )
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, progress } : f
          )
        )
      }
    }, 200)
  }

  const removeFile = (file: UploadedFile) => {
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
    onRemove?.(file)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    
    // Remove image icon handling since we no longer support image formats
    if (["pdf"].includes(extension || "")) {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple={multiple}
          onChange={handleChange}
          accept={acceptedTypes.join(",")}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">Clique para fazer upload</span> ou arraste e solte
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {acceptedTypes.join(", ")} até {maxSize}MB
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === "uploading" && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${file.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(file.progress || 0)}%
                        </span>
                      </div>
                    )}
                    {file.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file)}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export { FileUpload }