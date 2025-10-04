import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useToast } from "@/hooks/use-toast";
import { Check, BookOpen, TrendingUp, Target } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface IntroEffectOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type Screen = 'welcome' | 'platform' | 'learning' | 'completion';

export function IntroEffectOverlay({ isOpen, onClose }: IntroEffectOverlayProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const { portfolio, updatePortfolio } = usePortfolio();
  const { toast } = useToast();

  const handleComplete = async () => {
    if (!portfolio) return;

    const completedEffects = portfolio.completedEffects || [];
    if (!completedEffects.includes('intro')) {
      await updatePortfolio({
        completedEffects: [...completedEffects, 'intro'],
        effectsCompleted: portfolio.effectsCompleted + 1
      });
    }

    toast({
      title: "Welcome complete!",
      description: "You're ready to start learning.",
      duration: 3000
    });

    setCurrentScreen('welcome');
    onClose();
  };

  const handleClose = () => {
    setCurrentScreen('welcome');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <VisuallyHidden>
          <DialogTitle>Crypto Education Introduction</DialogTitle>
          <DialogDescription>
            Learn about the crypto education platform and how to use it to master cryptocurrency concepts while supporting nonprofits
          </DialogDescription>
        </VisuallyHidden>
        <div className="p-6 sm:p-8">
          {/* Welcome Screen */}
          {currentScreen === 'welcome' && (
            <div className="text-center space-y-6" data-testid="intro-welcome-screen">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Your Crypto Education</h2>
                <p className="text-lg text-muted-foreground">
                  Learn crypto and DeFi through real transactions
                </p>
              </div>
              <Card className="text-left">
                <CardContent className="p-6">
                  <p className="text-foreground mb-4">
                    <strong>This is a hands-on learning platform.</strong> You'll be working with real money, 
                    real DeFi protocols, and real transactions—all while learning cryptocurrency fundamentals 
                    in a controlled environment.
                  </p>
                  <p className="text-muted-foreground">
                    Your financial advisor has provided you with capital to learn about decentralized finance 
                    through guided lessons. You'll master crypto processes while generating returns for nonprofits 
                    you care about.
                  </p>
                </CardContent>
              </Card>
              <Button onClick={() => setCurrentScreen('platform')} size="lg" data-testid="intro-next-1">
                Continue
              </Button>
            </div>
          )}

          {/* Platform Overview Screen */}
          {currentScreen === 'platform' && (
            <div className="space-y-6" data-testid="intro-platform-screen">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">How This Platform Works</h2>
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                      Organized in Lessons
                    </h3>
                    <p className="text-muted-foreground">
                      Each "Journey" is a complete lesson teaching one DeFi concept. You'll work through them 
                      step-by-step, building your knowledge progressively.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                      Limited Exposure
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      You start with $1,000 in capital. Your exposure is limited to this initial amount, 
                      creating a clear boundary for your learning experience.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                      <p><strong>Worst case:</strong> You could lose the full $1,000 and report a capital loss</p>
                      <p><strong>Middle ground:</strong> Break even with a $1,000 donation to charity</p>
                      <p><strong>Best case:</strong> Generate returns and donate more than your initial $1,000</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                      Real DeFi Products
                    </h3>
                    <p className="text-muted-foreground">
                      You'll use actual DeFi protocols from leading companies like Blocklead and NexaChain. 
                      These are the same tools used by investors and institutions worldwide.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentScreen('welcome')} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setCurrentScreen('learning')} className="flex-1" data-testid="intro-next-2">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Learning Journey Screen */}
          {currentScreen === 'learning' && (
            <div className="space-y-6" data-testid="intro-learning-screen">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Your Learning Journey</h2>
              </div>

              <Card>
                <CardContent className="p-6">
                  <p className="text-foreground mb-4">
                    <strong>The goal is twofold:</strong> Master cryptocurrency processes and see what returns 
                    you can generate for your chosen nonprofit. Each Journey builds on the previous one, 
                    teaching you increasingly sophisticated DeFi strategies.
                  </p>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p>Start with basics like buying tokens and understanding fees</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p>Progress to collateralized lending and borrowing</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p>Generate returns while learning to use DeFi for real-world impact</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <p className="text-foreground font-medium mb-2">Ready to Begin?</p>
                  <p className="text-sm text-muted-foreground">
                    After this introduction, you'll select a nonprofit to support, then start working through 
                    the Journeys. You'll learn valuable crypto skills while working toward making a meaningful donation.
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentScreen('platform')} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setCurrentScreen('completion')} className="flex-1" data-testid="intro-next-3">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Completion Screen */}
          {currentScreen === 'completion' && (
            <div className="text-center space-y-6" data-testid="intro-completion-screen">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-success-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">You're All Set!</h2>
                <p className="text-lg text-muted-foreground">
                  Ready to start your DeFi learning journey
                </p>
              </div>
              <Card>
                <CardContent className="p-6">
                  <p className="text-foreground mb-3">
                    <strong>Next steps:</strong>
                  </p>
                  <ol className="text-left text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Choose a nonprofit organization to support</li>
                    <li>Start with the beginner Journey to learn the basics</li>
                    <li>Progress through each lesson at your own pace</li>
                    <li>Make a real impact while learning valuable skills</li>
                  </ol>
                </CardContent>
              </Card>
              <Button onClick={handleComplete} size="lg" data-testid="intro-complete">
                Get Started
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
