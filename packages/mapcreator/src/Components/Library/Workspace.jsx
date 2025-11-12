import { useEffect, useMemo, useState } from 'react'
import {
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane, 
  Card,
  CardTitle,
} from 'reactstrap';
import { LIGHT_TYPES } from '../../../../../lib/Engine/Light/Light';
import { useEntitySelector } from '../EntitySelectorProvider/EntitySelectorProvider';


import './Workspace.scss';

const Lights = [
  //{ type: LIGHT_TYPES.DIRECTIONAL, desc: 'Directional Light' },
  { type: LIGHT_TYPES.POINT_LIGHT, desc: 'Point Light' },
  { type: LIGHT_TYPES.SPOT_LIGHT, desc: 'Spot Light' },
];

const WORKSPACE_TAB = {
  MODELS: 'Models',
  LIGHTS: 'Lights',
  HIERARCHY: 'Hierarchy',
}

const WorkspaceModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/models-list.json')
      .then(response => response.json())
      .then(data => {
        setModels(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des modèles:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className='p-3'>Chargement des modèles...</div>;
  }

  return (
    <div className='Workspace_models-grid'>
      {models.map((model, index) => (
        <Card key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {model.type}📦
          </CardTitle>
          {model.modelPath.split('/').pop()}
        </Card>
      ))}
    </div>
  )
}

const WorkspaceLights = ({ lights }) => {
  return (
    <div className='Workspace_models-grid'>
      {lights.map((light, index) => (
        <Card key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {light.type}
          </CardTitle>
          💡
        </Card>
      ))}
    </div>
  )
}

const WorkspaceHierarchy = ({ engine }) => {
  const { setSelectedEntity } = useEntitySelector();
  const [deleteEntity, setDeleteEntity] = useState(null);

  const sceneHierarchy = useMemo(() => {
    if (!engine) return { lights: [], models: [] };
    const lights = engine.scene.lights;
    const models = engine.scene.models;
    return { lights, models };
  }, [engine, deleteEntity]);

  const handleClickItem = (entity) => {
    //setSelectedEntity(entity);

    const newOptions = {};
    Object.keys(entity.getParams()).map((key) => {
      const value = entity[key];
      newOptions[key] = value;
    });
    //setSelectedEntityOptions(newOptions);

    engine.scene.deleteEntity(entity.id); // For testing purpose
    setDeleteEntity(entity.id);
  }
  
  return (
    <div className='Workspace_models-grid'>
      {sceneHierarchy.lights.map((light, index) => (
        <Card onClick={() => handleClickItem(light)} key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {light.type}
          </CardTitle>
          💡
        </Card>
      ))}
      {sceneHierarchy.models.map((model, index) => (
        <Card onClick={() => handleClickItem(model)} key={index} className='Workspace_model-item p-2 jutify-content-center align-items-center'>
          <CardTitle>
            {model.type}📦
          </CardTitle>
          {model.modelPath.split('/').pop()}
        </Card>
      ))}
    </div>
  )
}

export const Workspace = ({ engine }) => {
  const [category, setCategory] = useState(WORKSPACE_TAB.MODELS);
  return (    
    <div className="Workspace">
      <Nav tabs className='border-0'>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.MODELS} onClick={() => setCategory(WORKSPACE_TAB.MODELS)}>
            Models
          </NavLink>  
        </NavItem>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.LIGHTS} onClick={() => setCategory(WORKSPACE_TAB.LIGHTS)}>
            Lights
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" active={category === WORKSPACE_TAB.HIERARCHY} onClick={() => setCategory(WORKSPACE_TAB.HIERARCHY)}>
            Hierarchy
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={category} className='overflow-auto'>
        <TabPane tabId={WORKSPACE_TAB.MODELS}>
          <WorkspaceModels />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.LIGHTS}>
          <WorkspaceLights lights={Lights} />
        </TabPane>
        <TabPane tabId={WORKSPACE_TAB.HIERARCHY}>
          <WorkspaceHierarchy engine={engine} />
        </TabPane>
      </TabContent>
    </div>
  )
}
