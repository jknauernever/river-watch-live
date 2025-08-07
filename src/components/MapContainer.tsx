interface MapContainerProps {
  id?: string;
  className?: string;
}

export const MapContainer = ({ id = 'map-container', className = 'w-full h-full' }: MapContainerProps) => {
  console.log('MapContainer rendering with id:', id);
  return <div id={id} className={className} />;
};