import { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const EntitySelectorContext = createContext();

export const EntitySelectorProvider = ({ children }) => {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedEntityOptions, setSelectedEntityOptions] = useState(undefined);

  return (
    <EntitySelectorContext.Provider value={{ selectedEntity, setSelectedEntity, selectedEntityOptions, setSelectedEntityOptions }}>
      {children}
    </EntitySelectorContext.Provider>
  );
};

EntitySelectorProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useEntitySelector = () => {
  const context = useContext(EntitySelectorContext);
  if (context === undefined) {
    throw new Error('useEntitySelector must be used within an EntitySelectorProvider');
  }
  return context;
};
