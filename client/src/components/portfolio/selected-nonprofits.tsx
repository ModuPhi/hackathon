import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin } from "lucide-react";
import { usePortfolio } from "@/hooks/use-portfolio";

export function SelectedNonprofits() {
  const { portfolio, nonprofits } = usePortfolio();

  const selectedNonprofits = nonprofits.filter(np => 
    portfolio?.selectedNonprofits?.includes(np.id)
  );

  if (selectedNonprofits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Your Selected Nonprofits</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedNonprofits.map((nonprofit) => (
          <Card key={nonprofit.id} className="overflow-hidden" data-testid={`selected-nonprofit-${nonprofit.id}`}>
            <div className="relative h-32 bg-muted">
              <img
                src={nonprofit.imageUrl}
                alt={nonprofit.name}
                className="w-full h-full object-cover"
              />
              {nonprofit.verified === 1 && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-white/90 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1 text-primary" />
                    Verified
                  </Badge>
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                {nonprofit.name}
              </h3>
              
              <div className="flex items-center text-xs text-muted-foreground mb-2">
                <MapPin className="w-3 h-3 mr-1" />
                {nonprofit.location}
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {nonprofit.description}
              </p>
              
              <Badge variant="outline" className="text-xs">
                {nonprofit.category}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
