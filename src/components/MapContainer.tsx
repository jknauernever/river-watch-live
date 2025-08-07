interface MapContainerProps {
  id?: string;
  className?: string;
}

export const MapContainer = ({ id = 'map-container', className = 'w-full h-full' }: MapContainerProps) => {
  return <div id={id} className={className} />;
};