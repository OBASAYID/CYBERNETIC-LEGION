import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import rootsLogo from "@/assets/images/roots-logo.png";

export default function Letterhead() {
  return (
    <div className="min-h-screen bg-slate-100 p-8 flex justify-center items-start overflow-y-auto">
      <Card className="w-full max-w-[800px] min-h-[1100px] bg-white shadow-2xl p-16 flex flex-col relative animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <header className="flex flex-col items-center gap-6 mb-12">
          <div className="relative w-48 h-48">
             <img 
               src={rootsLogo} 
               alt="Roots Collectors Logo" 
               className="w-full h-full object-contain drop-shadow-sm"
             />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-wide text-primary uppercase">Roots Collectors</h1>
            <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase font-sans">Professional Debt Recovery Services</p>
          </div>
          
          <div className="w-full flex items-center gap-4 mt-4">
             <Separator className="flex-1 bg-primary/20" />
             <div className="w-2 h-2 rounded-full bg-secondary" />
             <Separator className="flex-1 bg-primary/20" />
          </div>
        </header>

        {/* Content Body Placeholder */}
        <main className="flex-1 font-serif text-lg leading-relaxed text-slate-800 space-y-6">
          <div className="space-y-1 text-base font-sans text-muted-foreground mb-12">
            <p>Date: January 25, 2026</p>
            <p>Ref: RC-2026-001</p>
          </div>

          <p>Dear [Recipient Name],</p>
          
          <p>
            This is a placeholder for your official correspondence. The letterhead design emphasizes authority and professionalism, utilizing the requested imagery of the eagle extracting roots to symbolize thorough and persistent debt recovery efforts.
          </p>
          
          <p>
            The typography uses Playfair Display for headings to convey tradition and trust, paired with Inter for clear legibility in the body text. The color palette of Navy Blue and Gold/Bronze establishes a corporate yet commanding presence.
          </p>
          
          <p>
             Roots Collectors is dedicated to resolving outstanding accounts with dignity and determination. We dig deep to find the solution.
          </p>

          <div className="mt-16">
            <p>Sincerely,</p>
            <div className="h-16 mt-4 mb-2 font-handwriting text-2xl text-primary opacity-60 italic">
               [Signature]
            </div>
            <p className="font-bold text-primary">John Doe</p>
            <p className="text-sm text-muted-foreground font-sans">Chief Operations Officer</p>
          </div>
        </main>

        {/* Footer Section */}
        <footer className="mt-16 pt-8 border-t border-primary/10 text-center text-sm font-sans text-muted-foreground space-y-2">
          <div className="flex justify-center gap-6 text-primary font-medium">
            <span>123 Recovery Way, Suite 400</span>
            <span>•</span>
            <span>New York, NY 10001</span>
          </div>
          <div className="flex justify-center gap-6">
            <span>(555) 123-4567</span>
            <span>•</span>
            <span>contact@rootscollectors.com</span>
            <span>•</span>
            <span>www.rootscollectors.com</span>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Licensed & Bonded • Fair Debt Collection Practices Act Compliant
          </p>
        </footer>

        {/* Decorative Watermark (Optional) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
          <img src={rootsLogo} className="w-[500px] h-[500px] object-contain" />
        </div>
      </Card>
    </div>
  );
}
