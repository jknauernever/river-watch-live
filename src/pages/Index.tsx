import { RiverGaugeMap } from "@/components/RiverGaugeMap";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <RiverGaugeMap apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} />
      </div>
    </div>
  );
};

export default Index;
