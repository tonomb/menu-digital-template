import React, { createContext, useState, ReactNode, useContext } from 'react';

interface MenuContextType {
  selectedVideoId: string | null;
  setSelectedVideoId: (id: string | null) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (isOpen: boolean) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

interface MenuProviderProps {
  children: ReactNode;
}

export function MenuProvider({ children }: MenuProviderProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <MenuContext.Provider
      value={{ selectedVideoId, setSelectedVideoId, isDrawerOpen, setIsDrawerOpen }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenuContext(): MenuContextType {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }
  return context;
}
