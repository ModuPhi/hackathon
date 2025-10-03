import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Heart, X, MapPin } from "lucide-react";
import { usePortfolio } from "@/hooks/use-portfolio";

export function CauseSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { portfolio, nonprofits, updatePortfolio } = usePortfolio();

  useEffect(() => {
    if (portfolio?.selectedNonprofit) {
      setSelectedId(portfolio.selectedNonprofit);
    }
  }, [portfolio?.selectedNonprofit]);

  const handleSelect = (nonprofitId: string) => {
    setSelectedId(nonprofitId === selectedId ? null : nonprofitId);
  };

  const handleSave = async () => {
    if (portfolio) {
      await updatePortfolio({ selectedNonprofit: selectedId });
      setIsOpen(false);
    }
  };

  const selectedNonprofit = nonprofits.find(np => np.id === portfolio?.selectedNonprofit);

  return (
    <div>
      <Button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-secondary text-secondary-foreground hover:opacity-90 transition-smooth shadow-sm"
        data-testid="choose-cause-btn"
      >
        <Heart className="w-5 h-5 mr-2" />
        {selectedNonprofit ? selectedNonprofit.name : 'Choose a nonprofit'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="cause-modal">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">Choose a nonprofit to support</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Select one organization to work for
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
                data-testid="close-cause-modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {nonprofits.map((nonprofit) => {
              const isSelected = selectedId === nonprofit.id;
              
              return (
                <div
                  key={nonprofit.id}
                  className={`relative border rounded-lg overflow-hidden transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-primary shadow-md ring-2 ring-primary ring-opacity-50' 
                      : 'border-border hover:border-primary hover:shadow-sm'
                  }`}
                  onClick={() => handleSelect(nonprofit.id)}
                  data-testid={`nonprofit-card-${nonprofit.id}`}
                >
                  <div className="relative h-40 bg-muted">
                    <img
                      src={nonprofit.imageUrl}
                      alt={nonprofit.name}
                      className="w-full h-full object-cover"
                    />
                    <div 
                      className="absolute top-2 left-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(nonprofit.id);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="bg-white border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        data-testid={`checkbox-${nonprofit.id}`}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground line-clamp-1">
                        {nonprofit.name}
                      </h3>
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3 mr-1" />
                      {nonprofit.location}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {nonprofit.description}
                    </p>
                    
                    <Badge variant="outline" className="text-xs">
                      {nonprofit.category}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              data-testid="cancel-selection"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedId}
              data-testid="save-cause-btn"
            >
              {selectedId ? 'Save selection' : 'Select a nonprofit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
