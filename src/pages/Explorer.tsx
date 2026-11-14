import React from 'react';
import { NasaTrack } from '../types/earthsound';
import { EarthMap } from '../components/EarthMap';

interface ExplorerProps {
  tracks: NasaTrack[];
  selectedTrack: NasaTrack;
  onSelectTrack: (track: NasaTrack) => void;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  coordinates: { lat: number; lon: number; zoom: number };
  onChangeCoordinates: (coords: { lat: number; lon: number; zoom: number }) => void;
  onSendToStudio: () => void;
}

export const Explorer: React.FC<ExplorerProps> = (props) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          01. Explore Earth Observation Map
        </h1>
        <p className="text-sm text-slate-400">
          Select global coordinates, observation date, and open NASA GIBS / SVS datasets to prepare a region for sonification.
        </p>
      </div>

      <EarthMap {...props} />
    </div>
  );
};
