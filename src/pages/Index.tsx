import { RiverGaugeMap } from '@/components/RiverGaugeMap';

const Index = () => {
  const apiKey = 'AIzaSyBZ1G7H8X9QXxG3yY6aKn2zxUOy3mE0qL4'; // Your Google Maps API key

  return (
    <div className="min-h-screen bg-background">
      <RiverGaugeMap apiKey={apiKey} />
    </div>
  );
};

export default Index;
