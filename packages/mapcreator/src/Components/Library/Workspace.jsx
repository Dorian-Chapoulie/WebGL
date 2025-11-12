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

const Models = [
  { type: 'Cube', modelPath: '/models/Cube.gltf' },
  { type: 'Scene', modelPath: '/models/Gltf/scene.gltf' },
  { type: 'Untitled', modelPath: '/models/Untitled.gltf' },
  { type: 'Lion', modelPath: '/models/test/low_poly_lion.gltf' },
  { type: 'Women', modelPath: '/models/women/Untitled.gltf' },
  { type: 'Cube', modelPath: '/models/Cube.gltf' },
  { type: 'Scene', modelPath: '/models/Gltf/scene.gltf' },
  { type: 'Untitled', modelPath: '/models/Untitled.gltf' },
  { type: 'Lion', modelPath: '/models/test/low_poly_lion.gltf' },
  { type: 'Women', modelPath: '/models/women/Untitled.gltf' },
  { type: 'Cube', modelPath: '/models/Cube.gltf' },
  { type: 'Scene', modelPath: '/models/Gltf/scene.gltf' },
  { type: 'Untitled', modelPath: '/models/Untitled.gltf' },
  { type: 'Lion', modelPath: '/models/test/low_poly_lion.gltf' },
  { type: 'Women', modelPath: '/models/women/Untitled.gltf' },
  { type: 'Cube', modelPath: '/models/Cube.gltf' },
  { type: 'Scene', modelPath: '/models/Gltf/scene.gltf' },
  { type: 'Untitled', modelPath: '/models/Untitled.gltf' },
  { type: 'Lion', modelPath: '/models/test/low_poly_lion.gltf' },
  { type: 'Women', modelPath: '/models/women/Untitled.gltf' },
  { type: 'Cube', modelPath: '/models/Cube.gltf' },
  { type: 'Scene', modelPath: '/models/Gltf/scene.gltf' },
  { type: 'Untitled', modelPath: '/models/Untitled.gltf' },
  { type: 'Lion', modelPath: '/models/test/low_poly_lion.gltf' },
  { type: 'Women', modelPath: '/models/women/Untitled.gltf' },
];

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

const WorkspaceModels = ({ models }) => {
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
  const { setSelectedEntity, setSelectedEntityOptions } = useEntitySelector();

  const sceneHierarchy = useMemo(() => {
    console.debug('Engine state in useMemo:', engine?.scene);
    if (!engine) return { lights: [], models: [] };
    const lights = engine.scene.lights;
    const models = engine.scene.models;
    return { lights, models };
  }, [engine]);

  const handleClickItem = (entity) => {
    setSelectedEntity(entity);

    const newOptions = {};
    Object.keys(entity.getParams()).map((key) => {
      const value = entity[key];
      newOptions[key] = value;
    });
    setSelectedEntityOptions(newOptions);
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
          <WorkspaceModels models={Models} />
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
