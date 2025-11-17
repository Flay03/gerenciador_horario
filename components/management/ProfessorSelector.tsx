
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Professor } from '../../types';

interface ProfessorSelectorProps {
  allProfessors: Professor[];
  selectedProfessorIds: string[];
  onSelectionChange: (newProfessorIds: string[]) => void;
  maxSelection?: number;
}

const ProfessorSelector: React.FC<ProfessorSelectorProps> = ({
  allProfessors,
  selectedProfessorIds,
  onSelectionChange,
  maxSelection = 1,
}) => {
  const [searchText, setSearchText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedProfessors = useMemo(() => {
    return selectedProfessorIds.map(id => allProfessors.find(p => p.id === id)).filter((p): p is Professor => !!p);
  }, [selectedProfessorIds, allProfessors]);

  const filteredProfessors = useMemo(() => {
    const searchLower = searchText.toLowerCase();
    return allProfessors.filter(p => p.nome.toLowerCase().includes(searchLower));
  }, [searchText, allProfessors]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);
  
  const handleAddProfessor = (profId: string) => {
    if (selectedProfessorIds.length < maxSelection) {
      onSelectionChange([...selectedProfessorIds, profId]);
      setSearchText('');
      setIsDropdownOpen(false);
    }
  };

  const handleRemoveProfessor = (indexToRemove: number) => {
    onSelectionChange(selectedProfessorIds.filter((_, index) => index !== indexToRemove));
  };
  
  const canAddMore = selectedProfessorIds.length < maxSelection;

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md bg-white min-h-[42px]">
        {selectedProfessors.map((prof, index) => (
          <div key={`${prof.id}-${index}`} className="flex items-center bg-indigo-100 text-indigo-800 text-sm font-medium px-2 py-1 rounded-full">
            <span>{prof.nome}</span>
            <button
              type="button"
              onClick={() => handleRemoveProfessor(index)}
              className="ml-2 text-indigo-500 hover:text-indigo-700 focus:outline-none"
              aria-label={`Remover ${prof.nome}`}
            >
              &times;
            </button>
          </div>
        ))}
        {canAddMore && (
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Adicionar professor..."
            className="flex-grow p-1 bg-transparent focus:outline-none"
          />
        )}
      </div>
      {isDropdownOpen && canAddMore && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredProfessors.length > 0 ? (
            filteredProfessors.map(prof => (
              <li
                key={prof.id}
                onClick={() => handleAddProfessor(prof.id)}
                className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                {prof.nome}
              </li>
            ))
           ) : (
            <li className="px-4 py-2 text-sm text-gray-500 cursor-default">Nenhum professor encontrado.</li>
           )
          }
        </ul>
      )}
    </div>
  );
};

export default ProfessorSelector;