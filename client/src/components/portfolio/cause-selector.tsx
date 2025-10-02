import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Heart, CheckCircle, X } from "lucide-react";
import { usePortfolio } from "@/hooks/use-portfolio";

export function CauseSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCause, setSelectedCause] = useState("");
  const { portfolio, nonprofits, updatePortfolio } = usePortfolio();

  const handleSave = async () => {
    if (selectedCause && portfolio) {
      await updatePortfolio({ selectedCause });
      setIsOpen(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center space-x-3">
        <Button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-secondary text-secondary-foreground hover:opacity-90 transition-smooth shadow-sm"
          data-testid="choose-cause-btn"
        >
          <Heart className="w-5 h-5 mr-2" />
          Choose nonprofit
        </Button>
        
        {portfolio?.selectedCause && (
          <div className="text-sm text-muted-foreground" data-testid="selected-cause">
            Selected cause: <span className="font-medium text-foreground" data-testid="selected-cause-name">
              {portfolio.selectedCause}
            </span>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md" data-testid="cause-modal">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Choose a nonprofit</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6"
                data-testid="close-cause-modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <RadioGroup value={selectedCause} onValueChange={setSelectedCause}>
              {nonprofits.map((nonprofit) => (
                <div
                  key={nonprofit.id}
                  className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:border-primary transition-smooth cursor-pointer"
                >
                  <RadioGroupItem value={nonprofit.name} id={nonprofit.id} />
                  <Label 
                    htmlFor={nonprofit.id} 
                    className="flex-1 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-sm font-medium text-foreground">{nonprofit.name}</span>
                    {nonprofit.verified === 1 && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            <Button
              onClick={handleSave}
              disabled={!selectedCause}
              className="w-full"
              data-testid="save-cause-btn"
            >
              Save cause
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
