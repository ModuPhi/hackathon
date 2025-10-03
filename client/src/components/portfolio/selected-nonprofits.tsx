import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin, Heart } from "lucide-react";
import { usePortfolio } from "@/hooks/use-portfolio";

export function SelectedNonprofits() {
  const { portfolio, nonprofits } = usePortfolio();

  const selectedNonprofit = nonprofits.find(np => np.id === portfolio?.selectedNonprofit);

  if (!selectedNonprofit) {
    return (
      <Card className="border-dashed" data-testid="no-nonprofit-selected">
        <CardContent className="p-8 text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Choose a nonprofit to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" data-testid={`selected-nonprofit-${selectedNonprofit.id}`}>
      <div className="relative h-48 bg-muted">
        <img
          src={selectedNonprofit.imageUrl}
          alt={selectedNonprofit.name}
          className="w-full h-full object-cover"
        />
        {selectedNonprofit.verified === 1 && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-white/90 text-xs">
              <CheckCircle className="w-3 h-3 mr-1 text-primary" />
              Verified
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-5">
        <h3 className="text-lg font-bold text-foreground mb-2">
          {selectedNonprofit.name}
        </h3>
        
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          {selectedNonprofit.location}
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          {selectedNonprofit.description}
        </p>
        
        <Badge variant="outline" className="text-xs">
          {selectedNonprofit.category}
        </Badge>
      </CardContent>
    </Card>
  );
}
