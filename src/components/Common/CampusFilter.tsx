import React from 'react';

export type Campus = 'Dantewada' | 'Dharamshala' | 'Eternal' | 'Jashpur' | 'Kishanganj' | 'Pune' | 'Raigarh' | 'Sarjapura' | 'Bageshree' | 'Malhar' | 'Bhairav' | 'All';

interface CampusFilterProps {
  selectedCampus: Campus;
  onCampusSelect: (campus: Campus) => void;
}

export const CampusFilter: React.FC<CampusFilterProps> = ({ selectedCampus, onCampusSelect }) => {
  const campuses: Campus[] = [
    'All',
    'Dantewada',
    'Dharamshala',
    'Eternal',
    'Jashpur',
    'Kishanganj',
    'Pune',
    'Raigarh',
    'Sarjapura',
    'Bageshree',
    'Malhar',
    'Bhairav'
  ];

  return (
    <div className="mr-4">
      <select
        className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={selectedCampus}
        onChange={(e) => onCampusSelect(e.target.value as Campus)}
      >
        {campuses.map((campus) => (
          <option key={campus} value={campus}>
            {campus === 'All' ? 'All Campuses' : campus}
          </option>
        ))}
      </select>
    </div>
  );
};