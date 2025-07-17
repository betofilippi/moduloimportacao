'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface ProcessingStep {
  step: number;
  stepName: string;
  stepDescription: string;
  completed: boolean;
  result?: string;
}

interface ProcessingProgressProps {
  steps: ProcessingStep[];
  currentStep: number;
  totalSteps: number;
}

export function ProcessingProgress({ steps, currentStep, totalSteps }: ProcessingProgressProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <Card className="p-4 bg-muted/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Progresso do Processamento</h4>
          <span className="text-sm text-muted-foreground">
            {currentStep}/{totalSteps}
          </span>
        </div>

        <Progress value={progressPercentage} className="h-2" />

        <div className="space-y-2">
          {steps.map((step) => {
            const isActive = step.step === currentStep && !step.completed;
            const isCompleted = step.completed;
            const isPending = step.step > currentStep;

            return (
              <div
                key={step.step}
                className={`
                  flex items-center space-x-3 p-2 rounded-md transition-colors
                  ${isActive ? 'bg-primary/10 border border-primary/20' : ''}
                  ${isCompleted ? 'bg-green-50 border border-green-200' : ''}
                  ${isPending ? 'opacity-50' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Etapa {step.step}
                    </span>
                    <span
                      className={`
                        text-sm font-medium
                        ${isCompleted ? 'text-green-700' : ''}
                        ${isActive ? 'text-primary' : ''}
                        ${isPending ? 'text-muted-foreground' : ''}
                      `}
                    >
                      {step.stepName}
                    </span>
                  </div>
                  <p
                    className={`
                      text-xs mt-1
                      ${isCompleted ? 'text-green-600' : ''}
                      ${isActive ? 'text-primary/70' : ''}
                      ${isPending ? 'text-muted-foreground' : ''}
                    `}
                  >
                    {step.stepDescription}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}