interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background">
      <div className="h-1.5 bg-muted relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary via-[hsl(var(--pink-accent))] to-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="px-6 py-3 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Paso {currentStep} de {totalSteps}
        </p>
      </div>
    </div>
  );
}
